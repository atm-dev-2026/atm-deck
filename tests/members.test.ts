import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { GET as listBoards } from "@/app/api/boards/route";
import { GET as listChannels } from "@/app/api/channels/route";
import { PATCH as setMemberRole, DELETE as removeMemberRole } from "@/app/api/members/[userId]/route";
import { POST as createDepartment } from "@/app/api/departments/route";
import {
  createUser,
  createDepartment as createDepartmentFixture,
  addDepartmentMember,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

describe("App-level roles and /api/members", () => {
  let manager: Awaited<ReturnType<typeof createUser>>;
  let plainMember: Awaited<ReturnType<typeof createUser>>;
  let target: Awaited<ReturnType<typeof createUser>>;
  let managerRole: Awaited<ReturnType<typeof createDepartmentFixture>>;
  let otherRole: Awaited<ReturnType<typeof createDepartmentFixture>>;

  beforeEach(async () => {
    managerRole = await createDepartmentFixture(undefined, { canManageUsers: true });
    otherRole = await createDepartmentFixture();
    manager = await createUser({ withRole: false });
    await addDepartmentMember(managerRole.id, manager.id);
    plainMember = await createUser();
    target = await createUser();
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  const membershipsOf = (userId: string) =>
    prisma.departmentMember.findMany({ where: { userId }, select: { departmentId: true, role: true } });

  it("a role-less user is locked out of the API", async () => {
    const roleless = await createUser({ withRole: false });
    mockSessionAs(roleless.id);
    expect((await callRoute(listBoards)).status).toBe(401);
    expect((await callRoute(listChannels)).status).toBe(401);
  });

  it("a god mode flag without a role still leaves the user locked out", async () => {
    const roleless = await createUser({ withRole: false });
    await prisma.user.update({ where: { id: roleless.id }, data: { godMode: true } });
    mockSessionAs(roleless.id);
    expect((await callRoute(listBoards)).status).toBe(401);
  });

  it("a user manager replaces a user's role with exactly one new role", async () => {
    await addDepartmentMember(otherRole.id, target.id); // target now has two memberships
    mockSessionAs(manager.id);
    const res = await callRoute(setMemberRole, {
      method: "PATCH",
      params: { userId: target.id },
      body: { departmentId: otherRole.id, departmentRole: "MANAGER" },
    });
    expect(res.status).toBe(200);
    expect(await membershipsOf(target.id)).toEqual([{ departmentId: otherRole.id, role: "MANAGER" }]);
  });

  it("a user manager assigns a role to a role-less user, unlocking the app", async () => {
    const roleless = await createUser({ withRole: false });
    mockSessionAs(manager.id);
    const res = await callRoute(setMemberRole, {
      method: "PATCH",
      params: { userId: roleless.id },
      body: { departmentId: otherRole.id },
    });
    expect(res.status).toBe(200);

    mockSessionAs(roleless.id);
    expect((await callRoute(listBoards)).status).toBe(200);
  });

  it("removing a user's role locks them out", async () => {
    mockSessionAs(manager.id);
    const res = await callRoute(removeMemberRole, { method: "DELETE", params: { userId: target.id } });
    expect(res.status).toBe(200);
    expect(await membershipsOf(target.id)).toEqual([]);

    mockSessionAs(target.id);
    expect((await callRoute(listBoards)).status).toBe(401);
  });

  it("a user whose role can't manage users gets 403", async () => {
    mockSessionAs(plainMember.id);
    const patch = await callRoute(setMemberRole, {
      method: "PATCH",
      params: { userId: target.id },
      body: { departmentId: otherRole.id },
    });
    expect(patch.status).toBe(403);
    const del = await callRoute(removeMemberRole, { method: "DELETE", params: { userId: target.id } });
    expect(del.status).toBe(403);
  });

  // Only the user can flip their own god mode switch: a manager's role change
  // neutralizes it (the new role doesn't allow it) but never touches or logs it.
  it("moving someone in god mode to a role without it stops god mode taking effect, without flipping their switch", async () => {
    const godUser = await createUser({ godMode: true });
    const godManager = await createUser({ godMode: true });
    mockSessionAs(godManager.id);
    const res = await callRoute(setMemberRole, {
      method: "PATCH",
      params: { userId: godUser.id },
      body: { departmentId: otherRole.id },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).godMode).toBe(false);

    const { godMode } = await prisma.user.findUniqueOrThrow({ where: { id: godUser.id } });
    expect(godMode).toBe(true);
    expect(await prisma.godModeLog.count({ where: { userId: godUser.id } })).toBe(0);
  });

  it("removing access locks someone in god mode out without flipping their switch", async () => {
    const godUser = await createUser({ godMode: true });
    const godManager = await createUser({ godMode: true });
    mockSessionAs(godManager.id);
    const res = await callRoute(removeMemberRole, { method: "DELETE", params: { userId: godUser.id } });
    expect(res.status).toBe(200);

    const { godMode } = await prisma.user.findUniqueOrThrow({ where: { id: godUser.id } });
    expect(godMode).toBe(true);
    expect(await prisma.godModeLog.count({ where: { userId: godUser.id } })).toBe(0);
    mockSessionAs(godUser.id);
    expect((await callRoute(listBoards)).status).toBe(401);
  });

  it("a user manager cannot change their own role", async () => {
    mockSessionAs(manager.id);
    const res = await callRoute(setMemberRole, {
      method: "PATCH",
      params: { userId: manager.id },
      body: { departmentId: otherRole.id },
    });
    expect(res.status).toBe(400);
  });

  it("a user manager not in god mode cannot touch someone who is", async () => {
    const godUser = await createUser({ godMode: true });
    mockSessionAs(manager.id);
    const res = await callRoute(removeMemberRole, { method: "DELETE", params: { userId: godUser.id } });
    expect(res.status).toBe(403);
  });

  it("rejects an unknown department and an invalid department role", async () => {
    mockSessionAs(manager.id);
    const unknown = await callRoute(setMemberRole, {
      method: "PATCH",
      params: { userId: target.id },
      body: { departmentId: "nonexistent-id" },
    });
    expect(unknown.status).toBe(404);
    const invalid = await callRoute(setMemberRole, {
      method: "PATCH",
      params: { userId: target.id },
      body: { departmentId: otherRole.id, departmentRole: "OWNER" },
    });
    expect(invalid.status).toBe(400);
  });

  it("only user managers can create roles", async () => {
    mockSessionAs(plainMember.id);
    const denied = await callRoute(createDepartment, { method: "POST", body: { name: "Nope" } });
    expect(denied.status).toBe(403);

    mockSessionAs(manager.id);
    const res = await callRoute(createDepartment, { method: "POST", body: { name: "RBAC Test Created Role" } });
    expect(res.status).toBe(201);
    const { id } = await res.json();
    await prisma.department.delete({ where: { id } });
  });
});
