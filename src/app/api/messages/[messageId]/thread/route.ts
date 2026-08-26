import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { messageInclude, serializeMessage } from "@/lib/chat";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { messageId } = await params;

  const parent = await prisma.message.findUnique({
    where: { id: messageId },
    include: messageInclude,
  });
  if (!parent) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: parent.channelId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
