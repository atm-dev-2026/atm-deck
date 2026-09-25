import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { requireUserManager } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(departments);
}

export async function POST(request: Request) {
  const gate = await requireUserManager();
  if ("error" in gate) return gate.error;

  const { name } = await request.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "กรุณาระบุชื่อแผนก" }, { status: 400 });
  }

  const department = await prisma.department.create({ data: { name: name.trim() } });
  return NextResponse.json(department, { status: 201 });
}
