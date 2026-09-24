import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBoardIdForTask, requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { broadcast } from "@/lib/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;

  const boardId = await getBoardIdForTask(taskId);
  if (!boardId) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
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
        { error: "Cannot move a task to a column outside its board" },
        { status: 400 },
      );
    }
  }

  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.assignee !== undefined && { assignee: data.assignee }),
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
      include: { labels: true, checklist: { orderBy: { order: "asc" } } },
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
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
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
