import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    // Role-less users can't sign in to the app, so don't offer them as DM targets.
    where: {
      id: { not: user.id },
      OR: [{ globalRole: "ADMIN" }, { departmentMemberships: { some: {} } }],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json(users);
}
