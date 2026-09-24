import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import type { BoardRole } from "@/generated/prisma/client";

const BOARD_ROLES: BoardRole[] = ["READ_ONLY", "CAN_EDIT"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await params;

  const gate = await requireBoardAccess(boardId, { minManageMembers: true });
  if ("error" in gate) return gate.error;

  const { userId, role } = await request.json();
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "กรุณาระบุผู้ใช้" }, { status: 400 });
  }
  if (!BOARD_ROLES.includes(role)) {
    return NextResponse.json({ error: "สิทธิ์ไม่ถูกต้อง" }, { status: 400 });
  }
  if (userId === gate.board.ownerId) {
    return NextResponse.json(
      { error: "เจ้าของบอร์ดมีสิทธิ์เข้าถึงเต็มรูปแบบอยู่แล้ว" },
      { status: 400 },
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้นี้" }, { status: 404 });
  }

  try {
    const member = await prisma.boardMember.upsert({
      where: { boardId_userId: { boardId, userId } },
      create: { boardId, userId, role },
      update: { role },
    });

    return NextResponse.json({ ...member, user: targetUser }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
