import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";

export async function POST(request: Request) {
  const { boardId, name } = await request.json();
  if (!boardId || !name) {
    return NextResponse.json(
      { error: "boardId and name are required" },
      { status: 400 },
    );
  }

  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  try {
    const lastColumn = await prisma.column.findFirst({
      where: { boardId },
      orderBy: { order: "desc" },
    });

    const column = await prisma.column.create({
      data: {
        boardId,
        name,
        order: lastColumn ? lastColumn.order + 1 : 0,
      },
    });

    return NextResponse.json(column, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
