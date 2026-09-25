import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { GET as getBoard } from "@/app/api/boards/[boardId]/route";
import { POST as postInvite } from "@/app/api/boards/[boardId]/invite/route";
import { PATCH as patchMember, DELETE as deleteMember } from "@/app/api/boards/[boardId]/members/[userId]/route";
import { prisma } from "@/lib/prisma";
import {
  createUser,
  createBoard,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

describe("Activity log — board members", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let target: Awaited<ReturnType<typeof createUser>>;
  let board: Awaited<ReturnType<typeof createBoard>>;

  beforeEach(async () => {
    owner = await createUser({ name: "Owner" });
    target = await createUser({ name: "Target" });
    board = await createBoard(owner.id);
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  const memberLogs = () =>
    prisma.activityLog.findMany({
      where: { entityType: "BOARD_MEMBER", entityId: target.id },
      orderBy: { createdAt: "asc" },
    });

  it("logs INVITED on the first invite", async () => {
    mockSessionAs(owner.id);
    await callRoute(postInvite, {
      method: "POST",
      params: { boardId: board.id },
      body: { userId: target.id, role: "READ_ONLY" },
    });

    const logs = await memberLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("INVITED");
  });

  it("a same-role re-invite logs nothing new", async () => {
    mockSessionAs(owner.id);
    await callRoute(postInvite, {
      method: "POST",
      params: { boardId: board.id },
      body: { userId: target.id, role: "READ_ONLY" },
    });
    await callRoute(postInvite, {
      method: "POST",
      params: { boardId: board.id },
      body: { userId: target.id, role: "READ_ONLY" },
    });

    const logs = await memberLogs();
    expect(logs).toHaveLength(1);
  });

  it("a different-role re-invite logs ROLE_CHANGED", async () => {
    mockSessionAs(owner.id);
    await callRoute(postInvite, {
      method: "POST",
      params: { boardId: board.id },
      body: { userId: target.id, role: "READ_ONLY" },
    });
    await callRoute(postInvite, {
      method: "POST",
      params: { boardId: board.id },
      body: { userId: target.id, role: "CAN_EDIT" },
    });

    const logs = await memberLogs();
    expect(logs).toHaveLength(2);
    expect(logs[1].action).toBe("ROLE_CHANGED");
  });

  it("explicit PATCH role change logs ROLE_CHANGED", async () => {
    mockSessionAs(owner.id);
    await callRoute(postInvite, {
      method: "POST",
      params: { boardId: board.id },
      body: { userId: target.id, role: "READ_ONLY" },
    });
    const res = await callRoute(patchMember, {
      method: "PATCH",
      params: { boardId: board.id, userId: target.id },
      body: { role: "CAN_EDIT" },
    });
    expect(res.status).toBe(200);

    const logs = await memberLogs();
    expect(logs[logs.length - 1].action).toBe("ROLE_CHANGED");
  });

  it("DELETE logs REMOVED, and removing then re-inviting revives the single row and logs INVITED again", async () => {
    mockSessionAs(owner.id);
    await callRoute(postInvite, {
      method: "POST",
      params: { boardId: board.id },
      body: { userId: target.id, role: "READ_ONLY" },
    });

    const removeRes = await callRoute(deleteMember, {
      method: "DELETE",
      params: { boardId: board.id, userId: target.id },
    });
    expect(removeRes.status).toBe(200);

    let logs = await memberLogs();
    expect(logs[logs.length - 1].action).toBe("REMOVED");

    mockSessionAs(target.id);
    const deniedRes = await callRoute(getBoard, { params: { boardId: board.id } });
    expect(deniedRes.status).toBe(403);

    mockSessionAs(owner.id);
    const reinviteRes = await callRoute(postInvite, {
      method: "POST",
      params: { boardId: board.id },
      body: { userId: target.id, role: "READ_ONLY" },
    });
    expect(reinviteRes.status).toBe(201);

    logs = await memberLogs();
    expect(logs[logs.length - 1].action).toBe("INVITED");

    const rows = await prisma.boardMember.findMany({ where: { boardId: board.id, userId: target.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).toBeNull();

    mockSessionAs(target.id);
    const regainedRes = await callRoute(getBoard, { params: { boardId: board.id } });
    expect(regainedRes.status).toBe(200);
  });
});
