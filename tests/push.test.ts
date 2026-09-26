import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// push.ts reads the VAPID config at import time.
const sendNotification = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
  process.env.VAPID_PRIVATE_KEY = "test-private-key";
  process.env.VAPID_SUBJECT = "mailto:test@example.test";
  return vi.fn();
});

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification },
}));

import { POST as subscribeRoute, DELETE as unsubscribeRoute } from "@/app/api/push/subscription/route";
import { notifyChatMessage } from "@/lib/notifications";
import { sendPush } from "@/lib/push";
import { prisma } from "@/lib/prisma";
import {
  createUser,
  createChannel,
  createMessage,
  createSession,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

let endpointCounter = 0;
function endpoint() {
  endpointCounter += 1;
  return `https://push.example.test/${Date.now()}-${endpointCounter}`;
}

function subscriptionBody(url: string, locale = "en") {
  return { endpoint: url, keys: { p256dh: "p256dh-key", auth: "auth-key" }, locale };
}

function cookieFor(session: { sessionToken: string }) {
  return { cookie: `other=1; authjs.session-token=${session.sessionToken}` };
}

async function subscribe(user: { id: string }, url: string, locale = "en") {
  const session = await createSession(user.id);
  mockSessionAs(user.id);
  const res = await callRoute(subscribeRoute, {
    method: "POST",
    body: subscriptionBody(url, locale),
    headers: cookieFor(session),
  });
  expect(res.status).toBe(201);
  return session;
}

function sentEndpoints() {
  return sendNotification.mock.calls.map(([sub]) => (sub as { endpoint: string }).endpoint);
}

describe("push subscriptions", () => {
  beforeEach(() => {
    sendNotification.mockReset();
    sendNotification.mockResolvedValue({ statusCode: 201 });
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it("requires the caller's own login session cookie", async () => {
    const user = await createUser();
    const someoneElse = await createUser();
    const theirSession = await createSession(someoneElse.id);
    mockSessionAs(user.id);

    const noCookie = await callRoute(subscribeRoute, { method: "POST", body: subscriptionBody(endpoint()) });
    expect(noCookie.status).toBe(401);

    const wrongSession = await callRoute(subscribeRoute, {
      method: "POST",
      body: subscriptionBody(endpoint()),
      headers: cookieFor(theirSession),
    });
    expect(wrongSession.status).toBe(401);
  });

  it("rejects endpoints that aren't https URLs", async () => {
    const user = await createUser();
    const session = await createSession(user.id);
    mockSessionAs(user.id);
    const res = await callRoute(subscribeRoute, {
      method: "POST",
      body: subscriptionBody("http://insecure.example.test/x"),
      headers: cookieFor(session),
    });
    expect(res.status).toBe(400);
  });

  it("moves a browser's endpoint to whoever registers it last", async () => {
    const first = await createUser();
    const second = await createUser();
    const url = endpoint();

    await subscribe(first, url);
    await subscribe(second, url, "th");

    const rows = await prisma.pushSubscription.findMany({ where: { endpoint: url } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: second.id, locale: "th" });
  });

  it("is removed when its login session ends (sign-out)", async () => {
    const user = await createUser();
    const url = endpoint();
    const session = await subscribe(user, url);

    await prisma.session.delete({ where: { id: session.id } });
    expect(await prisma.pushSubscription.count({ where: { endpoint: url } })).toBe(0);
  });

  it("only lets you unsubscribe your own endpoint", async () => {
    const owner = await createUser();
    const other = await createUser();
    const url = endpoint();
    await subscribe(owner, url);

    mockSessionAs(other.id);
    await callRoute(unsubscribeRoute, { method: "DELETE", body: { endpoint: url } });
    expect(await prisma.pushSubscription.count({ where: { endpoint: url } })).toBe(1);

    mockSessionAs(owner.id);
    await callRoute(unsubscribeRoute, { method: "DELETE", body: { endpoint: url } });
    expect(await prisma.pushSubscription.count({ where: { endpoint: url } })).toBe(0);
  });
});

describe("sending pushes", () => {
  beforeEach(() => {
    sendNotification.mockReset();
    sendNotification.mockResolvedValue({ statusCode: 201 });
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it("pushes a chat message to the channel's other members, in each device's language", async () => {
    const alice = await createUser({ name: "Alice" });
    const bob = await createUser({ name: "Bob" });
    const carol = await createUser({ name: "Carol" });
    const outsider = await createUser();
    const aliceUrl = endpoint();
    const bobUrl = endpoint();
    const carolUrl = endpoint();
    const outsiderUrl = endpoint();
    await subscribe(alice, aliceUrl);
    await subscribe(bob, bobUrl, "en");
    await subscribe(carol, carolUrl, "th");
    await subscribe(outsider, outsiderUrl);

    const channel = await createChannel(alice.id, { memberIds: [bob.id, carol.id], name: "general" });
    const message = await createMessage(channel.id, alice.id, { body: "Standup in 5" });
    await notifyChatMessage(message.id);

    expect(sentEndpoints().sort()).toEqual([bobUrl, carolUrl].sort());
    const payloads = Object.fromEntries(
      sendNotification.mock.calls.map(([sub, payload]) => [
        (sub as { endpoint: string }).endpoint,
        JSON.parse(payload as string),
      ]),
    );
    expect(payloads[bobUrl]).toEqual({
      title: "#general",
      body: "Alice: Standup in 5",
      url: `/chat/${channel.id}`,
      tag: `chat-${channel.id}`,
    });
    expect(payloads[carolUrl].title).toBe("#general");
    expect(payloads[carolUrl].body).toBe("Alice: Standup in 5");
  });

  it("skips expired sessions and users without a role", async () => {
    const live = await createUser();
    const expired = await createUser();
    const roleless = await createUser();
    const liveUrl = endpoint();
    const expiredUrl = endpoint();
    const rolelessUrl = endpoint();
    await subscribe(live, liveUrl);
    const expiredSession = await subscribe(expired, expiredUrl);
    await subscribe(roleless, rolelessUrl);

    await prisma.session.update({ where: { id: expiredSession.id }, data: { expires: new Date(Date.now() - 1000) } });
    await prisma.departmentMember.deleteMany({ where: { userId: roleless.id } });

    await sendPush([live.id, expired.id, roleless.id], () => ({ title: "t", body: "b", url: "/", tag: "x" }));
    expect(sentEndpoints()).toEqual([liveUrl]);
  });

  it("deletes subscriptions the push service says are gone", async () => {
    const user = await createUser();
    const goneUrl = endpoint();
    const okUrl = endpoint();
    await subscribe(user, goneUrl);
    await subscribe(user, okUrl);
    sendNotification.mockImplementation(async (sub: { endpoint: string }) => {
      if (sub.endpoint === goneUrl) throw Object.assign(new Error("Gone"), { statusCode: 410 });
      return { statusCode: 201 };
    });

    await sendPush([user.id], () => ({ title: "t", body: "b", url: "/", tag: "x" }));

    expect(await prisma.pushSubscription.count({ where: { endpoint: goneUrl } })).toBe(0);
    expect(await prisma.pushSubscription.count({ where: { endpoint: okUrl } })).toBe(1);
  });
});
