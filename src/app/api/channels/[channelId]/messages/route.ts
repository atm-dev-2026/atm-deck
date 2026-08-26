import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { messageInclude, serializeMessage } from "@/lib/chat";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { channelId } = await params;

  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { channelId } = await params;
  const { body, parentId } = await request.json();

  if (!body || typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parentId) {
    const parent = await prisma.message.findUnique({ where: { id: parentId } });
    if (!parent || parent.channelId !== channelId) {
      return NextResponse.json({ error: "Invalid parentId" }, { status: 400 });
    }
  }

  const message = await prisma.message.create({
    data: {
      channelId,
      userId,
      parentId: parentId || null,
      body: body.trim(),
    },
    include: messageInclude,
  });

  if (parentId) {
    await prisma.message.update({ where: { id: parentId }, data: {} });
  }

  return NextResponse.json(serializeMessage(message, userId), { status: 201 });
}
