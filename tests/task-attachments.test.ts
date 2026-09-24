import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { POST as presignAttachment } from "@/app/api/tasks/[taskId]/attachments/upload-url/route";
import { POST as createAttachment } from "@/app/api/tasks/[taskId]/attachments/route";
import { GET as getAttachment, DELETE as deleteAttachment } from "@/app/api/task-attachments/[attachmentId]/route";
import { prisma } from "@/lib/prisma";
import {
  createUser,
  createBoard,
  createColumn,
  createTask,
  createTaskAttachment,
  inviteToBoard,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

describe("Task attachments", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let editUser: Awaited<ReturnType<typeof createUser>>;
  let viewerUser: Awaited<ReturnType<typeof createUser>>;
  let board: Awaited<ReturnType<typeof createBoard>>;
  let task: Awaited<ReturnType<typeof createTask>>;

  beforeEach(async () => {
    owner = await createUser();
    editUser = await createUser();
    viewerUser = await createUser();
    board = await createBoard(owner.id, { visibilityType: "PERSONAL" });
    const column = await createColumn(board.id);
    task = await createTask(column.id);
    await inviteToBoard(board.id, editUser.id, "CAN_EDIT");
    await inviteToBoard(board.id, viewerUser.id, "READ_ONLY");
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  describe("POST /api/tasks/[taskId]/attachments/upload-url", () => {
    it("owner gets a presigned upload URL under the task's key prefix", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(presignAttachment, {
        method: "POST",
        params: { taskId: task.id },
        body: { fileName: "diagram.png", fileType: "image/png", fileSize: 1024 },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.key).toMatch(new RegExp(`^tasks/${task.id}/`));
      expect(typeof data.uploadUrl).toBe("string");
    });

    it("rejects a file over the size limit", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(presignAttachment, {
        method: "POST",
        params: { taskId: task.id },
        body: { fileName: "huge.zip", fileType: "application/zip", fileSize: 999_999_999 },
      });
      expect(res.status).toBe(400);
    });

    it("a READ_ONLY invitee cannot request an upload URL", async () => {
      mockSessionAs(viewerUser.id);
      const res = await callRoute(presignAttachment, {
        method: "POST",
        params: { taskId: task.id },
        body: { fileName: "diagram.png", fileType: "image/png", fileSize: 1024 },
      });
      expect(res.status).toBe(403);
    });

    it("returns 404 for a nonexistent task", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(presignAttachment, {
        method: "POST",
        params: { taskId: "does-not-exist" },
        body: { fileName: "diagram.png", fileType: "image/png", fileSize: 1024 },
      });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/tasks/[taskId]/attachments", () => {
    it("owner records an uploaded attachment", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(createAttachment, {
        method: "POST",
        params: { taskId: task.id },
        body: {
          key: `tasks/${task.id}/abc-diagram.png`,
          fileName: "diagram.png",
          fileType: "image/png",
          fileSize: 2048,
        },
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.fileName).toBe("diagram.png");
      expect(data.taskId).toBe(task.id);
    });

    it("rejects a key outside the task's prefix", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(createAttachment, {
        method: "POST",
        params: { taskId: task.id },
        body: {
          key: `tasks/some-other-task/abc-diagram.png`,
          fileName: "diagram.png",
          fileType: "image/png",
          fileSize: 2048,
        },
      });
      expect(res.status).toBe(400);
    });

    it("a READ_ONLY invitee cannot record an attachment", async () => {
      mockSessionAs(viewerUser.id);
      const res = await callRoute(createAttachment, {
        method: "POST",
        params: { taskId: task.id },
        body: {
          key: `tasks/${task.id}/abc-diagram.png`,
          fileName: "diagram.png",
          fileType: "image/png",
          fileSize: 2048,
        },
      });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/task-attachments/[attachmentId]", () => {
    it("a READ_ONLY invitee can view (download) an attachment", async () => {
      const attachment = await createTaskAttachment(task.id);
      mockSessionAs(viewerUser.id);
      const res = await callRoute(getAttachment, {
        method: "GET",
        params: { attachmentId: attachment.id },
      });
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain(attachment.key);
    });

    it("a non-member cannot view an attachment", async () => {
      const attachment = await createTaskAttachment(task.id);
      const outsider = await createUser();
      mockSessionAs(outsider.id);
      const res = await callRoute(getAttachment, {
        method: "GET",
        params: { attachmentId: attachment.id },
      });
      expect(res.status).toBe(403);
    });

    it("returns 404 for a nonexistent attachment", async () => {
      mockSessionAs(owner.id);
      const res = await callRoute(getAttachment, {
        method: "GET",
        params: { attachmentId: "does-not-exist" },
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/task-attachments/[attachmentId]", () => {
    it("owner deletes an attachment", async () => {
      const attachment = await createTaskAttachment(task.id);
      mockSessionAs(owner.id);
      const res = await callRoute(deleteAttachment, {
        method: "DELETE",
        params: { attachmentId: attachment.id },
      });
      expect(res.status).toBe(200);
      expect(await prisma.taskAttachment.findUnique({ where: { id: attachment.id } })).toBeNull();
    });

    it("a READ_ONLY invitee cannot delete an attachment", async () => {
      const attachment = await createTaskAttachment(task.id);
      mockSessionAs(viewerUser.id);
      const res = await callRoute(deleteAttachment, {
        method: "DELETE",
        params: { attachmentId: attachment.id },
      });
      expect(res.status).toBe(403);
    });
  });
});
