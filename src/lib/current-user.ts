import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  departmentMemberships: { departmentId: string; role: "MANAGER" | "MEMBER" }[];
  /** Member of a department flagged `canManageUsers`: may open /member. */
  canManageUsers: boolean;
  /** Member of a department flagged `canUseGodMode`: may switch god mode on. */
  canUseGodMode: boolean;
  /**
   * God mode in effect: switched on *and* still eligible. Bypasses every board
   * permission check, the way a global admin would.
   */
  godMode: boolean;
};

/** Every user needs a role (department) before they can use the app. */
export function hasRole(user: CurrentUser): boolean {
  return user.departmentMemberships.length > 0;
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
      godMode: true,
      departmentMemberships: {
        select: {
          departmentId: true,
          role: true,
          department: { select: { canManageUsers: true, canUseGodMode: true } },
        },
      },
    },
  });
  if (!user) return null;

  const { departmentMemberships, godMode, ...rest } = user;
  const canUseGodMode = departmentMemberships.some((m) => m.department.canUseGodMode);
  return {
    ...rest,
    departmentMemberships: departmentMemberships.map(({ departmentId, role }) => ({ departmentId, role })),
    canManageUsers: departmentMemberships.some((m) => m.department.canManageUsers),
    canUseGodMode,
    // A stale flag (the user's role changed since) grants nothing.
    godMode: godMode && canUseGodMode,
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
