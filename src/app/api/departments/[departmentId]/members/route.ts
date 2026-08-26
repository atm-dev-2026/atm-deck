import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { requireGlobalAdmin } from "@/lib/permissions";
import { Prisma, type DepartmentRole } from "@/generated/prisma/client";

const DEPARTMENT_ROLES: DepartmentRole[] = ["MANAGER", "MEMBER"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ departmentId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { departmentId } = await params;
  const members = await prisma.departmentMember.findMany({
    where: { departmentId },
    orderBy: { joinedAt: "asc" },
    select: {
      role: true,
      joinedAt: true,
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return NextResponse.json(members);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ departmentId: string }> },
) {
  const gate = await requireGlobalAdmin();
  if ("error" in gate) return gate.error;

  const { departmentId } = await params;
  const { userId, role = "MEMBER" } = await request.json();
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!DEPARTMENT_ROLES.includes(role)) {
    return NextResponse.json({ error: "role must be MANAGER or MEMBER" }, { status: 400 });
  }

  try {
    const member = await prisma.departmentMember.create({
      data: { departmentId, userId, role },
    });
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "User is already a member of this department" }, { status: 409 });
    }
    throw error;
  }
}
