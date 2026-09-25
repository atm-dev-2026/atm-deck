import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireGodMode } from "@/lib/permissions";
import type { DepartmentRole } from "@/generated/prisma/client";

const DEPARTMENT_ROLES: DepartmentRole[] = ["MANAGER", "MEMBER"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ departmentId: string; userId: string }> },
) {
  const gate = await requireGodMode();
  if ("error" in gate) return gate.error;

  const { departmentId, userId } = await params;
  const { role } = await request.json();
  if (!DEPARTMENT_ROLES.includes(role)) {
    return NextResponse.json({ error: "บทบาทต้องเป็นหัวหน้าแผนกหรือสมาชิก" }, { status: 400 });
  }

  const member = await prisma.departmentMember.update({
    where: { departmentId_userId: { departmentId, userId } },
    data: { role },
  });

  return NextResponse.json(member);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ departmentId: string; userId: string }> },
) {
  const gate = await requireGodMode();
  if ("error" in gate) return gate.error;

  const { departmentId, userId } = await params;
  await prisma.departmentMember.delete({
    where: { departmentId_userId: { departmentId, userId } },
  });

  return NextResponse.json({ ok: true });
}
