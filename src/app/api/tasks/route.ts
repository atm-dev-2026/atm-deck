import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBoardIdForColumn, requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { broadcast } from "@/lib/supabase";

export async function POST(request: Request) {
  const { columnId, title, description, assignee, dueDate } =
    await request.json();

  if (!columnId || !title) {
    return NextResponse.json(
      { error: "columnId and title are required" },
      { status: 400 },
    );
  }

  const boardId = await getBoardIdForColumn(columnId);
  if (!boardId) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  try {
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

    await broadcast(`board:${boardId}`, "task-created", task);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
