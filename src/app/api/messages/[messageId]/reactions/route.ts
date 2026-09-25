import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { messageInclude, serializeMessage } from "@/lib/chat";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const { messageId } = await params;
  const { emoji } = await request.json();
  if (!emoji || typeof emoji !== "string") {
    return NextResponse.json({ error: "ต้องระบุอีโมจิ" }, { status: 400 });
  }

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) {
    return NextResponse.json({ error: "ไม่พบข้อความนี้" }, { status: 404 });
  }

  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: message.channelId, userId: user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 });
  }

  const existing = await prisma.reaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId: user.id, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({ data: { messageId, userId: user.id, emoji } });
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {},
    include: messageInclude,
  });

  return NextResponse.json(serializeMessage(updated, user.id));
}
