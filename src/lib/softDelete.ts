import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

function isMissingRecord(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

export async function softDeleteBoard(boardId: string) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    let board;
    try {
      board = await tx.board.update({
        where: { id: boardId, deletedAt: null },
        data: { deletedAt: now },
        select: { id: true, name: true },
      });
    } catch (error) {
      if (isMissingRecord(error)) return null;
      throw error;
    }

    await tx.column.updateMany({ where: { boardId, deletedAt: null }, data: { deletedAt: now } });
    await tx.label.updateMany({ where: { boardId, deletedAt: null }, data: { deletedAt: now } });
    await tx.boardMember.updateMany({ where: { boardId, deletedAt: null }, data: { deletedAt: now } });
    await tx.task.updateMany({ where: { column: { boardId }, deletedAt: null }, data: { deletedAt: now } });
    await tx.checklistItem.updateMany({
      where: { task: { column: { boardId } }, deletedAt: null },
      data: { deletedAt: now },
    });
    await tx.taskAttachment.updateMany({
      where: { task: { column: { boardId } }, deletedAt: null },
      data: { deletedAt: now },
    });

    return board;
  });
}

export async function softDeleteColumn(columnId: string) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    let column;
    try {
      column = await tx.column.update({
        where: { id: columnId, deletedAt: null },
        data: { deletedAt: now },
        select: { id: true, name: true, boardId: true },
      });
    } catch (error) {
      if (isMissingRecord(error)) return null;
      throw error;
    }

    await tx.task.updateMany({ where: { columnId, deletedAt: null }, data: { deletedAt: now } });
    await tx.checklistItem.updateMany({
      where: { task: { columnId }, deletedAt: null },
      data: { deletedAt: now },
    });
    await tx.taskAttachment.updateMany({
      where: { task: { columnId }, deletedAt: null },
      data: { deletedAt: now },
    });

    return column;
  });
}

export async function softDeleteTask(taskId: string) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    let task;
    try {
      task = await tx.task.update({
        where: { id: taskId, deletedAt: null },
        data: { deletedAt: now },
        select: { id: true, title: true, columnId: true },
      });
    } catch (error) {
      if (isMissingRecord(error)) return null;
      throw error;
    }

    await tx.checklistItem.updateMany({ where: { taskId, deletedAt: null }, data: { deletedAt: now } });
    await tx.taskAttachment.updateMany({ where: { taskId, deletedAt: null }, data: { deletedAt: now } });

    return task;
  });
}

export async function softDeleteLabel(labelId: string) {
  try {
    return await prisma.label.update({
      where: { id: labelId, deletedAt: null },
      data: { deletedAt: new Date() },
      select: { id: true, name: true },
    });
  } catch (error) {
    if (isMissingRecord(error)) return null;
    throw error;
  }
}

export async function softDeleteChecklistItem(itemId: string) {
  try {
    return await prisma.checklistItem.update({
      where: { id: itemId, deletedAt: null },
      data: { deletedAt: new Date() },
      select: { id: true, text: true, taskId: true },
    });
  } catch (error) {
    if (isMissingRecord(error)) return null;
    throw error;
  }
}

export async function softDeleteTaskAttachment(attachmentId: string) {
  try {
    return await prisma.taskAttachment.update({
      where: { id: attachmentId, deletedAt: null },
      data: { deletedAt: new Date() },
      select: { id: true, fileName: true, taskId: true },
    });
  } catch (error) {
    if (isMissingRecord(error)) return null;
    throw error;
  }
}

export async function removeBoardMember(boardId: string, userId: string) {
  try {
    return await prisma.boardMember.update({
      where: { boardId_userId: { boardId, userId }, deletedAt: null },
      data: { deletedAt: new Date() },
      select: {
        id: true,
        boardId: true,
        userId: true,
        user: { select: { name: true, email: true } },
      },
    });
  } catch (error) {
    if (isMissingRecord(error)) return null;
    throw error;
  }
}
