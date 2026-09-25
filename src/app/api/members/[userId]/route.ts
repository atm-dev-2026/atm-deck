import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserManager } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { assignRole } from "@/lib/roles";
import type { DepartmentRole } from "@/generated/prisma/client";

const DEPARTMENT_ROLES: DepartmentRole[] = ["MANAGER", "MEMBER"];

/** Shared guards: never yourself (no self-lockout), and only admins may touch admins. */
async function gateTarget(userId: string) {
  const gate = await requireUserManager();
  if ("error" in gate) return gate;

  if (userId === gate.user.id) {
    return { error: NextResponse.json({ error: "เปลี่ยนบทบาทของตัวเองไม่ได้" }, { status: 400 }) } as const;
  }
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { globalRole: true } });
  if (!target) {
    return { error: NextResponse.json({ error: "ไม่พบผู้ใช้นี้" }, { status: 404 }) } as const;
  }
  if (target.globalRole === "ADMIN" && gate.user.globalRole !== "ADMIN") {
    return { error: NextResponse.json({ error: "ไม่มีสิทธิ์แก้ไขผู้ดูแลระบบ" }, { status: 403 }) } as const;
  }
  return gate;
}

/** Sets the user's single role (department), replacing any previous one. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const gate = await gateTarget(userId);
  if ("error" in gate) return gate.error;

  const { departmentId, departmentRole = "MEMBER" } = await request.json();
  if (!departmentId || typeof departmentId !== "string") {
    return NextResponse.json({ error: "กรุณาเลือกบทบาท" }, { status: 400 });
  }
  if (!DEPARTMENT_ROLES.includes(departmentRole)) {
    return NextResponse.json({ error: "บทบาทต้องเป็นหัวหน้าแผนกหรือสมาชิก" }, { status: 400 });
  }

  try {
    const department = await prisma.department.findUnique({ where: { id: departmentId }, select: { id: true } });
    if (!department) {
      return NextResponse.json({ error: "ไม่พบบทบาทนี้" }, { status: 404 });
    }
    const membership = await prisma.$transaction((tx) => assignRole(tx, userId, departmentId, departmentRole));
    return NextResponse.json({
      departmentId: membership.departmentId,
      role: membership.role,
      joinedAt: membership.joinedAt,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/** Removes the user's role, which blocks them from the app until they get a new one. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const gate = await gateTarget(userId);
  if ("error" in gate) return gate.error;

  try {
    await prisma.departmentMember.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
