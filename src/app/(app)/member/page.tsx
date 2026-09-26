import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { inviteStatus } from "@/lib/roles";
import { MemberManagementPanel } from "@/components/members/MemberManagementPanel";

const INVITE_HISTORY_LIMIT = 50;
const GOD_MODE_LOG_LIMIT = 100;

const personSelect = { id: true, name: true, email: true } as const;

export default async function MemberPage() {
  const user = await getCurrentUser();
  // Hidden from the nav for everyone else, and blocked here for direct URL visits.
  if (!user?.canManageUsers) redirect("/");

  const [users, departments, invites, godModeLogs] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        godMode: true,
        departmentMemberships: {
          orderBy: { joinedAt: "desc" },
          select: {
            departmentId: true,
            role: true,
            joinedAt: true,
            department: { select: { canUseGodMode: true } },
          },
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
        createdBy: { select: personSelect },
        acceptedBy: { select: personSelect },
      },
    }),
    prisma.godModeLog.findMany({
      orderBy: { createdAt: "desc" },
      take: GOD_MODE_LOG_LIMIT,
      select: {
        id: true,
        enabled: true,
        createdAt: true,
        user: { select: { ...personSelect, image: true } },
      },
    }),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <MemberManagementPanel
        currentUser={{ id: user.id, godMode: user.godMode }}
        initialDepartments={departments}
        initialUsers={users.map(({ departmentMemberships, godMode, ...u }) => {
          const latest = departmentMemberships[0];
          return {
            ...u,
            // Same rule as getSessionUser: the flag only counts while the role allows it.
            godMode: godMode && departmentMemberships.some((m) => m.department.canUseGodMode),
            membership: latest
              ? { departmentId: latest.departmentId, role: latest.role, joinedAt: latest.joinedAt.toISOString() }
              : null,
          };
        })}
        initialInvites={invites.map((invite) => ({
          ...invite,
          createdAt: invite.createdAt.toISOString(),
          expiresAt: invite.expiresAt.toISOString(),
          acceptedAt: invite.acceptedAt?.toISOString() ?? null,
          status: inviteStatus(invite),
        }))}
        godModeLogs={godModeLogs.map((log) => ({ ...log, createdAt: log.createdAt.toISOString() }))}
      />
    </div>
  );
}
