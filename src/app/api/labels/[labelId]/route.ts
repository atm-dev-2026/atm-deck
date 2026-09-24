import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBoardIdForLabel, requireBoardAccess } from "@/lib/permissions";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ labelId: string }> },
) {
  const { labelId } = await params;

  const boardId = await getBoardIdForLabel(labelId);
  if (!boardId) {
    return NextResponse.json({ error: "ไม่พบป้ายกำกับนี้" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  await prisma.label.delete({ where: { id: labelId } });
  return NextResponse.json({ ok: true });
}
