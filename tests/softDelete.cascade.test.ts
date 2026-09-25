import { describe, it, expect, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { prisma } from "@/lib/prisma";
import {
  softDeleteBoard,
  softDeleteColumn,
  softDeleteTask,
  softDeleteLabel,
  softDeleteChecklistItem,
  softDeleteTaskAttachment,
  removeBoardMember,
} from "@/lib/softDelete";
import {
  createUser,
  createBoard,
  createColumn,
  createTask,
  createLabel,
  createChecklistItem,
  createTaskAttachment,
  inviteToBoard,
  cleanupFixtures,
} from "./helpers/fixtures";

describe("softDelete cascades", () => {
  afterEach(async () => {
    await cleanupFixtures();
  });

  it("softDeleteBoard marks the board and every descendant deleted, and is idempotent", async () => {
    const owner = await createUser();
    const member = await createUser();
    const board = await createBoard(owner.id);
    const column = await createColumn(board.id);
    const task = await createTask(column.id);
    const label = await createLabel(board.id);
    const item = await createChecklistItem(task.id);
    const attachment = await createTaskAttachment(task.id);
    await inviteToBoard(board.id, member.id, "READ_ONLY");

    const result = await softDeleteBoard(board.id);
    expect(result?.id).toBe(board.id);

    expect((await prisma.board.findUnique({ where: { id: board.id } }))?.deletedAt).not.toBeNull();
    expect((await prisma.column.findUnique({ where: { id: column.id } }))?.deletedAt).not.toBeNull();
    expect((await prisma.task.findUnique({ where: { id: task.id } }))?.deletedAt).not.toBeNull();
    expect((await prisma.label.findUnique({ where: { id: label.id } }))?.deletedAt).not.toBeNull();
    expect((await prisma.checklistItem.findUnique({ where: { id: item.id } }))?.deletedAt).not.toBeNull();
    expect((await prisma.taskAttachment.findUnique({ where: { id: attachment.id } }))?.deletedAt).not.toBeNull();
    const boardMember = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: board.id, userId: member.id } },
    });
    expect(boardMember?.deletedAt).not.toBeNull();

    expect(await softDeleteBoard(board.id)).toBeNull();
  });

  it("softDeleteColumn cascades to its tasks and their children, and is idempotent", async () => {
    const owner = await createUser();
    const board = await createBoard(owner.id);
    const column = await createColumn(board.id);
    const task = await createTask(column.id);
    const item = await createChecklistItem(task.id);
    const attachment = await createTaskAttachment(task.id);

    const result = await softDeleteColumn(column.id);
    expect(result?.id).toBe(column.id);

    expect((await prisma.column.findUnique({ where: { id: column.id } }))?.deletedAt).not.toBeNull();
    expect((await prisma.task.findUnique({ where: { id: task.id } }))?.deletedAt).not.toBeNull();
    expect((await prisma.checklistItem.findUnique({ where: { id: item.id } }))?.deletedAt).not.toBeNull();
    expect((await prisma.taskAttachment.findUnique({ where: { id: attachment.id } }))?.deletedAt).not.toBeNull();

    expect(await softDeleteColumn(column.id)).toBeNull();
  });

  it("softDeleteTask cascades to its checklist items and attachments, and is idempotent", async () => {
    const owner = await createUser();
    const board = await createBoard(owner.id);
    const column = await createColumn(board.id);
    const task = await createTask(column.id);
    const item = await createChecklistItem(task.id);
    const attachment = await createTaskAttachment(task.id);

    const result = await softDeleteTask(task.id);
    expect(result?.id).toBe(task.id);

    expect((await prisma.task.findUnique({ where: { id: task.id } }))?.deletedAt).not.toBeNull();
    expect((await prisma.checklistItem.findUnique({ where: { id: item.id } }))?.deletedAt).not.toBeNull();
    expect((await prisma.taskAttachment.findUnique({ where: { id: attachment.id } }))?.deletedAt).not.toBeNull();

    expect(await softDeleteTask(task.id)).toBeNull();
  });

  it("leaf soft-deletes (label, checklist item, attachment, board member) mark deletedAt and are idempotent", async () => {
    const owner = await createUser();
    const member = await createUser();
    const board = await createBoard(owner.id);
    const column = await createColumn(board.id);
    const task = await createTask(column.id);
    const label = await createLabel(board.id);
    const item = await createChecklistItem(task.id);
    const attachment = await createTaskAttachment(task.id);
    await inviteToBoard(board.id, member.id, "READ_ONLY");

    expect((await softDeleteLabel(label.id))?.id).toBe(label.id);
    expect((await softDeleteChecklistItem(item.id))?.id).toBe(item.id);
    expect((await softDeleteTaskAttachment(attachment.id))?.id).toBe(attachment.id);
    expect((await removeBoardMember(board.id, member.id))?.userId).toBe(member.id);

    expect((await prisma.label.findUnique({ where: { id: label.id } }))?.deletedAt).not.toBeNull();
    expect((await prisma.checklistItem.findUnique({ where: { id: item.id } }))?.deletedAt).not.toBeNull();
    expect((await prisma.taskAttachment.findUnique({ where: { id: attachment.id } }))?.deletedAt).not.toBeNull();
    const boardMember = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: board.id, userId: member.id } },
    });
    expect(boardMember?.deletedAt).not.toBeNull();

    expect(await softDeleteLabel(label.id)).toBeNull();
    expect(await softDeleteChecklistItem(item.id)).toBeNull();
    expect(await softDeleteTaskAttachment(attachment.id)).toBeNull();
    expect(await removeBoardMember(board.id, member.id)).toBeNull();
  });
});
