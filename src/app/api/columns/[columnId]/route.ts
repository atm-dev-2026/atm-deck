import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBoardIdForColumn, requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { buildChange, logActivity } from "@/lib/activityLog";
import { softDeleteColumn } from "@/lib/softDelete";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ columnId: string }> },
) {
  const { columnId } = await params;

  const boardId = await getBoardIdForColumn(columnId);
  if (!boardId) {
    return NextResponse.json({ error: "ไม่พบคอลัมน์นี้" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  const data = await request.json();

  if (data.isDone !== undefined && typeof data.isDone !== "boolean") {
    return NextResponse.json({ error: "isDone ต้องเป็น true หรือ false" }, { status: 400 });
  }

  try {
    const before = await prisma.column.findUnique({
      where: { id: columnId },
      select: { name: true, isDone: true },
    });

    const column = await prisma.column.update({
      where: { id: columnId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.isDone !== undefined && { isDone: data.isDone }),
      },
    });

    if (before) {
      const changes = [
        data.name !== undefined ? buildChange("name", before.name, column.name) : null,
        data.isDone !== undefined ? buildChange("isDone", String(before.isDone), String(column.isDone)) : null,
      ].filter((c) => c !== null);
      if (changes.length > 0) {
        await logActivity({
          boardId,
          entityType: "COLUMN",
          entityId: column.id,
          entityName: column.name,
          action: "UPDATED",
          actor: gate.user,
          changes,
        });
      }
    }

    return NextResponse.json(column);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ columnId: string }> },
) {
  const { columnId } = await params;

  const boardId = await getBoardIdForColumn(columnId);
  if (!boardId) {
    return NextResponse.json({ error: "ไม่พบคอลัมน์นี้" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  try {
    const deleted = await softDeleteColumn(columnId);
    if (!deleted) {
      return NextResponse.json({ error: "ไม่พบคอลัมน์นี้" }, { status: 404 });
    }

    await logActivity({
      boardId,
      entityType: "COLUMN",
      entityId: deleted.id,
      entityName: deleted.name,
      action: "DELETED",
      actor: gate.user,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
