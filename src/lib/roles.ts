import { createHash, randomBytes } from "node:crypto";
import type { DepartmentRole, Prisma } from "@/generated/prisma/client";

export const INVITE_TTL_MS = 10 * 60_000;

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Invites are looked up by this hash, so a leaked DB row can't be turned back into a working link. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Switches a user's *own* god mode and records it in GodModeLog. Only ever
 * called on behalf of the user themselves (POST /api/god-mode) — nobody can
 * flip someone else's switch. No-op (and no log row) when the flag already
 * has that value. Returns whether it changed.
 */
export async function setOwnGodMode(tx: Prisma.TransactionClient, userId: string, enabled: boolean): Promise<boolean> {
  const { count } = await tx.user.updateMany({
    where: { id: userId, godMode: !enabled },
    data: { godMode: enabled },
  });
  if (count === 0) return false;
  await tx.godModeLog.create({ data: { userId, enabled } });
  return true;
}

/**
 * Gives a user exactly one role (department), replacing whatever they had.
 * Never touches their god mode switch: if the new role doesn't allow god
 * mode, it simply stops taking effect. Must run inside a transaction so the
 * user is never briefly role-less.
 */
export async function assignRole(
  tx: Prisma.TransactionClient,
  userId: string,
  departmentId: string,
  role: DepartmentRole = "MEMBER",
) {
  await tx.departmentMember.deleteMany({ where: { userId } });
  return tx.departmentMember.create({
    data: { userId, departmentId, role },
    include: { department: { select: { canUseGodMode: true } } },
  });
}

export type InviteStatus = "active" | "expired" | "accepted";

export function inviteStatus(invite: { expiresAt: Date; acceptedAt: Date | null }, now = new Date()): InviteStatus {
  if (invite.acceptedAt) return "accepted";
  return invite.expiresAt <= now ? "expired" : "active";
}
