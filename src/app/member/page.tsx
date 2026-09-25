import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { inviteStatus } from "@/lib/roles";
import { MemberManagementPanel } from "@/components/members/MemberManagementPanel";

const INVITE_HISTORY_LIMIT = 50;

export default async function MemberPage() {
  const user = await getCurrentUser();
  // Hidden from the nav for everyone else, and blocked here for direct URL visits.
  if (!user?.canManageUsers) redirect("/");

  const [users, departments, invites] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        globalRole: true,
        departmentMemberships: {
          orderBy: { joinedAt: "desc" },
          take: 1,
          select: { departmentId: true, role: true, joinedAt: true },
        },
      },
    }),
    prisma.department.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.appInvite.findMany({
      orderBy: { createdAt: "desc" },
      take: INVITE_HISTORY_LIMIT,
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        acceptedBy: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <MemberManagementPanel
        currentUser={{ id: user.id, isAdmin: user.globalRole === "ADMIN" }}
        initialDepartments={departments}
        initialUsers={users.map(({ departmentMemberships, ...u }) => {
          const membership = departmentMemberships[0];
          return {
            ...u,
            membership: membership ? { ...membership, joinedAt: membership.joinedAt.toISOString() } : null,
          };
        })}
        initialInvites={invites.map((invite) => ({
          ...invite,
          createdAt: invite.createdAt.toISOString(),
          expiresAt: invite.expiresAt.toISOString(),
          acceptedAt: invite.acceptedAt?.toISOString() ?? null,
          status: inviteStatus(invite),
        }))}
      />
    </div>
  );
}
