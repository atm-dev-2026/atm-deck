import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { Prisma, type BoardRole } from "@/generated/prisma/client";

const BOARD_ROLES: BoardRole[] = ["READ_ONLY", "CAN_EDIT"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string; userId: string }> },
) {
  const { boardId, userId } = await params;

  const gate = await requireBoardAccess(boardId, { minManageMembers: true });
  if ("error" in gate) return gate.error;

  if (userId === gate.board.ownerId) {
    return NextResponse.json({ error: "The board owner already has full access" }, { status: 400 });
  }

  const { role } = await request.json();
  if (!BOARD_ROLES.includes(role)) {
    return NextResponse.json({ error: "role must be READ_ONLY or CAN_EDIT" }, { status: 400 });
  }

  try {
    const member = await prisma.boardMember.update({
      where: { boardId_userId: { boardId, userId } },
      data: { role },
    });
    return NextResponse.json(member);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ boardId: string; userId: string }> },
) {
  const { boardId, userId } = await params;

  const gate = await requireBoardAccess(boardId, { minManageMembers: true });
  if ("error" in gate) return gate.error;

  if (userId === gate.board.ownerId) {
    return NextResponse.json({ error: "The board owner can't be removed" }, { status: 400 });
  }

  try {
    await prisma.boardMember.delete({ where: { boardId_userId: { boardId, userId } } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    return handleRouteError(error);
  }
}
