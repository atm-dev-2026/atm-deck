import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { RoleManagementPanel } from "@/components/RoleManagementPanel";

export default async function AdminRolesPage() {
  const user = await getCurrentUser();
  if (!user || user.globalRole !== "ADMIN") {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, image: true, globalRole: true },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="glass relative z-10 rounded-none border-x-0 border-t-0 px-5 py-3">
        <h1 className="flex items-center gap-1.5 font-serif text-base font-semibold text-zinc-950 dark:text-zinc-50">
          <ShieldCheck size={16} />
          Role Management
        </h1>
      </div>

      <div className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
        <p className="text-xs text-zinc-500">
          Grant or revoke admin access. Admins can manage every board and department regardless of
          membership.
        </p>
        <div className="mt-4">
          <RoleManagementPanel users={users} currentUserId={user.id} />
        </div>
      </div>
    </div>
  );
}
