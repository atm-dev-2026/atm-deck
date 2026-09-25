import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBoardIdForTask, requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;

  const boardId = await getBoardIdForTask(taskId);
  if (!boardId) {
    return NextResponse.json({ error: "ไม่พบงานนี้" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId);
  if ("error" in gate) return gate.error;

  try {
    const items = await prisma.activityLog.findMany({
      where: { entityType: "TASK", entityId: taskId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: { select: { id: true, name: true, email: true, image: true } } },
    });

    return NextResponse.json(items);
  } catch (error) {
    return handleRouteError(error);
  }
}
