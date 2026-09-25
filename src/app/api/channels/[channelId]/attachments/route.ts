import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { r2Client, R2_BUCKET, MAX_ATTACHMENT_SIZE } from "@/lib/r2";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }
  const userId = user.id;
  const { channelId } = await params;

  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 });
  }

  const { fileName, fileType, fileSize } = await request.json();

  if (!fileName || typeof fileName !== "string") {
    return NextResponse.json({ error: "ต้องระบุชื่อไฟล์" }, { status: 400 });
  }
  if (!fileType || typeof fileType !== "string") {
    return NextResponse.json({ error: "ต้องระบุประเภทไฟล์" }, { status: 400 });
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_ATTACHMENT_SIZE) {
    return NextResponse.json(
      { error: `File must be under ${MAX_ATTACHMENT_SIZE / (1024 * 1024)}MB` },
      { status: 400 },
    );
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  const key = `chat/${channelId}/${randomUUID()}-${safeName}`;

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
