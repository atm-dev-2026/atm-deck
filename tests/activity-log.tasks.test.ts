import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { POST as postTask } from "@/app/api/tasks/route";
import { PATCH as patchTask, DELETE as deleteTask } from "@/app/api/tasks/[taskId]/route";
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

describe("Activity log — tasks", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let assignee: Awaited<ReturnType<typeof createUser>>;
  let board: Awaited<ReturnType<typeof createBoard>>;
  let column: Awaited<ReturnType<typeof createColumn>>;

  beforeEach(async () => {
    owner = await createUser({ name: "Owner" });
    assignee = await createUser({ name: "Assignee" });
    board = await createBoard(owner.id);
    column = await createColumn(board.id);
    await inviteToBoard(board.id, assignee.id, "READ_ONLY");
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it("logs CREATED on task creation", async () => {
    mockSessionAs(owner.id);
    const res = await callRoute(postTask, {
      method: "POST",
      body: { columnId: column.id, title: "Write tests" },
    });
    expect(res.status).toBe(201);
    const task = await res.json();

    const logs = await prisma.activityLog.findMany({ where: { entityType: "TASK", entityId: task.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("CREATED");
    expect(logs[0].entityName).toBe("Write tests");
    expect(logs[0].actorId).toBe(owner.id);
  });

  it("logs UPDATED with resolved names and raw enums when priority and assignee change", async () => {
    const task = await createTask(column.id, { priority: "LOW" });
    mockSessionAs(owner.id);
    const res = await callRoute(patchTask, {
      method: "PATCH",
      params: { taskId: task.id },
      body: { priority: "HIGH", assigneeId: assignee.id },
    });
    expect(res.status).toBe(200);

    const logs = await prisma.activityLog.findMany({ where: { entityType: "TASK", entityId: task.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("UPDATED");
    const changes = logs[0].changes as { field: string; from: string | null; to: string | null }[];
    const priorityChange = changes.find((c) => c.field === "priority");
    expect(priorityChange).toEqual({ field: "priority", from: "LOW", to: "HIGH" });
    const assigneeChange = changes.find((c) => c.field === "assignee");
    expect(assigneeChange).toEqual({ field: "assignee", from: null, to: "Assignee" });
  });

  it("does not log anything for an order-only reorder", async () => {
    const task = await createTask(column.id, { order: 0 });
    mockSessionAs(owner.id);
    const res = await callRoute(patchTask, {
      method: "PATCH",
      params: { taskId: task.id },
      body: { order: 5 },
    });
    expect(res.status).toBe(200);

    const logs = await prisma.activityLog.findMany({ where: { entityType: "TASK", entityId: task.id } });
    expect(logs).toHaveLength(0);
  });

  it("logs DELETED with the task's title, and the log row survives the soft delete", async () => {
    const task = await createTask(column.id, { title: "Fix login bug" });
    mockSessionAs(owner.id);
    const res = await callRoute(deleteTask, {
      method: "DELETE",
      params: { taskId: task.id },
    });
    expect(res.status).toBe(200);

    const logs = await prisma.activityLog.findMany({ where: { entityType: "TASK", entityId: task.id } });
    const deletedLog = logs.find((l) => l.action === "DELETED");
    expect(deletedLog?.entityName).toBe("Fix login bug");

    const taskRow = await prisma.task.findUnique({ where: { id: task.id } });
    expect(taskRow?.deletedAt).not.toBeNull();
  });
});
