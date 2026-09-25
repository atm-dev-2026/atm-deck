import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import { getBoardIdForTaskAttachment, requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { r2Client, R2_BUCKET } from "@/lib/r2";
import { softDeleteTaskAttachment } from "@/lib/softDelete";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;

  const boardId = await getBoardIdForTaskAttachment(attachmentId);
  if (!boardId) {
    return NextResponse.json({ error: "ไม่พบไฟล์นี้" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId);
  if ("error" in gate) return gate.error;

  const attachment = await prisma.taskAttachment.findUnique({ where: { id: attachmentId, deletedAt: null } });
  if (!attachment) {
    return NextResponse.json({ error: "ไม่พบไฟล์นี้" }, { status: 404 });
  }

  const url = await getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: attachment.key,
      ResponseContentDisposition: `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
      ResponseContentType: attachment.fileType,
    }),
    { expiresIn: 60 },
  );

  console.log("Task attachment downloaded", {
    attachmentId,
    fileName: attachment.fileName,
    boardId,
    userId: gate.user.id,
  });

  return NextResponse.redirect(url);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;

  const boardId = await getBoardIdForTaskAttachment(attachmentId);
  if (!boardId) {
    return NextResponse.json({ error: "ไม่พบไฟล์นี้" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  try {
    const deleted = await softDeleteTaskAttachment(attachmentId);
    if (!deleted) {
      return NextResponse.json({ error: "ไม่พบไฟล์นี้" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
