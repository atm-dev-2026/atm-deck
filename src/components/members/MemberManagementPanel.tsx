"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { History, PlusCircle, Search, Zap } from "lucide-react";
import { ConfirmDialog } from "../ConfirmDialog";
import { useToast } from "../Toast";
import { RoleTabs, type RoleTab } from "./RoleTabs";
import { MemberTable } from "./MemberTable";
import { EditMemberDialog, type MemberEdit } from "./EditMemberDialog";
import { InviteDialog } from "./InviteDialog";
import { InviteHistoryDialog } from "./InviteHistory";
import { GodModeLogDialog } from "./GodModeLogDialog";
import { AddRoleDialog } from "./AddRoleDialog";
import {
  personLabel,
  type DepartmentOption,
  type GodModeLogRow,
  type InviteRow,
  type MemberRow,
} from "./types";

const ALL_TAB = "__all";
const NO_ROLE_TAB = "__none";

const secondaryButton =
  "glass-field flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium text-zinc-600 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow dark:text-zinc-300";

export function MemberManagementPanel({
  currentUser,
  initialDepartments,
  initialUsers,
  initialInvites,
  godModeLogs,
}: {
  currentUser: { id: string; godMode: boolean };
  initialDepartments: DepartmentOption[];
  initialUsers: MemberRow[];
  initialInvites: InviteRow[];
  godModeLogs: GodModeLogRow[];
}) {
  const t = useTranslations("Members");
  const toast = useToast();

  const [departments, setDepartments] = useState(initialDepartments);
  const [rows, setRows] = useState(initialUsers);
  const [invites, setInvites] = useState(initialInvites);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(ALL_TAB);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [removing, setRemoving] = useState<MemberRow | null>(null);
  const [removePending, setRemovePending] = useState(false);
  const [dialog, setDialog] = useState<"invite" | "history" | "godModeLog" | "addRole" | null>(null);

  const departmentNames = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);

  const tabs: RoleTab[] = useMemo(() => {
    const counts = new Map<string, number>();
    let roleless = 0;
    for (const u of rows) {
      if (u.membership) counts.set(u.membership.departmentId, (counts.get(u.membership.departmentId) ?? 0) + 1);
      else roleless++;
    }
    return [
      { id: ALL_TAB, label: t("tabAll"), count: rows.length },
      ...(roleless > 0 ? [{ id: NO_ROLE_TAB, label: t("noRole"), count: roleless, warn: true }] : []),
      ...departments.map((d) => ({ id: d.id, label: d.name, count: counts.get(d.id) ?? 0 })),
    ];
  }, [rows, departments, t]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((u) => {
      if (tab === NO_ROLE_TAB && u.membership) return false;
      if (tab !== ALL_TAB && tab !== NO_ROLE_TAB && u.membership?.departmentId !== tab) return false;
      if (!q) return true;
      return (u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
    });
  }, [rows, tab, query]);

  const patchRow = (userId: string, patch: Partial<MemberRow>) =>
    setRows((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)));

  /** Runs one request with the row's spinner on; toasts the API's error message on failure. */
  const request = async (userId: string, url: string, init: RequestInit) => {
    setPendingUserId(userId);
    try {
      const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      const data = await res.json().catch(() => null);
      if (!res.ok) toast.error(data?.error ?? t("roleUpdateFailed"));
      return res.ok ? data : null;
    } catch {
      toast.error(t("roleUpdateFailed"));
      return null;
    } finally {
      setPendingUserId(null);
    }
  };

  const saveEdit = async (row: MemberRow, edit: MemberEdit): Promise<boolean> => {
    const unchanged =
      row.membership?.departmentId === edit.departmentId && row.membership?.role === edit.departmentRole;
    if (unchanged) return true;

    const data = await request(row.id, `/api/members/${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ departmentId: edit.departmentId, departmentRole: edit.departmentRole }),
    });
    if (!data) return false;
    const { godMode, ...membership } = data;
    // A role that can't use god mode switches it off server-side.
    patchRow(row.id, { membership, godMode: row.godMode && godMode });
    toast.success(t("roleUpdated"));
    return true;
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setRemovePending(true);
    const ok = await request(removing.id, `/api/members/${removing.id}`, { method: "DELETE" });
    setRemovePending(false);
    if (ok) {
      patchRow(removing.id, { membership: null, godMode: false });
      toast.success(t("accessRemoved"));
      setRemoving(null);
    }
  };

  // Switching access on needs a role, so it goes through the edit dialog; off revokes after a confirm.
  const toggleAccess = (row: MemberRow, next: boolean) => (next ? setEditing(row) : setRemoving(row));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8">
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {t("title")}
      </h1>
      <p className="mt-0.5 text-xs text-zinc-500">{t("count", { count: rows.length })}</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="glass-field flex w-full max-w-xs items-center gap-2 rounded-full px-4 py-2 focus-within:ring-1 focus-within:ring-accent/50">
          <Search size={15} className="shrink-0 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
          />
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDialog("godModeLog")}
            title={t("godModeLogHeading")}
            className={secondaryButton}
          >
            <Zap size={14} />
            <span className="hidden sm:inline">{t("godModeLogHeading")}</span>
          </button>
          <button
            type="button"
            onClick={() => setDialog("history")}
            title={t("historyHeading")}
            className={secondaryButton}
          >
            <History size={14} />
            <span className="hidden sm:inline">{t("historyHeading")}</span>
          </button>
          <button
            type="button"
            onClick={() => setDialog("invite")}
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover"
          >
            <PlusCircle size={16} />
            {t("addUser")}
          </button>
        </div>
      </div>

      <div className="glass mt-5 overflow-hidden rounded-xl">
        <RoleTabs tabs={tabs} active={tab} onChange={setTab} onAddRole={() => setDialog("addRole")} />
        <MemberTable
          rows={visibleRows}
          departmentNames={departmentNames}
          currentUser={currentUser}
          pendingUserId={pendingUserId}
          onEdit={setEditing}
          onToggleAccess={toggleAccess}
        />
      </div>

      {editing && (
        <EditMemberDialog
          key={editing.id}
          row={editing}
          departments={departments}
          onClose={() => setEditing(null)}
          onSave={(edit) => saveEdit(editing, edit)}
        />
      )}
      {dialog === "invite" && (
        <InviteDialog
          departments={departments}
          onClose={() => setDialog(null)}
          onInviteCreated={(invite) => setInvites((prev) => [invite, ...prev])}
        />
      )}
      {dialog === "history" && <InviteHistoryDialog invites={invites} onClose={() => setDialog(null)} />}
      {dialog === "godModeLog" && <GodModeLogDialog logs={godModeLogs} onClose={() => setDialog(null)} />}
      {dialog === "addRole" && (
        <AddRoleDialog
          onClose={() => setDialog(null)}
          onCreated={(d) => setDepartments((prev) => [...prev, d].sort((a, b) => a.name.localeCompare(b.name)))}
        />
      )}

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
    </div>
  );
}
