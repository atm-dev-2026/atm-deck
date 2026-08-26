import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBoardIdForColumn, requireBoardAccess } from "@/lib/permissions";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ columnId: string }> },
) {
  const { columnId } = await params;

  const boardId = await getBoardIdForColumn(columnId);
  if (!boardId) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  const data = await request.json();

  const column = await prisma.column.update({
    where: { id: columnId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.order !== undefined && { order: data.order }),
    },
  });

  return NextResponse.json(column);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ columnId: string }> },
) {
  const { columnId } = await params;

  const boardId = await getBoardIdForColumn(columnId);
  if (!boardId) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  await prisma.column.delete({ where: { id: columnId } });
  return NextResponse.json({ ok: true });
}
