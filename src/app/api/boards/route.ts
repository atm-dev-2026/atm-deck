import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { validateBoardVisibility } from "@/lib/permissions";
import { getBoardsForUser } from "@/lib/boards";
import { handleRouteError } from "@/lib/apiError";
import { logActivity } from "@/lib/activityLog";
import type { BoardVisibility } from "@/generated/prisma/client";

const VISIBILITY_TYPES: BoardVisibility[] = ["GLOBAL", "DEPARTMENT", "PERSONAL"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const boards = await getBoardsForUser(user);
  return NextResponse.json(boards);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const { name, visibilityType = "PERSONAL", departmentId } = await request.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "กรุณาระบุชื่อบอร์ด" }, { status: 400 });
  }
  if (!VISIBILITY_TYPES.includes(visibilityType)) {
    return NextResponse.json({ error: "ประเภทการมองเห็นไม่ถูกต้อง" }, { status: 400 });
  }

  const visibility = validateBoardVisibility(user, visibilityType, departmentId);
  if (!visibility.ok) {
    return NextResponse.json({ error: visibility.error }, { status: visibility.status });
  }

  try {
    const board = await prisma.board.create({
      data: {
        name,
        ownerId: user.id,
        visibilityType,
        departmentId: visibility.departmentId,
        columns: {
          create: [
            { name: "To Do", order: 0 },
            { name: "In Progress", order: 1 },
            { name: "Done", order: 2 },
          ],
        },
      },
    });

    await logActivity({
      boardId: board.id,
      entityType: "BOARD",
      entityId: board.id,
      entityName: board.name,
      action: "CREATED",
      actor: user,
    });

    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
