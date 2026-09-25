import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { handleRouteError } from "@/lib/apiError";
import { setOwnGodMode } from "@/lib/roles";

/**
 * Switches the caller's own god mode on/off — deliberately takes no user id:
 * nobody, god mode or not, can switch it for someone else. Every change is logged.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }
  if (!user.canUseGodMode) {
    return NextResponse.json({ error: "บทบาทของคุณใช้โหมด God ไม่ได้" }, { status: 403 });
  }

  const { enabled } = await request.json();
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "ต้องระบุว่าจะเปิดหรือปิด" }, { status: 400 });
  }

  try {
    const changed = await prisma.$transaction((tx) => setOwnGodMode(tx, user.id, enabled));
    return NextResponse.json({ godMode: enabled, changed });
  } catch (error) {
    return handleRouteError(error);
  }
}
