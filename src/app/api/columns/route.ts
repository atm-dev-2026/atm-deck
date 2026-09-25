import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { logActivity } from "@/lib/activityLog";

export async function POST(request: Request) {
  const { boardId, name } = await request.json();
  if (!boardId || !name) {
    return NextResponse.json(
      { error: "ต้องระบุบอร์ดและชื่อคอลัมน์" },
      { status: 400 },
    );
  }

  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  try {
    const lastColumn = await prisma.column.findFirst({
      where: { boardId, deletedAt: null },
      orderBy: { order: "desc" },
    });

    const column = await prisma.column.create({
      data: {
        boardId,
        name,
        order: lastColumn ? lastColumn.order + 1 : 0,
      },
    });

    await logActivity({
      boardId,
      entityType: "COLUMN",
      entityId: column.id,
      entityName: column.name,
      action: "CREATED",
      actor: gate.user,
    });

    return NextResponse.json(column, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
