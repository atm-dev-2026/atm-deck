import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getUnreadSummary } from "@/lib/notifications";
import { handleRouteError } from "@/lib/apiError";

/**
 * Unread chat counts per channel plus unread task assignments, for badges.
 * `asOf` is the server time the counts were taken at — the client opens
 * /api/notifications/stream from it so nothing between the two is missed.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  try {
    const asOf = new Date().toISOString();
    return NextResponse.json({ ...(await getUnreadSummary(user)), asOf });
  } catch (error) {
    return handleRouteError(error);
  }
}
