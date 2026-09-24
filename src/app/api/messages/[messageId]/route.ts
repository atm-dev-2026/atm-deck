import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { messageInclude, serializeMessage } from "@/lib/chat";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const { messageId } = await params;
  const { body } = await request.json();
  if (!body || typeof body !== "string" || !body.trim()) {
    return NextResponse.json({ error: "ต้องระบุข้อความ" }, { status: 400 });
  }

  const existing = await prisma.message.findUnique({ where: { id: messageId } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบข้อความนี้" }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 });
  }

  const message = await prisma.message.update({
    where: { id: messageId },
    data: { body: body.trim(), editedAt: new Date() },
    include: messageInclude,
  });

  return NextResponse.json(serializeMessage(message, session.user.id));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const { messageId } = await params;

  const existing = await prisma.message.findUnique({ where: { id: messageId } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบข้อความนี้" }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ทำรายการนี้" }, { status: 403 });
  }

  await prisma.message.delete({ where: { id: messageId } });

  if (existing.parentId) {
    await prisma.message.update({ where: { id: existing.parentId }, data: {} });
  }

  return NextResponse.json({ ok: true });
}
