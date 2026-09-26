import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

/**
 * Marks the current user's unread notifications read — just those for one task
 * when `{ taskId }` is given, otherwise all of them.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const taskId = typeof body?.taskId === "string" ? body.taskId : undefined;

  const { count } = await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(taskId && { taskId }) },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true, count });
}
