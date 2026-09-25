import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { POST as createInvite } from "@/app/api/invites/route";
import { POST as acceptInvite } from "@/app/api/invites/accept/route";
import { hashInviteToken } from "@/lib/roles";
import {
  createUser,
  createDepartment,
  addDepartmentMember,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

describe("App invite links", () => {
  let manager: Awaited<ReturnType<typeof createUser>>;
  let role: Awaited<ReturnType<typeof createDepartment>>;

  beforeEach(async () => {
    const managerRole = await createDepartment(undefined, { canManageUsers: true });
    role = await createDepartment();
    manager = await createUser({ withRole: false });
    await addDepartmentMember(managerRole.id, manager.id);
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  async function generateToken(): Promise<string> {
    mockSessionAs(manager.id);
    const res = await callRoute(createInvite, { method: "POST", body: { departmentId: role.id } });
    expect(res.status).toBe(201);
    return (await res.json()).token;
  }

  function accept(userId: string, token: string) {
    mockSessionAs(userId);
    return callRoute(acceptInvite, { method: "POST", body: { token } });
  }

  it("a user manager generates a 10-minute invite and its creator is recorded", async () => {
    const before = Date.now();
    const token = await generateToken();

    const invite = await prisma.appInvite.findUniqueOrThrow({ where: { tokenHash: hashInviteToken(token) } });
    expect(invite.createdById).toBe(manager.id);
    expect(invite.departmentId).toBe(role.id);
    expect(invite.acceptedAt).toBeNull();
    const ttl = invite.expiresAt.getTime() - before;
    expect(ttl).toBeGreaterThan(9 * 60_000);
    expect(ttl).toBeLessThanOrEqual(10 * 60_000 + 5_000);
    // Only the hash is stored.
    expect(invite.tokenHash).not.toBe(token);
  });

  it("a user who can't manage users cannot generate invites", async () => {
    const plain = await createUser();
    mockSessionAs(plain.id);
    const res = await callRoute(createInvite, { method: "POST", body: { departmentId: role.id } });
    expect(res.status).toBe(403);
  });

  it("requires a role to be selected", async () => {
    mockSessionAs(manager.id);
    const res = await callRoute(createInvite, { method: "POST", body: {} });
    expect(res.status).toBe(400);
  });

  it("accepting gives the user the role and records who accepted and when", async () => {
    const token = await generateToken();
    const newcomer = await createUser({ withRole: false });

    const res = await accept(newcomer.id, token);
    expect(res.status).toBe(200);

    const memberships = await prisma.departmentMember.findMany({ where: { userId: newcomer.id } });
    expect(memberships.map((m) => [m.departmentId, m.role])).toEqual([[role.id, "MEMBER"]]);

    const invite = await prisma.appInvite.findUniqueOrThrow({ where: { tokenHash: hashInviteToken(token) } });
    expect(invite.acceptedById).toBe(newcomer.id);
    expect(invite.acceptedAt).toBeInstanceOf(Date);
  });

  it("a link can only be accepted once", async () => {
    const token = await generateToken();
    const first = await createUser({ withRole: false });
    const second = await createUser({ withRole: false });

    expect((await accept(first.id, token)).status).toBe(200);
    expect((await accept(second.id, token)).status).toBe(410);
    expect(await prisma.departmentMember.count({ where: { userId: second.id } })).toBe(0);
  });

  it("concurrent accepts: exactly one wins", async () => {
    const token = await generateToken();
    const a = await createUser({ withRole: false });
    const b = await createUser({ withRole: false });

    // mockSessionAs is global, so drive both through a per-call session instead.
    const { auth } = await import("@/lib/auth");
    const mocked = auth as unknown as { mockResolvedValueOnce: (v: { user: { id: string } }) => void };
    mocked.mockResolvedValueOnce({ user: { id: a.id } });
    mocked.mockResolvedValueOnce({ user: { id: b.id } });

    const statuses = (
      await Promise.all([
        callRoute(acceptInvite, { method: "POST", body: { token } }),
        callRoute(acceptInvite, { method: "POST", body: { token } }),
      ])
    ).map((r) => r.status);
    expect(statuses.sort()).toEqual([200, 410]);
  });

  it("an expired link is rejected", async () => {
    const token = await generateToken();
    await prisma.appInvite.update({
      where: { tokenHash: hashInviteToken(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const newcomer = await createUser({ withRole: false });
    expect((await accept(newcomer.id, token)).status).toBe(410);
  });

  it("an unknown token is 404", async () => {
    const newcomer = await createUser({ withRole: false });
    expect((await accept(newcomer.id, "not-a-real-token")).status).toBe(404);
  });

  it("a user who already has a role can't consume the link", async () => {
    const token = await generateToken();
    const member = await createUser();
    expect((await accept(member.id, token)).status).toBe(409);

    const invite = await prisma.appInvite.findUniqueOrThrow({ where: { tokenHash: hashInviteToken(token) } });
    expect(invite.acceptedAt).toBeNull();
  });

  it("accepting requires a session", async () => {
    const token = await generateToken();
    mockSessionAs(null);
    expect((await callRoute(acceptInvite, { method: "POST", body: { token } })).status).toBe(401);
  });
});
