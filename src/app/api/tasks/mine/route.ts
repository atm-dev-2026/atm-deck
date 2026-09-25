import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getMyTasks } from "@/lib/tasks";
import { handleRouteError } from "@/lib/apiError";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getMyTasks(user));
  } catch (error) {
    return handleRouteError(error);
  }
}
