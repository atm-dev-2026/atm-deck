import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { id: { not: session.user.id } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json(users);
}
