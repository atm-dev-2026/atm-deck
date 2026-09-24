import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });

  if (!channel) {
    return NextResponse.json({ error: "ไม่พบแชนแนลนี้" }, { status: 404 });
  }

  const isMember = channel.members.some((m) => m.userId === userId);
  if (channel.isDirect && !isMember) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
  }

  return NextResponse.json({ ...channel, isMember });
}
