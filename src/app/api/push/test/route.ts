import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { deliver, pushConfigured } from "@/lib/push";
import { translatorFor } from "@/lib/notifications";

/** Sends a test push to the calling browser's own subscription. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }
  if (!pushConfigured) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Web Push บนเซิร์ฟเวอร์" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "ข้อมูลการแจ้งเตือนไม่ถูกต้อง" }, { status: 400 });
  }

  const subscription = await prisma.pushSubscription.findFirst({
    where: { endpoint, userId: user.id },
  });
  if (!subscription) {
    return NextResponse.json({ error: "ไม่พบการสมัครรับการแจ้งเตือนของอุปกรณ์นี้" }, { status: 404 });
  }

  const { sent } = await deliver([subscription], (locale) => {
    const t = translatorFor(locale, "Notifications.settings");
    return { title: t("testTitle"), body: t("testBody"), url: "/settings", tag: "test" };
  });
  if (sent === 0) {
    return NextResponse.json({ error: "ส่งการแจ้งเตือนไม่สำเร็จ" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
