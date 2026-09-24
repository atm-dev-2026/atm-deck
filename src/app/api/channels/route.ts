import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const [joined, all] = await Promise.all([
    prisma.channel.findMany({
      where: { isDirect: false, members: { some: { userId: session.user.id } } },
      orderBy: { name: "asc" },
    }),
    prisma.channel.findMany({
      where: { isDirect: false },
      orderBy: { name: "asc" },
    }),
  ]);

  const joinedIds = new Set(joined.map((c) => c.id));
  const joinable = all.filter((c) => !joinedIds.has(c.id));

  return NextResponse.json({ joined, joinable });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const { name, topic } = await request.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "ต้องระบุชื่อแชนแนล" }, { status: 400 });
  }

  const channel = await prisma.channel.create({
    data: {
      name,
      topic: topic || null,
      createdById: session.user.id,
      members: { create: [{ userId: session.user.id }] },
    },
  });

  return NextResponse.json(channel, { status: 201 });
}
