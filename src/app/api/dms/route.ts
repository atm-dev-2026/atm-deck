import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }
  const userId = session.user.id;

  const channels = await prisma.channel.findMany({
    where: { isDirect: true, members: { some: { userId } } },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });

  const dms = channels.map((channel) => {
    const other = channel.members.find((m) => m.userId !== userId)?.user ?? null;
    return { id: channel.id, createdAt: channel.createdAt, other };
  });

  return NextResponse.json(dms);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const { userId } = await request.json();
  if (!userId || typeof userId !== "string" || userId === session.user.id) {
    return NextResponse.json({ error: "ต้องระบุผู้ใช้ให้ถูกต้อง" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้นี้" }, { status: 404 });
  }

  const existing = await prisma.channel.findFirst({
    where: {
      isDirect: true,
      AND: [
        { members: { some: { userId: session.user.id } } },
        { members: { some: { userId } } },
      ],
    },
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  const channel = await prisma.channel.create({
    data: {
      isDirect: true,
      createdById: session.user.id,
      members: { create: [{ userId: session.user.id }, { userId }] },
    },
  });

  return NextResponse.json(channel, { status: 201 });
}
