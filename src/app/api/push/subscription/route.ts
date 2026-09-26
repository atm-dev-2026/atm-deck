import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { readSessionToken } from "@/lib/session-cookie";
import { toLocale } from "@/lib/push";
import { handleRouteError } from "@/lib/apiError";

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isKey(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256;
}

/**
 * Registers this browser's push endpoint for the current user, under the
 * current login session. Re-registering an endpoint (same browser, possibly
 * after someone else signed in on it) moves it to whoever is signed in now.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const token = readSessionToken(request);
  const session = token
    ? await prisma.session.findUnique({ where: { sessionToken: token }, select: { id: true, userId: true } })
    : null;
  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (!isHttpsUrl(endpoint) || !isKey(p256dh) || !isKey(auth)) {
    return NextResponse.json({ error: "ข้อมูลการแจ้งเตือนไม่ถูกต้อง" }, { status: 400 });
  }
  const locale = toLocale(body?.locale);

  try {
    const data = { userId: user.id, sessionId: session.id, p256dh, auth, locale };
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { endpoint, ...data },
      update: data,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** Forgets this browser's endpoint (only if it belongs to the current user). */
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "ข้อมูลการแจ้งเตือนไม่ถูกต้อง" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return NextResponse.json({ ok: true });
}
