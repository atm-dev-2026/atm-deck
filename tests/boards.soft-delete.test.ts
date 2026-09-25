import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { GET as getBoard, DELETE as deleteBoard } from "@/app/api/boards/[boardId]/route";
import { GET as listBoards } from "@/app/api/boards/route";
import { GET as getMyTasks } from "@/app/api/tasks/mine/route";
import { DELETE as deleteMember } from "@/app/api/boards/[boardId]/members/[userId]/route";
import { prisma } from "@/lib/prisma";
import {
  createUser,
  createBoard,
  createColumn,
  createTask,
  createLabel,
  inviteToBoard,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

describe("Soft delete — read-path exclusion", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let admin: Awaited<ReturnType<typeof createUser>>;
  let board: Awaited<ReturnType<typeof createBoard>>;
  let column: Awaited<ReturnType<typeof createColumn>>;

  beforeEach(async () => {
    owner = await createUser();
    admin = await createUser({ godMode: true });
    board = await createBoard(owner.id);
    column = await createColumn(board.id);
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it("a deleted board 404s for its owner and for a user in god mode, and is absent from the board list, while the row survives", async () => {
    const label = await createLabel(board.id);

    mockSessionAs(owner.id);
    const delRes = await callRoute(deleteBoard, { method: "DELETE", params: { boardId: board.id } });
    expect(delRes.status).toBe(200);

    mockSessionAs(owner.id);
    expect((await callRoute(getBoard, { params: { boardId: board.id } })).status).toBe(404);

    mockSessionAs(admin.id);
    expect((await callRoute(getBoard, { params: { boardId: board.id } })).status).toBe(404);

    mockSessionAs(admin.id);
    const listRes = await callRoute(listBoards);
    const boards = (await listRes.json()) as { id: string }[];
    expect(boards.some((b) => b.id === board.id)).toBe(false);

    const rawBoard = await prisma.board.findUnique({ where: { id: board.id } });
    expect(rawBoard?.deletedAt).not.toBeNull();
    const rawColumn = await prisma.column.findUnique({ where: { id: column.id } });
    expect(rawColumn?.deletedAt).not.toBeNull();
    const rawLabel = await prisma.label.findUnique({ where: { id: label.id } });
    expect(rawLabel?.deletedAt).not.toBeNull();
  });

  it("GET /api/tasks/mine excludes a deleted task while the row survives", async () => {
    const task = await createTask(column.id, { assigneeId: owner.id });

    mockSessionAs(owner.id);
    const before = await callRoute(getMyTasks);
    expect(((await before.json()) as { id: string }[]).some((t) => t.id === task.id)).toBe(true);

    const { DELETE: deleteTask } = await import("@/app/api/tasks/[taskId]/route");
    await callRoute(deleteTask, { method: "DELETE", params: { taskId: task.id } });

    const after = await callRoute(getMyTasks);
    expect(((await after.json()) as { id: string }[]).some((t) => t.id === task.id)).toBe(false);

    const rawTask = await prisma.task.findUnique({ where: { id: task.id } });
    expect(rawTask?.deletedAt).not.toBeNull();
  });

  it("a removed board member no longer sees the board in GET /api/boards", async () => {
    const member = await createUser();
    await inviteToBoard(board.id, member.id, "READ_ONLY");

    mockSessionAs(member.id);
    const before = await callRoute(listBoards);
    expect(((await before.json()) as { id: string }[]).some((b) => b.id === board.id)).toBe(true);

    mockSessionAs(owner.id);
    await callRoute(deleteMember, { method: "DELETE", params: { boardId: board.id, userId: member.id } });

    mockSessionAs(member.id);
    const after = await callRoute(listBoards);
    expect(((await after.json()) as { id: string }[]).some((b) => b.id === board.id)).toBe(false);
  });
});
