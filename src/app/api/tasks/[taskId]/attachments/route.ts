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
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  const { key, fileName, fileType, fileSize } = await request.json();

  if (
    typeof key !== "string" ||
    typeof fileName !== "string" ||
    typeof fileType !== "string" ||
    typeof fileSize !== "number" ||
    !key.startsWith(`tasks/${taskId}/`)
  ) {
    return NextResponse.json({ error: "Invalid attachment" }, { status: 400 });
  }

  try {
    const attachment = await prisma.taskAttachment.create({
      data: { taskId, key, fileName, fileType, fileSize },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
