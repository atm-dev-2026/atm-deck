import type { DepartmentRole } from "@/generated/prisma/client";
import type { InviteStatus } from "@/lib/roles";

export type DepartmentOption = { id: string; name: string };

export type MemberRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  /** God mode currently in effect (switched on and still allowed by their role). */
  godMode: boolean;
  /** The user's single role; null = blocked until assigned one. */
  membership: { departmentId: string; role: DepartmentRole; joinedAt: string } | null;
};

type Person = { id: string; name: string | null; email: string | null };

export type InviteRow = {
  id: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  status: InviteStatus;
  department: DepartmentOption;
  createdBy: Person;
  acceptedBy: Person | null;
};

export type GodModeLogRow = {
  id: string;
  enabled: boolean;
  createdAt: string;
  user: Person & { image: string | null };
};

export function personLabel(person: { name: string | null; email: string | null }): string {
  return person.name ?? person.email ?? "?";
}
