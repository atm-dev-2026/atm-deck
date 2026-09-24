import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBoardIdForTask, isBoardParticipant, requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { broadcast } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;

  const boardId = await getBoardIdForTask(taskId);
  if (!boardId) {
    return NextResponse.json({ error: "ไม่พบงานนี้" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  const data = await request.json();

  if (data.columnId !== undefined) {
    const destinationColumn = await prisma.column.findUnique({
      where: { id: data.columnId },
      select: { boardId: true },
    });
    if (!destinationColumn || destinationColumn.boardId !== boardId) {
      return NextResponse.json(
        { error: "ย้ายงานไปยังคอลัมน์นอกบอร์ดนี้ไม่ได้" },
        { status: 400 },
      );
    }
  }

  if (data.assigneeId && !(await isBoardParticipant(boardId, data.assigneeId))) {
    return NextResponse.json(
      { error: "ผู้รับผิดชอบต้องเป็นสมาชิกของบอร์ดนี้" },
      { status: 400 },
    );
  }

  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.columnId !== undefined && { columnId: data.columnId }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
        ...(data.labelIds !== undefined && {
          labels: { set: (data.labelIds as string[]).map((id) => ({ id })) },
        }),
      },
      include: {
        labels: true,
        checklist: { orderBy: { order: "asc" } },
        attachments: { orderBy: { createdAt: "asc" } },
        createdBy: { select: { id: true, name: true, email: true, image: true } },
        assignee: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    await broadcast(`board:${boardId}`, "task-updated", task);

    return NextResponse.json(task);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;

  const boardId = await getBoardIdForTask(taskId);
  if (!boardId) {
    return NextResponse.json({ error: "ไม่พบงานนี้" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  try {
    await prisma.task.delete({ where: { id: taskId } });
    await broadcast(`board:${boardId}`, "task-deleted", { id: taskId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
