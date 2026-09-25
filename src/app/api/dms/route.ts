import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }
  const userId = user.id;

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
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const { userId } = await request.json();
  if (!userId || typeof userId !== "string" || userId === user.id) {
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
        { members: { some: { userId: user.id } } },
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
      createdById: user.id,
      members: { create: [{ userId: user.id }, { userId }] },
    },
  });

  return NextResponse.json(channel, { status: 201 });
}
