import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { columnId, title, description, assignee, dueDate } =
    await request.json();

  if (!columnId || !title) {
    return NextResponse.json(
      { error: "columnId and title are required" },
      { status: 400 },
    );
  }

  const lastTask = await prisma.task.findFirst({
    where: { columnId },
    orderBy: { order: "desc" },
  });

  const task = await prisma.task.create({
    data: {
      columnId,
      title,
      description,
      assignee,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      order: lastTask ? lastTask.order + 1 : 0,
    },
    include: { labels: true, checklist: true },
  });

  return NextResponse.json(task, { status: 201 });
}
