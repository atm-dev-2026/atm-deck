import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { POST as createTaskRoute } from "@/app/api/tasks/route";
import { PATCH as patchTaskRoute } from "@/app/api/tasks/[taskId]/route";
import { GET as getUnread } from "@/app/api/notifications/route";
import { POST as markNotificationsRead } from "@/app/api/notifications/read/route";
import { POST as markChannelRead } from "@/app/api/channels/[channelId]/read/route";
import { prisma } from "@/lib/prisma";
import {
  createUser,
  createBoard,
  createColumn,
  createTask,
  createChannel,
  createMessage,
  inviteToBoard,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

type Summary = {
  channels: Record<string, number>;
  tasks: { notificationId: string; taskId: string; taskTitle: string; boardName: string; actorName: string | null }[];
  asOf: string;
};

async function unreadFor(userId: string): Promise<Summary> {
  mockSessionAs(userId);
  const res = await callRoute(getUnread);
  expect(res.status).toBe(200);
  return res.json();
}

describe("task assignment notifications", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let assignee: Awaited<ReturnType<typeof createUser>>;
  let columnId: string;

  beforeEach(async () => {
    owner = await createUser({ name: "Owner" });
    assignee = await createUser({ name: "Assignee" });
    const board = await createBoard(owner.id, { name: "Launch board" });
    await inviteToBoard(board.id, assignee.id, "CAN_EDIT");
    columnId = (await createColumn(board.id)).id;
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it("notifies the assignee when a task is created for them", async () => {
    mockSessionAs(owner.id);
    const res = await callRoute(createTaskRoute, {
      method: "POST",
      body: { columnId, title: "Write launch notes", assigneeId: assignee.id },
    });
    expect(res.status).toBe(201);
    const task = await res.json();

    const summary = await unreadFor(assignee.id);
    expect(summary.tasks).toHaveLength(1);
    expect(summary.tasks[0]).toMatchObject({
      taskId: task.id,
      taskTitle: "Write launch notes",
      boardName: "Launch board",
      actorName: "Owner",
    });
  });

  it("doesn't notify you about a task you assign to yourself", async () => {
    mockSessionAs(owner.id);
    await callRoute(createTaskRoute, {
      method: "POST",
      body: { columnId, title: "Mine", assigneeId: owner.id },
    });

    expect(await prisma.notification.count({ where: { userId: owner.id } })).toBe(0);
  });

  it("notifies on reassignment, but not on other edits or re-saving the same assignee", async () => {
    const task = await createTask(columnId, { title: "Review" });
    mockSessionAs(owner.id);

    await callRoute(patchTaskRoute, { method: "PATCH", params: { taskId: task.id }, body: { title: "Review v2" } });
    expect(await prisma.notification.count({ where: { taskId: task.id } })).toBe(0);

    await callRoute(patchTaskRoute, { method: "PATCH", params: { taskId: task.id }, body: { assigneeId: assignee.id } });
    await callRoute(patchTaskRoute, { method: "PATCH", params: { taskId: task.id }, body: { assigneeId: assignee.id } });
    expect(await prisma.notification.count({ where: { taskId: task.id, userId: assignee.id } })).toBe(1);

    await callRoute(patchTaskRoute, { method: "PATCH", params: { taskId: task.id }, body: { assigneeId: null } });
    expect(await prisma.notification.count({ where: { taskId: task.id } })).toBe(1);
  });

  it("drops a pending notification once the task is reassigned away or deleted", async () => {
    const task = await createTask(columnId, { title: "Handoff" });
    const other = await createTask(columnId, { title: "Doomed" });
    mockSessionAs(owner.id);
    await callRoute(patchTaskRoute, { method: "PATCH", params: { taskId: task.id }, body: { assigneeId: assignee.id } });
    await callRoute(patchTaskRoute, { method: "PATCH", params: { taskId: other.id }, body: { assigneeId: assignee.id } });
    expect((await unreadFor(assignee.id)).tasks).toHaveLength(2);

    mockSessionAs(owner.id);
    await callRoute(patchTaskRoute, { method: "PATCH", params: { taskId: task.id }, body: { assigneeId: owner.id } });
    await prisma.task.update({ where: { id: other.id }, data: { deletedAt: new Date() } });

    expect((await unreadFor(assignee.id)).tasks).toHaveLength(0);
  });

  it("marks one task's notifications read, or all of them", async () => {
    const a = await createTask(columnId, { title: "A" });
    const b = await createTask(columnId, { title: "B" });
    mockSessionAs(owner.id);
    await callRoute(patchTaskRoute, { method: "PATCH", params: { taskId: a.id }, body: { assigneeId: assignee.id } });
    await callRoute(patchTaskRoute, { method: "PATCH", params: { taskId: b.id }, body: { assigneeId: assignee.id } });

    mockSessionAs(assignee.id);
    await callRoute(markNotificationsRead, { method: "POST", body: { taskId: a.id } });
    expect((await unreadFor(assignee.id)).tasks.map((n) => n.taskId)).toEqual([b.id]);

    mockSessionAs(assignee.id);
    await callRoute(markNotificationsRead, { method: "POST" });
    expect((await unreadFor(assignee.id)).tasks).toHaveLength(0);
  });

  it("can't mark someone else's notifications read", async () => {
    mockSessionAs(owner.id);
    await callRoute(createTaskRoute, {
      method: "POST",
      body: { columnId, title: "Theirs", assigneeId: assignee.id },
    });

    mockSessionAs(owner.id);
    await callRoute(markNotificationsRead, { method: "POST" });
    expect((await unreadFor(assignee.id)).tasks).toHaveLength(1);
  });
});

describe("chat unread counts", () => {
  let alice: Awaited<ReturnType<typeof createUser>>;
  let bob: Awaited<ReturnType<typeof createUser>>;

  // Members' lastReadAt defaults to join time; move it back so messages created
  // right after in the test are reliably newer.
  async function channelWithHistory(...args: Parameters<typeof createChannel>) {
    const channel = await createChannel(...args);
    await prisma.channelMember.updateMany({
      where: { channelId: channel.id },
      data: { lastReadAt: new Date(Date.now() - 60_000) },
    });
    return channel;
  }

  beforeEach(async () => {
    alice = await createUser({ name: "Alice" });
    bob = await createUser({ name: "Bob" });
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it("counts others' messages (thread replies included) since you last read, per channel", async () => {
    const general = await channelWithHistory(alice.id, { memberIds: [bob.id] });
    const dm = await channelWithHistory(alice.id, { memberIds: [bob.id], isDirect: true });
    const bobOnly = await channelWithHistory(bob.id);

    const root = await createMessage(general.id, alice.id);
    await createMessage(general.id, alice.id, { parentId: root.id });
    await createMessage(general.id, bob.id); // own message — never unread
    await createMessage(dm.id, alice.id);
    await createMessage(bobOnly.id, bob.id);

    const summary = await unreadFor(bob.id);
    expect(summary.channels).toEqual({ [general.id]: 2, [dm.id]: 1 });
  });

  it("ignores messages from before you joined (lastReadAt starts at join time)", async () => {
    const general = await createChannel(alice.id);
    await createMessage(general.id, alice.id, { createdAt: new Date(Date.now() - 60_000) });
    await prisma.channelMember.create({ data: { channelId: general.id, userId: bob.id } });

    expect((await unreadFor(bob.id)).channels).toEqual({});
  });

  it("marking a channel read clears its count only", async () => {
    const one = await channelWithHistory(alice.id, { memberIds: [bob.id] });
    const two = await channelWithHistory(alice.id, { memberIds: [bob.id] });
    await createMessage(one.id, alice.id);
    await createMessage(two.id, alice.id);

    mockSessionAs(bob.id);
    const res = await callRoute(markChannelRead, { method: "POST", params: { channelId: one.id } });
    expect(res.status).toBe(200);

    expect((await unreadFor(bob.id)).channels).toEqual({ [two.id]: 1 });
  });

  it("refuses to mark read a channel you're not in", async () => {
    const aliceOnly = await createChannel(alice.id);
    mockSessionAs(bob.id);
    const res = await callRoute(markChannelRead, { method: "POST", params: { channelId: aliceOnly.id } });
    expect(res.status).toBe(403);
  });

  it("requires a role", async () => {
    const roleless = await createUser({ withRole: false });
    mockSessionAs(roleless.id);
    const res = await callRoute(getUnread);
    expect(res.status).toBe(401);
  });
});
