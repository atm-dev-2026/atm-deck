import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserManager } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { INVITE_TTL_MS, generateInviteToken, hashInviteToken } from "@/lib/roles";

export async function POST(request: Request) {
  const gate = await requireUserManager();
  if ("error" in gate) return gate.error;

  const { departmentId } = await request.json();
  if (!departmentId || typeof departmentId !== "string") {
    return NextResponse.json({ error: "กรุณาเลือกบทบาทก่อนสร้างลิงก์" }, { status: 400 });
  }

  try {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, name: true },
    });
    if (!department) {
      return NextResponse.json({ error: "ไม่พบบทบาทนี้" }, { status: 404 });
    }

    const token = generateInviteToken();
    const invite = await prisma.appInvite.create({
      data: {
        tokenHash: hashInviteToken(token),
        departmentId,
        createdById: gate.user.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        acceptedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // The raw token is returned exactly once; only its hash is stored.
    return NextResponse.json({ ...invite, token }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
