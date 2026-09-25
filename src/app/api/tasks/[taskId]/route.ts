import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBoardIdForTask, isBoardParticipant, requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { afterResponse } from "@/lib/afterResponse";
import { broadcast } from "@/lib/supabase";
import { buildChange, logActivity, type ActivityChange } from "@/lib/activityLog";
import { softDeleteTask } from "@/lib/softDelete";

function userDisplayName(user: { name: string | null; email: string | null } | null): string | null {
  if (!user) return null;
  return user.name ?? user.email ?? "?";
}

function labelNames(labels: { name: string }[]): string | null {
  return labels.length > 0 ? labels.map((l) => l.name).join(", ") : null;
}

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
      where: { id: data.columnId, deletedAt: null },
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

  let labelIdsToSet: { id: string }[] | undefined;
  if (data.labelIds !== undefined) {
    const liveLabels = await prisma.label.findMany({
      where: { id: { in: data.labelIds as string[] }, deletedAt: null },
      select: { id: true },
    });
    labelIdsToSet = liveLabels.map((l) => ({ id: l.id }));
  }

  try {
    const before = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        title: true,
        description: true,
        priority: true,
        dueDate: true,
        assignee: { select: { name: true, email: true } },
        column: { select: { name: true } },
        labels: { select: { name: true } },
      },
    });

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
        ...(labelIdsToSet !== undefined && { labels: { set: labelIdsToSet } }),
      },
      include: {
        labels: true,
        checklist: { orderBy: { order: "asc" } },
        attachments: { orderBy: { createdAt: "asc" } },
        createdBy: { select: { id: true, name: true, email: true, image: true } },
        assignee: { select: { id: true, name: true, email: true, image: true } },
        column: { select: { name: true } },
      },
    });

    if (before) {
      const changes: ActivityChange[] = [];
      const push = (change: ReturnType<typeof buildChange>) => {
        if (change) changes.push(change);
      };

      if (data.title !== undefined) push(buildChange("title", before.title, task.title));
      if (data.description !== undefined) {
        push(buildChange("description", before.description, task.description));
      }
      if (data.priority !== undefined) push(buildChange("priority", before.priority, task.priority));
      if (data.dueDate !== undefined) {
        push(
          buildChange(
            "dueDate",
            before.dueDate ? before.dueDate.toISOString() : null,
            task.dueDate ? task.dueDate.toISOString() : null,
          ),
        );
      }
      if (data.assigneeId !== undefined) {
        push(buildChange("assignee", userDisplayName(before.assignee), userDisplayName(task.assignee)));
      }
      if (data.columnId !== undefined) {
        push(buildChange("column", before.column.name, task.column.name));
      }
      if (labelIdsToSet !== undefined) {
        push(buildChange("labels", labelNames(before.labels), labelNames(task.labels)));
      }

      if (changes.length > 0) {
        await logActivity({
          boardId,
          entityType: "TASK",
          entityId: task.id,
          entityName: task.title,
          action: "UPDATED",
          actor: gate.user,
          changes,
        });
      }
    }

    afterResponse(() => broadcast(`board:${boardId}`, "task-updated", task));

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
    const deleted = await softDeleteTask(taskId);
    if (!deleted) {
      return NextResponse.json({ error: "ไม่พบงานนี้" }, { status: 404 });
    }

    await logActivity({
      boardId,
      entityType: "TASK",
      entityId: deleted.id,
      entityName: deleted.title,
      action: "DELETED",
      actor: gate.user,
    });

    afterResponse(() => broadcast(`board:${boardId}`, "task-deleted", { id: taskId }));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
