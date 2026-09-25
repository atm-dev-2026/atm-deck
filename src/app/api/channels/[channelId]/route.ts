import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getChannelForUser } from "@/lib/chat";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const { channelId } = await params;
  const result = await getChannelForUser(channelId, session.user.id);

  if (!result.ok) {
    return result.status === 404
      ? NextResponse.json({ error: "ไม่พบแชนแนลนี้" }, { status: 404 })
      : NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
  }

  return NextResponse.json(result.channel);
}
