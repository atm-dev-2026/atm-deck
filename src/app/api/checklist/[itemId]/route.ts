import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBoardIdForChecklistItem, requireBoardAccess } from "@/lib/permissions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;

  const boardId = await getBoardIdForChecklistItem(itemId);
  if (!boardId) {
    return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  const data = await request.json();

  const item = await prisma.checklistItem.update({
    where: { id: itemId },
    data: {
      ...(data.text !== undefined && { text: data.text }),
      ...(data.done !== undefined && { done: data.done }),
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;

  const boardId = await getBoardIdForChecklistItem(itemId);
  if (!boardId) {
    return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  await prisma.checklistItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
