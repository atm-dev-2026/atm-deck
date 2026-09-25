import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getChannelForUser } from "@/lib/chat";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const { channelId } = await params;
  const result = await getChannelForUser(channelId, user.id);

  if (!result.ok) {
    return result.status === 404
      ? NextResponse.json({ error: "ไม่พบแชนแนลนี้" }, { status: 404 })
      : NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
  }

  return NextResponse.json(result.channel);
}
