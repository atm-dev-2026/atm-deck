import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  const data = await request.json();

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

  return NextResponse.json(task);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  await prisma.task.delete({ where: { id: taskId } });
  return NextResponse.json({ ok: true });
}
