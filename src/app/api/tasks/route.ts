import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBoardIdForColumn, isBoardParticipant, requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { afterResponse } from "@/lib/afterResponse";
import { broadcast } from "@/lib/supabase";
import { logActivity } from "@/lib/activityLog";

export async function POST(request: Request) {
  const { columnId, title, description, assigneeId, dueDate, dueDateHasTime } =
    await request.json();

  if (!columnId || !title) {
    return NextResponse.json(
      { error: "ต้องระบุคอลัมน์และชื่องาน" },
      { status: 400 },
    );
  }

  const boardId = await getBoardIdForColumn(columnId);
  if (!boardId) {
    return NextResponse.json({ error: "ไม่พบคอลัมน์นี้" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  if (assigneeId && !(await isBoardParticipant(boardId, assigneeId))) {
    return NextResponse.json(
      { error: "ผู้รับผิดชอบต้องเป็นสมาชิกของบอร์ดนี้" },
      { status: 400 },
    );
  }

  try {
    const lastTask = await prisma.task.findFirst({
      where: { columnId, deletedAt: null },
      orderBy: { order: "desc" },
    });

    const task = await prisma.task.create({
      data: {
        columnId,
        title,
        description,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        dueDateHasTime: Boolean(dueDate) && dueDateHasTime === true,
        order: lastTask ? lastTask.order + 1 : 0,
        createdById: gate.user.id,
      },
      include: {
        labels: true,
        checklist: true,
        attachments: true,
        createdBy: { select: { id: true, name: true, email: true, image: true } },
        assignee: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    await logActivity({
      boardId,
      entityType: "TASK",
      entityId: task.id,
      entityName: task.title,
      action: "CREATED",
      actor: gate.user,
    });

    afterResponse(() => broadcast(`board:${boardId}`, "task-created", task));

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
