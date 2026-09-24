import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireGlobalAdmin } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { Prisma, type GlobalRole } from "@/generated/prisma/client";

const GLOBAL_ROLES: GlobalRole[] = ["ADMIN", "USER"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const gate = await requireGlobalAdmin();
  if ("error" in gate) return gate.error;

  const { userId } = await params;
  if (userId === gate.user.id) {
    return NextResponse.json({ error: "เปลี่ยนบทบาทของตัวเองไม่ได้" }, { status: 400 });
  }

  const { globalRole } = await request.json();
  if (!GLOBAL_ROLES.includes(globalRole)) {
    return NextResponse.json({ error: "บทบาทต้องเป็นแอดมินหรือผู้ใช้" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { globalRole },
      select: { id: true, name: true, email: true, image: true, globalRole: true },
    });
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "ไม่พบผู้ใช้นี้" }, { status: 404 });
    }
    return handleRouteError(error);
  }
}
