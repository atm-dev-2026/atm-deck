import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { GlobalRole } from "@/generated/prisma/client";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  globalRole: GlobalRole;
  departmentMemberships: { departmentId: string; role: "MANAGER" | "MEMBER" }[];
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
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
      globalRole: true,
      departmentMemberships: { select: { departmentId: true, role: true } },
    },
  });

  return user;
}
