import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { GET as getMyTasks } from "@/app/api/tasks/mine/route";
import { prisma } from "@/lib/prisma";
import {
  createUser,
  createBoard,
  createColumn,
  createTask,
  inviteToBoard,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

describe("GET /api/tasks/mine", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let assignee: Awaited<ReturnType<typeof createUser>>;

  beforeEach(async () => {
    owner = await createUser();
    assignee = await createUser();
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it("requires authentication", async () => {
    mockSessionAs(null);
    const res = await callRoute(getMyTasks);
    expect(res.status).toBe(401);
  });

  it("returns only tasks assigned to the current user", async () => {
    const board = await createBoard(owner.id);
    const column = await createColumn(board.id);
    await inviteToBoard(board.id, assignee.id, "CAN_EDIT");
    const mine = await createTask(column.id, { title: "Mine", assigneeId: assignee.id });
    await createTask(column.id, { title: "Someone else's", assigneeId: owner.id });
    await createTask(column.id, { title: "Unassigned" });

    mockSessionAs(assignee.id);
    const res = await callRoute(getMyTasks);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(mine.id);
    expect(data[0].column.board.id).toBe(board.id);
  });

  it("orders by due date, soonest first, with no-due-date tasks last", async () => {
    const board = await createBoard(owner.id);
    const column = await createColumn(board.id);
    const later = await createTask(column.id, {
      title: "Later",
      assigneeId: owner.id,
      dueDate: new Date("2027-01-01"),
    });
    const noDueDate = await createTask(column.id, { title: "No due date", assigneeId: owner.id });
    const sooner = await createTask(column.id, {
      title: "Sooner",
      assigneeId: owner.id,
      dueDate: new Date("2026-01-01"),
    });

    mockSessionAs(owner.id);
    const res = await callRoute(getMyTasks);
    const data = await res.json();
    expect(data.map((t: { id: string }) => t.id)).toEqual([sooner.id, later.id, noDueDate.id]);
  });

  it("excludes tasks on boards the user can no longer access", async () => {
    const board = await createBoard(owner.id, { visibilityType: "PERSONAL" });
    const column = await createColumn(board.id);
    await inviteToBoard(board.id, assignee.id, "CAN_EDIT");
    await createTask(column.id, { title: "Stale assignment", assigneeId: assignee.id });

    await prisma.boardMember.deleteMany({ where: { boardId: board.id, userId: assignee.id } });

    mockSessionAs(assignee.id);
    const res = await callRoute(getMyTasks);
    const data = await res.json();
    expect(data).toHaveLength(0);
  });
});
