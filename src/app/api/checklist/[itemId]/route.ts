import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBoardIdForChecklistItem, requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { softDeleteChecklistItem } from "@/lib/softDelete";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;

  const boardId = await getBoardIdForChecklistItem(itemId);
  if (!boardId) {
    return NextResponse.json({ error: "ไม่พบรายการเช็กลิสต์นี้" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  const data = await request.json();

  try {
    const item = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        ...(data.text !== undefined && { text: data.text }),
        ...(data.done !== undefined && { done: data.done }),
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;

  const boardId = await getBoardIdForChecklistItem(itemId);
  if (!boardId) {
    return NextResponse.json({ error: "ไม่พบรายการเช็กลิสต์นี้" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  try {
    const deleted = await softDeleteChecklistItem(itemId);
    if (!deleted) {
      return NextResponse.json({ error: "ไม่พบรายการเช็กลิสต์นี้" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
