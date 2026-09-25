import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
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
          select: { departmentId: true, role: true },
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
  const t = await getTranslations("Members");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="glass relative z-10 rounded-none border-x-0 border-t-0 px-5 py-3">
        <h1 className="flex items-center gap-1.5 font-serif text-base font-semibold text-zinc-950 dark:text-zinc-50">
          <Users size={16} />
          {t("title")}
        </h1>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <p className="text-xs text-zinc-500">{t("hint")}</p>
        <MemberManagementPanel
          currentUser={{ id: user.id, isAdmin: user.globalRole === "ADMIN" }}
          initialDepartments={departments}
          initialUsers={users.map(({ departmentMemberships, ...u }) => ({
            ...u,
            membership: departmentMemberships[0] ?? null,
          }))}
          initialInvites={invites.map((invite) => ({
            ...invite,
            createdAt: invite.createdAt.toISOString(),
            expiresAt: invite.expiresAt.toISOString(),
            acceptedAt: invite.acceptedAt?.toISOString() ?? null,
            status: inviteStatus(invite),
          }))}
        />
      </div>
    </div>
  );
}
