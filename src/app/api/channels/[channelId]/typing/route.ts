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

  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.typingIndicator.upsert({
    where: { channelId_userId: { channelId, userId: session.user.id } },
    create: { channelId, userId: session.user.id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
