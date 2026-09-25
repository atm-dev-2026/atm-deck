import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { GlobalRole } from "@/generated/prisma/client";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  globalRole: GlobalRole;
  departmentMemberships: { departmentId: string; role: "MANAGER" | "MEMBER" }[];
  /** Global admin, or member of a department flagged `canManageUsers`. */
  canManageUsers: boolean;
};

/** Every non-admin user needs a role (department) before they can use the app. */
export function hasRole(user: CurrentUser): boolean {
  return user.globalRole === "ADMIN" || user.departmentMemberships.length > 0;
}

/**
 * The signed-in user regardless of whether they have a role yet. Only for the
 * few places a role-less user may reach: login, /no-access, invite accept, and
 * the AppShell deciding whether to render navigation. Everything else goes
 * through getCurrentUser().
 *
 * Wrapped in React `cache()` so the root layout's AppShell and the page it
 * wraps share one session lookup + one user query per request instead of each
 * paying for their own. Outside a server render (route handlers, tests) it
 * just calls through.
 */
export const getSessionUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      globalRole: true,
      departmentMemberships: {
        select: { departmentId: true, role: true, department: { select: { canManageUsers: true } } },
      },
    },
  });
  if (!user) return null;

  const { departmentMemberships, ...rest } = user;
  return {
    ...rest,
    departmentMemberships: departmentMemberships.map(({ departmentId, role }) => ({ departmentId, role })),
    canManageUsers:
      user.globalRole === "ADMIN" || departmentMemberships.some((m) => m.department.canManageUsers),
  };
});

/**
 * The signed-in user, or null when signed out *or* signed in without a role —
 * so every route/page gating on this rejects role-less users.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const user = await getSessionUser();
  if (!user || !hasRole(user)) return null;
  return user;
});
