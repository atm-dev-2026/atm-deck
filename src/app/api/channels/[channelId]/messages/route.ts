import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { messageInclude, serializeMessage } from "@/lib/chat";
import { broadcast } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }
  const userId = session.user.id;

  const { channelId } = await params;

  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { channelId, parentId: null },
    orderBy: { createdAt: "asc" },
    include: messageInclude,
  });

  return NextResponse.json(messages.map((m) => serializeMessage(m, userId)));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }
  const userId = session.user.id;

  const { channelId } = await params;
  const { body, parentId, attachments } = await request.json();

  const text = typeof body === "string" ? body.trim() : "";
  const attachmentInputs = Array.isArray(attachments) ? attachments : [];

  if (!text && attachmentInputs.length === 0) {
    return NextResponse.json(
      { error: "ต้องมีข้อความหรือไฟล์แนบอย่างน้อยหนึ่งอย่าง" },
      { status: 400 },
    );
  }

  for (const a of attachmentInputs) {
    if (
      !a ||
      typeof a.key !== "string" ||
      typeof a.fileName !== "string" ||
      typeof a.fileType !== "string" ||
      typeof a.fileSize !== "number" ||
      !a.key.startsWith(`chat/${channelId}/`)
    ) {
      return NextResponse.json({ error: "ไฟล์แนบไม่ถูกต้อง" }, { status: 400 });
    }
  }

  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 });
  }

  if (parentId) {
    const parent = await prisma.message.findUnique({ where: { id: parentId } });
    if (!parent || parent.channelId !== channelId) {
      return NextResponse.json({ error: "รหัสข้อความต้นเรื่องไม่ถูกต้อง" }, { status: 400 });
    }
  }

  const message = await prisma.message.create({
    data: {
      channelId,
      userId,
      parentId: parentId || null,
      body: text,
      attachments: attachmentInputs.length
        ? {
            create: attachmentInputs.map((a) => ({
              key: a.key,
              fileName: a.fileName,
              fileType: a.fileType,
              fileSize: a.fileSize,
            })),
          }
        : undefined,
    },
    include: messageInclude,
  });

  if (parentId) {
    await prisma.message.update({ where: { id: parentId }, data: {} });
  }

  const serialized = serializeMessage(message, userId);
  await broadcast(`channel:${channelId}`, "message-created", serialized);

  return NextResponse.json(serialized, { status: 201 });
}
