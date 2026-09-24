import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import { getBoardIdForTaskAttachment, requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { r2Client, R2_BUCKET } from "@/lib/r2";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;

  const boardId = await getBoardIdForTaskAttachment(attachmentId);
  if (!boardId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId);
  if ("error" in gate) return gate.error;

  const attachment = await prisma.taskAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  return NextResponse.redirect(url);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;

  const boardId = await getBoardIdForTaskAttachment(attachmentId);
  if (!boardId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  try {
    await prisma.taskAttachment.delete({ where: { id: attachmentId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
