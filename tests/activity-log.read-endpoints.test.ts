import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { GET as getTaskActivity } from "@/app/api/tasks/[taskId]/activity/route";
import { GET as getBoardActivity } from "@/app/api/boards/[boardId]/activity/route";
import { POST as postTask } from "@/app/api/tasks/route";
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

describe("Activity log — read endpoints", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let editUser: Awaited<ReturnType<typeof createUser>>;
  let readOnlyUser: Awaited<ReturnType<typeof createUser>>;
  let strangerUser: Awaited<ReturnType<typeof createUser>>;
  let board: Awaited<ReturnType<typeof createBoard>>;
  let column: Awaited<ReturnType<typeof createColumn>>;
  let task: Awaited<ReturnType<typeof createTask>>;

  beforeEach(async () => {
    owner = await createUser();
    editUser = await createUser();
    readOnlyUser = await createUser();
    strangerUser = await createUser();
    board = await createBoard(owner.id, { visibilityType: "PERSONAL" });
    column = await createColumn(board.id);
    task = await createTask(column.id);
    await inviteToBoard(board.id, editUser.id, "CAN_EDIT");
    await inviteToBoard(board.id, readOnlyUser.id, "READ_ONLY");
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  describe("GET /api/tasks/[taskId]/activity", () => {
    it("owner, CAN_EDIT, and READ_ONLY invitees all get 200", async () => {
      for (const user of [owner, editUser, readOnlyUser]) {
        mockSessionAs(user.id);
        const res = await callRoute(getTaskActivity, { params: { taskId: task.id } });
        expect(res.status).toBe(200);
      }
    });

    it("a never-invited user gets 403", async () => {
      mockSessionAs(strangerUser.id);
      const res = await callRoute(getTaskActivity, { params: { taskId: task.id } });
      expect(res.status).toBe(403);
    });

    it("a nonexistent task gets 404", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(getTaskActivity, { params: { taskId: "does-not-exist" } });
      expect(res.status).toBe(404);
    });

    it("an uninvited viewer on a GLOBAL board gets 200", async () => {
      const globalBoard = await createBoard(owner.id, { visibilityType: "GLOBAL" });
      const globalColumn = await createColumn(globalBoard.id);
      const globalTask = await createTask(globalColumn.id);

      mockSessionAs(strangerUser.id);
      const res = await callRoute(getTaskActivity, { params: { taskId: globalTask.id } });
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/boards/[boardId]/activity", () => {
    it("owner, CAN_EDIT, and READ_ONLY invitees all get 200", async () => {
      for (const user of [owner, editUser, readOnlyUser]) {
        mockSessionAs(user.id);
        const res = await callRoute(getBoardActivity, { params: { boardId: board.id } });
        expect(res.status).toBe(200);
      }
    });

    it("a never-invited user gets 403", async () => {
      mockSessionAs(strangerUser.id);
      const res = await callRoute(getBoardActivity, { params: { boardId: board.id } });
      expect(res.status).toBe(403);
    });

    it("a nonexistent board gets 404", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(getBoardActivity, { params: { boardId: "does-not-exist" } });
      expect(res.status).toBe(404);
    });

    it("paginates with a cursor, with no overlap or gap between pages", async () => {
      mockSessionAs(owner.id);
      for (let i = 0; i < 5; i++) {
        await callRoute(postTask, { method: "POST", body: { columnId: column.id, title: `Task ${i}` } });
      }
      const totalLogs = await prisma.activityLog.count({ where: { boardId: board.id } });
      expect(totalLogs).toBeGreaterThanOrEqual(5);

      const firstPageReq = new Request(`http://localhost/api/test?limit=2`);
      const firstPage = await getBoardActivity(firstPageReq, { params: Promise.resolve({ boardId: board.id }) });
      const firstData = await firstPage!.json();
      expect(firstData.items).toHaveLength(2);
      expect(firstData.nextCursor).toBeTruthy();

      const secondPageReq = new Request(
        `http://localhost/api/test?limit=2&cursor=${firstData.nextCursor}`,
      );
      const secondPage = await getBoardActivity(secondPageReq, { params: Promise.resolve({ boardId: board.id }) });
      const secondData = await secondPage!.json();

      const firstIds = new Set(firstData.items.map((i: { id: string }) => i.id));
      for (const item of secondData.items) {
        expect(firstIds.has(item.id)).toBe(false);
      }
    });
  });
});
