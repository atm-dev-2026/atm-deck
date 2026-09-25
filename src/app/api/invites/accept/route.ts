import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hasRole } from "@/lib/current-user";
import { handleRouteError } from "@/lib/apiError";
import { assignRole, hashInviteToken } from "@/lib/roles";

class InviteUnavailableError extends Error {}

/** The one API a signed-in but role-less user may call: redeem an invite for a role. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }
  // An existing member opening a link would otherwise burn it for its intended recipient.
  if (hasRole(user)) {
    return NextResponse.json({ error: "บัญชีนี้มีบทบาทอยู่แล้ว" }, { status: 409 });
  }

  const { token } = await request.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "ลิงก์เชิญไม่ถูกต้อง" }, { status: 400 });
  }
  const tokenHash = hashInviteToken(token);

  try {
    const department = await prisma.$transaction(async (tx) => {
      const now = new Date();
      // Conditional update = atomic claim: of two concurrent accepts, only one matches.
      const claimed = await tx.appInvite.updateMany({
        where: { tokenHash, acceptedAt: null, expiresAt: { gt: now } },
        data: { acceptedById: user.id, acceptedAt: now },
      });
      if (claimed.count === 0) throw new InviteUnavailableError();

      const invite = await tx.appInvite.findUniqueOrThrow({
        where: { tokenHash },
        select: { departmentId: true, department: { select: { id: true, name: true } } },
      });
      await assignRole(tx, user.id, invite.departmentId);
      return invite.department;
    });

    return NextResponse.json({ department });
  } catch (error) {
    if (error instanceof InviteUnavailableError) {
      const invite = await prisma.appInvite.findUnique({ where: { tokenHash }, select: { id: true } });
      return invite
        ? NextResponse.json({ error: "ลิงก์เชิญนี้หมดอายุหรือถูกใช้ไปแล้ว" }, { status: 410 })
        : NextResponse.json({ error: "ไม่พบลิงก์เชิญนี้" }, { status: 404 });
    }
    return handleRouteError(error);
  }
}
