"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Avatar } from "./Avatar";
import { Spinner } from "./Spinner";
import { useToast } from "./Toast";
import type { GlobalRole } from "@/generated/prisma/client";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  globalRole: GlobalRole;
};

export function RoleManagementPanel({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const t = useTranslations("Admin");
  const toast = useToast();
  const [rows, setRows] = useState(users);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const changeRole = async (userId: string, globalRole: GlobalRole) => {
    setPendingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalRole }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setRows((prev) => prev.map((u) => (u.id === userId ? { ...u, globalRole } : u)));
        toast.success(t("roleUpdated"));
      } else {
        toast.error(data?.error ?? t("roleUpdateFailed"));
      }
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div className="glass rounded-lg p-1">
      {rows.map((u) => {
        const isSelf = u.id === currentUserId;
        return (
          <div key={u.id} className="flex items-center gap-3 rounded px-3 py-2">
            <Avatar label={u.name ?? u.email ?? "?"} image={u.image} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                {u.name ?? u.email}
              </p>
              {u.name && u.email && <p className="truncate text-xs text-zinc-500">{u.email}</p>}
            </div>
            {isSelf ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent dark:bg-accent/20">
                <ShieldCheck size={11} />
                {u.globalRole === "ADMIN" ? t("adminYou") : t("you")}
              </span>
            ) : (
              <>
                <select
                  value={u.globalRole}
                  disabled={pendingUserId === u.id}
                  onChange={(e) => changeRole(u.id, e.target.value as GlobalRole)}
                  className="glass-field shrink-0 rounded px-2 py-1 text-xs font-medium text-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50 dark:text-zinc-300"
                >
                  <option value="USER">{t("roleUser")}</option>
                  <option value="ADMIN">{t("roleAdmin")}</option>
                </select>
                {pendingUserId === u.id && <Spinner size={12} />}
              </>
            )}
          </div>
        );
      })}
      {rows.length === 0 && <p className="px-3 py-3 text-xs text-zinc-400">{t("noUsers")}</p>}
    </div>
  );
}
