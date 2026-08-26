import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channelId } = await params;

  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel || channel.isDirect) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  await prisma.channelMember.upsert({
    where: { channelId_userId: { channelId, userId: session.user.id } },
    create: { channelId, userId: session.user.id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
