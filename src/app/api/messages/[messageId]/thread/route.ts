import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { messageInclude, serializeMessage } from "@/lib/chat";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }
  const userId = user.id;

  const { messageId } = await params;

  const parent = await prisma.message.findUnique({
    where: { id: messageId },
    include: messageInclude,
  });
  if (!parent) {
    return NextResponse.json({ error: "ไม่พบข้อความนี้" }, { status: 404 });
  }

  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: parent.channelId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
  }

  const replies = await prisma.message.findMany({
    where: { parentId: messageId },
    orderBy: { createdAt: "asc" },
    include: messageInclude,
  });

  return NextResponse.json({
    parent: serializeMessage(parent, userId),
    replies: replies.map((m) => serializeMessage(m, userId)),
  });
}
