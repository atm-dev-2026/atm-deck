import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { POST as postColumn } from "@/app/api/columns/route";
import { PATCH as patchColumn, DELETE as deleteColumn } from "@/app/api/columns/[columnId]/route";
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

describe("Column management", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let editUser: Awaited<ReturnType<typeof createUser>>;
  let viewerUser: Awaited<ReturnType<typeof createUser>>;
  let stranger: Awaited<ReturnType<typeof createUser>>;
  let board: Awaited<ReturnType<typeof createBoard>>;

  beforeEach(async () => {
    owner = await createUser();
    editUser = await createUser();
    viewerUser = await createUser();
    stranger = await createUser();
    board = await createBoard(owner.id, { visibilityType: "PERSONAL" });
    await inviteToBoard(board.id, editUser.id, "CAN_EDIT");
    await inviteToBoard(board.id, viewerUser.id, "READ_ONLY");
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  describe("POST /api/columns", () => {
    it("owner creates a column at order 0", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(postColumn, {
        method: "POST",
        body: { boardId: board.id, name: "To Do" },
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.order).toBe(0);
    });

    it("a second column is appended after the first", async () => {
      mockSessionAs(owner.id);
      await callRoute(postColumn, { method: "POST", body: { boardId: board.id, name: "First" } });
      const res = await callRoute(postColumn, { method: "POST", body: { boardId: board.id, name: "Second" } });
      const data = await res.json();
      expect(data.order).toBe(1);
    });

    it("a CAN_EDIT invitee can create a column", async () => {
      mockSessionAs(editUser.id);
      const res = await callRoute(postColumn, {
        method: "POST",
        body: { boardId: board.id, name: "In Progress" },
      });
      expect(res.status).toBe(201);
    });

    it("a READ_ONLY invitee cannot create a column", async () => {
      mockSessionAs(viewerUser.id);
      const res = await callRoute(postColumn, {
        method: "POST",
        body: { boardId: board.id, name: "Nope" },
      });
      expect(res.status).toBe(403);
    });

    it("a never-invited user cannot create a column on a PERSONAL board", async () => {
      mockSessionAs(stranger.id);
      const res = await callRoute(postColumn, {
        method: "POST",
        body: { boardId: board.id, name: "Nope" },
      });
      expect(res.status).toBe(403);
    });

    it("rejects a missing name", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(postColumn, { method: "POST", body: { boardId: board.id } });
      expect(res.status).toBe(400);
    });

    it("returns 404 for a nonexistent board", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(postColumn, {
        method: "POST",
        body: { boardId: "does-not-exist", name: "Nope" },
      });
      expect(res.status).toBe(404);
    });

    it("rejects an unauthenticated request", async () => {
      mockSessionAs(null);
      const res = await callRoute(postColumn, {
        method: "POST",
        body: { boardId: board.id, name: "Nope" },
      });
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/columns/[columnId]", () => {
    it("owner renames a column", async () => {
      const column = await createColumn(board.id);
      mockSessionAs(owner.id);
      const res = await callRoute(patchColumn, {
        method: "PATCH",
        params: { columnId: column.id },
        body: { name: "Renamed" },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe("Renamed");
    });

    it("a CAN_EDIT invitee marks and unmarks a done column", async () => {
      const column = await createColumn(board.id);
      mockSessionAs(editUser.id);
      const marked = await callRoute(patchColumn, {
        method: "PATCH",
        params: { columnId: column.id },
        body: { isDone: true },
      });
      expect(marked.status).toBe(200);
      expect((await marked.json()).isDone).toBe(true);

      const unmarked = await callRoute(patchColumn, {
        method: "PATCH",
        params: { columnId: column.id },
        body: { isDone: false },
      });
      expect((await unmarked.json()).isDone).toBe(false);
    });

    it("a READ_ONLY invitee cannot mark a done column", async () => {
      const column = await createColumn(board.id);
      mockSessionAs(viewerUser.id);
      const res = await callRoute(patchColumn, {
        method: "PATCH",
        params: { columnId: column.id },
        body: { isDone: true },
      });
      expect(res.status).toBe(403);
    });

    it("rejects a non-boolean isDone", async () => {
      const column = await createColumn(board.id);
      mockSessionAs(owner.id);
      const res = await callRoute(patchColumn, {
        method: "PATCH",
        params: { columnId: column.id },
        body: { isDone: "yes" },
      });
      expect(res.status).toBe(400);
    });

    it("a READ_ONLY invitee cannot rename a column", async () => {
      const column = await createColumn(board.id);
      mockSessionAs(viewerUser.id);
      const res = await callRoute(patchColumn, {
        method: "PATCH",
        params: { columnId: column.id },
        body: { name: "Renamed" },
      });
      expect(res.status).toBe(403);
    });

    it("returns 404 for a nonexistent column", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(patchColumn, {
        method: "PATCH",
        params: { columnId: "does-not-exist" },
        body: { name: "Renamed" },
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/columns/[columnId]", () => {
    it("owner deletes a column, soft-deleting it and cascading to its tasks", async () => {
      const column = await createColumn(board.id);
      const task = await createTask(column.id);
      mockSessionAs(owner.id);
      const res = await callRoute(deleteColumn, {
        method: "DELETE",
        params: { columnId: column.id },
      });
      expect(res.status).toBe(200);
      const deletedColumn = await prisma.column.findUnique({ where: { id: column.id } });
      expect(deletedColumn?.deletedAt).not.toBeNull();
      const deletedTask = await prisma.task.findUnique({ where: { id: task.id } });
      expect(deletedTask?.deletedAt).not.toBeNull();
    });

    it("a CAN_EDIT invitee can delete a column (content deletion only needs edit access)", async () => {
      const column = await createColumn(board.id);
      mockSessionAs(editUser.id);
      const res = await callRoute(deleteColumn, {
        method: "DELETE",
        params: { columnId: column.id },
      });
      expect(res.status).toBe(200);
    });

    it("a READ_ONLY invitee cannot delete a column", async () => {
      const column = await createColumn(board.id);
      mockSessionAs(viewerUser.id);
      const res = await callRoute(deleteColumn, {
        method: "DELETE",
        params: { columnId: column.id },
      });
      expect(res.status).toBe(403);
    });
  });
});
