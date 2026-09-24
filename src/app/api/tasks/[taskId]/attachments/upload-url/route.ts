import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getBoardIdForTask, requireBoardAccess } from "@/lib/permissions";
import { r2Client, R2_BUCKET, MAX_ATTACHMENT_SIZE } from "@/lib/r2";

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

  const { fileName, fileType, fileSize } = await request.json();

  if (!fileName || typeof fileName !== "string") {
    return NextResponse.json({ error: "fileName is required" }, { status: 400 });
  }
  if (!fileType || typeof fileType !== "string") {
    return NextResponse.json({ error: "fileType is required" }, { status: 400 });
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_ATTACHMENT_SIZE) {
    return NextResponse.json(
      { error: `File must be under ${MAX_ATTACHMENT_SIZE / (1024 * 1024)}MB` },
      { status: 400 },
    );
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  const key = `tasks/${taskId}/${randomUUID()}-${safeName}`;

  const uploadUrl = await getSignedUrl(
    r2Client,
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: fileType,
      ContentLength: fileSize,
    }),
    { expiresIn: 300 },
  );

  return NextResponse.json({ key, uploadUrl });
}
