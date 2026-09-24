import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { r2Client, R2_BUCKET } from "@/lib/r2";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }
  const userId = session.user.id;
  const { attachmentId } = await params;

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { message: { select: { channelId: true } } },
  });
  if (!attachment) {
    return NextResponse.json({ error: "ไม่พบไฟล์นี้" }, { status: 404 });
  }

  const membership = await prisma.channelMember.findUnique({
    where: {
      channelId_userId: { channelId: attachment.message.channelId, userId },
    },
  });
  if (!membership) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
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
