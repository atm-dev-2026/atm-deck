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
    return NextResponse.json({ error: "You can't change your own role" }, { status: 400 });
  }

  const { globalRole } = await request.json();
  if (!GLOBAL_ROLES.includes(globalRole)) {
    return NextResponse.json({ error: "globalRole must be ADMIN or USER" }, { status: 400 });
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return handleRouteError(error);
  }
}
