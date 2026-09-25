import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBoardIdForTask, requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;

  const boardId = await getBoardIdForTask(taskId);
  if (!boardId) {
    return NextResponse.json({ error: "ไม่พบงานนี้" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  const { text } = await request.json();
  if (!text) {
    return NextResponse.json({ error: "ต้องระบุข้อความรายการ" }, { status: 400 });
  }

  try {
    const lastItem = await prisma.checklistItem.findFirst({
      where: { taskId, deletedAt: null },
      orderBy: { order: "desc" },
    });

    const item = await prisma.checklistItem.create({
      data: {
        taskId,
        text,
        order: lastItem ? lastItem.order + 1 : 0,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
