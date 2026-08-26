import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBoardAccess } from "@/lib/permissions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await params;

  const gate = await requireBoardAccess(boardId);
  if ("error" in gate) return gate.error;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      labels: { orderBy: { name: "asc" } },
      columns: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            orderBy: { order: "asc" },
            include: {
              labels: true,
              checklist: { orderBy: { order: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  return NextResponse.json(board);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await params;

  const gate = await requireBoardAccess(boardId, { minDelete: true });
  if ("error" in gate) return gate.error;

  await prisma.board.delete({ where: { id: boardId } });
  return NextResponse.json({ ok: true });
}
