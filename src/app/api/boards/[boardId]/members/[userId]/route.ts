import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { buildChange, logActivity } from "@/lib/activityLog";
import { removeBoardMember } from "@/lib/softDelete";
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
    return NextResponse.json({ error: "เจ้าของบอร์ดมีสิทธิ์เข้าถึงเต็มรูปแบบอยู่แล้ว" }, { status: 400 });
  }

  const { role } = await request.json();
  if (!BOARD_ROLES.includes(role)) {
    return NextResponse.json({ error: "สิทธิ์ไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const before = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId }, deletedAt: null },
      select: { role: true, user: { select: { name: true, email: true } } },
    });
    if (!before) {
      return NextResponse.json({ error: "ไม่พบสมาชิกนี้" }, { status: 404 });
    }

    const member = await prisma.boardMember.update({
      where: { boardId_userId: { boardId, userId } },
      data: { role },
    });

    const change = buildChange("role", before.role, role);
    if (change) {
      await logActivity({
        boardId,
        entityType: "BOARD_MEMBER",
        entityId: userId,
        entityName: before.user.name ?? before.user.email ?? "?",
        action: "ROLE_CHANGED",
        actor: gate.user,
        changes: [change],
      });
    }

    return NextResponse.json(member);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบสมาชิกนี้" }, { status: 404 });
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
    return NextResponse.json({ error: "นำเจ้าของบอร์ดออกไม่ได้" }, { status: 400 });
  }

  try {
    const removed = await removeBoardMember(boardId, userId);
    if (!removed) {
      return NextResponse.json({ error: "ไม่พบสมาชิกนี้" }, { status: 404 });
    }

    await logActivity({
      boardId,
      entityType: "BOARD_MEMBER",
      entityId: userId,
      entityName: removed.user.name ?? removed.user.email ?? "?",
      action: "REMOVED",
      actor: gate.user,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
