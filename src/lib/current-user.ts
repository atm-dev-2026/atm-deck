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
};

/**
 * Wrapped in React `cache()` so the root layout's AppShell and the page it
 * wraps share one session lookup + one user query per request instead of each
 * paying for their own. Outside a server render (route handlers, tests) it
 * just calls through.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
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
      departmentMemberships: { select: { departmentId: true, role: true } },
    },
  });

  return user;
});
