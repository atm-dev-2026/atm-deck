import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { POST as postChecklistItem } from "@/app/api/tasks/[taskId]/checklist/route";
import { PATCH as patchChecklistItem, DELETE as deleteChecklistItem } from "@/app/api/checklist/[itemId]/route";
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

describe("Checklist items", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let viewerUser: Awaited<ReturnType<typeof createUser>>;
  let board: Awaited<ReturnType<typeof createBoard>>;
  let task: Awaited<ReturnType<typeof createTask>>;

  beforeEach(async () => {
    owner = await createUser();
    viewerUser = await createUser();
    board = await createBoard(owner.id, { visibilityType: "PERSONAL" });
    const column = await createColumn(board.id);
    task = await createTask(column.id);
    await inviteToBoard(board.id, viewerUser.id, "READ_ONLY");
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  describe("POST /api/tasks/[taskId]/checklist", () => {
    it("owner adds a checklist item at order 0", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(postChecklistItem, {
        method: "POST",
        params: { taskId: task.id },
        body: { text: "Step one" },
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.order).toBe(0);
      expect(data.done).toBe(false);
    });

    it("a second item is appended after the first", async () => {
      mockSessionAs(owner.id);
      await callRoute(postChecklistItem, { method: "POST", params: { taskId: task.id }, body: { text: "First" } });
      const res = await callRoute(postChecklistItem, {
        method: "POST",
        params: { taskId: task.id },
        body: { text: "Second" },
      });
      const data = await res.json();
      expect(data.order).toBe(1);
    });

    it("a READ_ONLY invitee cannot add an item", async () => {
      mockSessionAs(viewerUser.id);
      const res = await callRoute(postChecklistItem, {
        method: "POST",
        params: { taskId: task.id },
        body: { text: "Nope" },
      });
      expect(res.status).toBe(403);
    });

    it("rejects missing text", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(postChecklistItem, {
        method: "POST",
        params: { taskId: task.id },
        body: {},
      });
      expect(res.status).toBe(400);
    });

    it("returns 404 for a nonexistent task", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(postChecklistItem, {
        method: "POST",
        params: { taskId: "does-not-exist" },
        body: { text: "Nope" },
      });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/checklist/[itemId]", () => {
    it("owner marks an item done", async () => {
      const item = await createChecklistItem(task.id);
      mockSessionAs(owner.id);
      const res = await callRoute(patchChecklistItem, {
        method: "PATCH",
        params: { itemId: item.id },
        body: { done: true },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.done).toBe(true);
    });

    it("a READ_ONLY invitee cannot toggle an item", async () => {
      const item = await createChecklistItem(task.id);
      mockSessionAs(viewerUser.id);
      const res = await callRoute(patchChecklistItem, {
        method: "PATCH",
        params: { itemId: item.id },
        body: { done: true },
      });
      expect(res.status).toBe(403);
    });

    it("returns 404 for a nonexistent item", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(patchChecklistItem, {
        method: "PATCH",
        params: { itemId: "does-not-exist" },
        body: { done: true },
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/checklist/[itemId]", () => {
    it("owner deletes an item", async () => {
      const item = await createChecklistItem(task.id);
      mockSessionAs(owner.id);
      const res = await callRoute(deleteChecklistItem, {
        method: "DELETE",
        params: { itemId: item.id },
      });
      expect(res.status).toBe(200);
    });

    it("a READ_ONLY invitee cannot delete an item", async () => {
      const item = await createChecklistItem(task.id);
      mockSessionAs(viewerUser.id);
      const res = await callRoute(deleteChecklistItem, {
        method: "DELETE",
        params: { itemId: item.id },
      });
      expect(res.status).toBe(403);
    });
  });
});
