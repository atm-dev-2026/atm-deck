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
  createChecklistItem,
  inviteToBoard,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

describe("Task management", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let editUser: Awaited<ReturnType<typeof createUser>>;
  let viewerUser: Awaited<ReturnType<typeof createUser>>;
  let board: Awaited<ReturnType<typeof createBoard>>;
  let column: Awaited<ReturnType<typeof createColumn>>;

  beforeEach(async () => {
    owner = await createUser();
    editUser = await createUser();
    viewerUser = await createUser();
    board = await createBoard(owner.id, { visibilityType: "PERSONAL" });
    column = await createColumn(board.id);
    await inviteToBoard(board.id, editUser.id, "CAN_EDIT");
    await inviteToBoard(board.id, viewerUser.id, "READ_ONLY");
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  describe("POST /api/tasks", () => {
    it("owner creates a task at order 0", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(postTask, {
        method: "POST",
        body: { columnId: column.id, title: "Write tests" },
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.order).toBe(0);
    });

    it("a second task is appended after the first", async () => {
      mockSessionAs(owner.id);
      await callRoute(postTask, { method: "POST", body: { columnId: column.id, title: "First" } });
      const res = await callRoute(postTask, { method: "POST", body: { columnId: column.id, title: "Second" } });
      const data = await res.json();
      expect(data.order).toBe(1);
    });

    it("a READ_ONLY invitee cannot create a task", async () => {
      mockSessionAs(viewerUser.id);
      const res = await callRoute(postTask, {
        method: "POST",
        body: { columnId: column.id, title: "Nope" },
      });
      expect(res.status).toBe(403);
    });

    it("rejects a missing title", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(postTask, { method: "POST", body: { columnId: column.id } });
      expect(res.status).toBe(400);
    });

    it("returns 404 for a nonexistent column", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(postTask, {
        method: "POST",
        body: { columnId: "does-not-exist", title: "Nope" },
      });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/tasks/[taskId]", () => {
    it("owner updates title, priority, and due date", async () => {
      const task = await createTask(column.id);
      mockSessionAs(owner.id);
      const res = await callRoute(patchTask, {
        method: "PATCH",
        params: { taskId: task.id },
        body: { title: "Updated", priority: "HIGH", dueDate: "2026-12-01" },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.title).toBe("Updated");
      expect(data.priority).toBe("HIGH");
    });

    it("moving a task to another column on the same board succeeds", async () => {
      const task = await createTask(column.id);
      const otherColumn = await createColumn(board.id, { order: 1 });
      mockSessionAs(owner.id);
      const res = await callRoute(patchTask, {
        method: "PATCH",
        params: { taskId: task.id },
        body: { columnId: otherColumn.id },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.columnId).toBe(otherColumn.id);
    });

    it("rejects moving a task to a column on a different board", async () => {
      const task = await createTask(column.id);
      const otherBoard = await createBoard(owner.id, { visibilityType: "PERSONAL" });
      const otherBoardColumn = await createColumn(otherBoard.id);
      mockSessionAs(owner.id);
      const res = await callRoute(patchTask, {
        method: "PATCH",
        params: { taskId: task.id },
        body: { columnId: otherBoardColumn.id },
      });
      expect(res.status).toBe(400);
    });

    it("a READ_ONLY invitee cannot update a task", async () => {
      const task = await createTask(column.id);
      mockSessionAs(viewerUser.id);
      const res = await callRoute(patchTask, {
        method: "PATCH",
        params: { taskId: task.id },
        body: { title: "Nope" },
      });
      expect(res.status).toBe(403);
    });

    it("returns 404 for a nonexistent task", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(patchTask, {
        method: "PATCH",
        params: { taskId: "does-not-exist" },
        body: { title: "Nope" },
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/tasks/[taskId]", () => {
    it("owner deletes a task, cascading to its checklist items", async () => {
      const task = await createTask(column.id);
      const item = await createChecklistItem(task.id);
      mockSessionAs(owner.id);
      const res = await callRoute(deleteTask, {
        method: "DELETE",
        params: { taskId: task.id },
      });
      expect(res.status).toBe(200);
      expect(await prisma.checklistItem.findUnique({ where: { id: item.id } })).toBeNull();
    });

    it("a CAN_EDIT invitee can delete a task (content deletion only needs edit access)", async () => {
      const task = await createTask(column.id);
      mockSessionAs(editUser.id);
      const res = await callRoute(deleteTask, {
        method: "DELETE",
        params: { taskId: task.id },
      });
      expect(res.status).toBe(200);
    });

    it("a READ_ONLY invitee cannot delete a task", async () => {
      const task = await createTask(column.id);
      mockSessionAs(viewerUser.id);
      const res = await callRoute(deleteTask, {
        method: "DELETE",
        params: { taskId: task.id },
      });
      expect(res.status).toBe(403);
    });
  });
});
