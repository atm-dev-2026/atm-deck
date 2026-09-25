"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, UserMinus, Users } from "lucide-react";
import { Avatar } from "../Avatar";
import { ConfirmDialog } from "../ConfirmDialog";
import { Spinner } from "../Spinner";
import { useToast } from "../Toast";
import type { DepartmentRole, GlobalRole } from "@/generated/prisma/client";
import { personLabel, type DepartmentOption, type MemberRow } from "./types";

const select =
  "glass-field shrink-0 rounded px-2 py-1 text-xs font-medium text-zinc-600 focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50 dark:text-zinc-300";

export function MemberList({
  currentUser,
  departments,
  initialUsers,
}: {
  currentUser: { id: string; isAdmin: boolean };
  departments: DepartmentOption[];
  initialUsers: MemberRow[];
}) {
  const t = useTranslations("Members");
  const toast = useToast();
  const [rows, setRows] = useState(initialUsers);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<MemberRow | null>(null);
  const [removePending, setRemovePending] = useState(false);

  const departmentName = (id: string) => departments.find((d) => d.id === id)?.name ?? "—";

  const patchRow = (userId: string, patch: Partial<MemberRow>) =>
    setRows((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)));

  const request = async (userId: string, url: string, init: RequestInit) => {
    setPendingUserId(userId);
    try {
      const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      const data = await res.json().catch(() => null);
      if (!res.ok) toast.error(data?.error ?? t("roleUpdateFailed"));
      return res.ok;
    } catch {
      toast.error(t("roleUpdateFailed"));
      return false;
    } finally {
      setPendingUserId(null);
    }
  };

  const setRole = async (user: MemberRow, departmentId: string, departmentRole: DepartmentRole) => {
    const ok = await request(user.id, `/api/members/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ departmentId, departmentRole }),
    });
    if (ok) {
      patchRow(user.id, { membership: { departmentId, role: departmentRole } });
      toast.success(t("roleUpdated"));
    }
  };

  const setGlobalRole = async (user: MemberRow, globalRole: GlobalRole) => {
    const ok = await request(user.id, `/api/admin/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ globalRole }),
    });
    if (ok) {
      patchRow(user.id, { globalRole });
      toast.success(t("roleUpdated"));
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setRemovePending(true);
    const ok = await request(removing.id, `/api/members/${removing.id}`, { method: "DELETE" });
    setRemovePending(false);
    if (ok) {
      patchRow(removing.id, { membership: null });
      toast.success(t("accessRemoved"));
      setRemoving(null);
    }
  };

  // Role-less users first: they're the ones waiting on someone here.
  const sorted = [...rows].sort((a, b) => Number(a.membership !== null) - Number(b.membership !== null));

  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <Users size={13} />
        {t("membersHeading")}
      </h2>

      <div className="glass mt-3 rounded-lg p-1">
        {sorted.map((u) => {
          const isSelf = u.id === currentUser.id;
          // Non-admin managers can't edit admins (the API refuses too).
          const readOnly = isSelf || (u.globalRole === "ADMIN" && !currentUser.isAdmin);
          const pending = pendingUserId === u.id;

          return (
            <div key={u.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded px-3 py-2">
              <Avatar label={personLabel(u)} image={u.image} size="sm" />
              <div className="min-w-0 flex-1 basis-40">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                  <span className="truncate">{u.name ?? u.email}</span>
                  {u.globalRole === "ADMIN" && <ShieldCheck size={12} className="shrink-0 text-accent" />}
                </p>
                {u.name && u.email && <p className="truncate text-xs text-zinc-500">{u.email}</p>}
              </div>

              {readOnly ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent dark:bg-accent/20">
                  {u.membership ? departmentName(u.membership.departmentId) : t("noRole")}
                  {isSelf && ` · ${t("you")}`}
                </span>
              ) : (
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {!u.membership && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      {t("noRole")}
                    </span>
                  )}
                  <select
                    value={u.membership?.departmentId ?? ""}
                    disabled={pending}
                    onChange={(e) => setRole(u, e.target.value, u.membership?.role ?? "MEMBER")}
                    className={`${select} max-w-40`}
                  >
                    {!u.membership && (
                      <option value="" disabled>
                        {t("assignRole")}
                      </option>
                    )}
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {u.membership && (
                    <select
                      value={u.membership.role}
                      disabled={pending}
                      onChange={(e) => setRole(u, u.membership!.departmentId, e.target.value as DepartmentRole)}
                      className={select}
                    >
                      <option value="MEMBER">{t("deptMember")}</option>
                      <option value="MANAGER">{t("deptManager")}</option>
                    </select>
                  )}
                  {currentUser.isAdmin && (
                    <select
                      value={u.globalRole}
                      disabled={pending}
                      onChange={(e) => setGlobalRole(u, e.target.value as GlobalRole)}
                      className={select}
                    >
                      <option value="USER">{t("globalUser")}</option>
                      <option value="ADMIN">{t("globalAdmin")}</option>
                    </select>
                  )}
                  {u.membership && (
                    <button
                      type="button"
                      onClick={() => setRemoving(u)}
                      disabled={pending}
                      title={t("removeAccess")}
                      className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                  {pending && <Spinner size={12} />}
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <p className="px-3 py-3 text-xs text-zinc-400">{t("noUsers")}</p>}
      </div>

      <ConfirmDialog
        open={removing !== null}
        title={removing ? t("removeAccessTitle", { name: personLabel(removing) }) : ""}
        description={t("removeAccessDescription")}
        confirmLabel={t("removeAccess")}
        pendingLabel={t("removeAccess")}
        pending={removePending}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </section>
  );
}
