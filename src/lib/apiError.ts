import { NextResponse } from "next/server";

export function handleRouteError(error: unknown) {
  console.error(error);
  return NextResponse.json({ error: "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง" }, { status: 500 });
}
