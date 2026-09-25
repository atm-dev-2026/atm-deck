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
 * Gives a user exactly one role (department), replacing whatever they had.
 * Must run inside a transaction so the user is never briefly role-less.
 */
export async function assignRole(
  tx: Prisma.TransactionClient,
  userId: string,
  departmentId: string,
  role: DepartmentRole = "MEMBER",
) {
  await tx.departmentMember.deleteMany({ where: { userId } });
  return tx.departmentMember.create({ data: { userId, departmentId, role } });
}

export type InviteStatus = "active" | "expired" | "accepted";

export function inviteStatus(invite: { expiresAt: Date; acceptedAt: Date | null }, now = new Date()): InviteStatus {
  if (invite.acceptedAt) return "accepted";
  return invite.expiresAt <= now ? "expired" : "active";
}
