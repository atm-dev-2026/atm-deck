import type { DepartmentRole, GlobalRole } from "@/generated/prisma/client";
import type { InviteStatus } from "@/lib/roles";

export type DepartmentOption = { id: string; name: string };

export type MemberRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  globalRole: GlobalRole;
  /** The user's single role; null = blocked until assigned one. */
  membership: { departmentId: string; role: DepartmentRole; joinedAt: string } | null;
};

type InvitePerson = { id: string; name: string | null; email: string | null };

export type InviteRow = {
  id: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  status: InviteStatus;
  department: DepartmentOption;
  createdBy: InvitePerson;
  acceptedBy: InvitePerson | null;
};

export function personLabel(person: { name: string | null; email: string | null }): string {
  return person.name ?? person.email ?? "?";
}
