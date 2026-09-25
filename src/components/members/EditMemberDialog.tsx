"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "../Avatar";
import { Modal } from "../Modal";
import { Spinner } from "../Spinner";
import type { DepartmentRole, GlobalRole } from "@/generated/prisma/client";
import { personLabel, type DepartmentOption, type MemberRow } from "./types";

export type MemberEdit = { departmentId: string; departmentRole: DepartmentRole; globalRole: GlobalRole };

const field =
  "glass-field w-full rounded-md px-2.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50 dark:text-zinc-100";
const label = "mb-1 block text-xs font-medium text-zinc-500";

/** Mounted per edit (keyed by user id by the parent), so its form state starts from the row. */
export function EditMemberDialog({
  row,
  departments,
  canEditGlobalRole,
  onClose,
  onSave,
}: {
  row: MemberRow;
  departments: DepartmentOption[];
  canEditGlobalRole: boolean;
  onClose: () => void;
  /** Resolves true once everything saved. */
  onSave: (edit: MemberEdit) => Promise<boolean>;
}) {
  const t = useTranslations("Members");
  const tCommon = useTranslations("Common");
  const [departmentId, setDepartmentId] = useState(row.membership?.departmentId ?? "");
  const [departmentRole, setDepartmentRole] = useState<DepartmentRole>(row.membership?.role ?? "MEMBER");
  const [globalRole, setGlobalRole] = useState<GlobalRole>(row.globalRole);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) return;
    setSaving(true);
    const ok = await onSave({ departmentId, departmentRole, globalRole });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal open title={t("editTitle")} onClose={onClose} dismissible={!saving}>
      <form onSubmit={submit}>
        <div className="flex items-center gap-3">
          <Avatar label={personLabel(row)} image={row.image} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">{row.name ?? row.email}</p>
            {row.name && row.email && <p className="truncate text-xs text-zinc-500">{row.email}</p>}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className={label} htmlFor="member-role">
              {t("fieldRole")}
            </label>
            <select
              id="member-role"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={saving}
              className={field}
            >
              <option value="" disabled>
                {t("assignRole")}
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={label} htmlFor="member-position">
              {t("fieldPosition")}
            </label>
            <select
              id="member-position"
              value={departmentRole}
              onChange={(e) => setDepartmentRole(e.target.value as DepartmentRole)}
              disabled={saving}
              className={field}
            >
              <option value="MEMBER">{t("deptMember")}</option>
              <option value="MANAGER">{t("deptManager")}</option>
            </select>
          </div>

          {canEditGlobalRole && (
            <div>
              <label className={label} htmlFor="member-global-role">
                {t("fieldGlobalRole")}
              </label>
              <select
                id="member-global-role"
                value={globalRole}
                onChange={(e) => setGlobalRole(e.target.value as GlobalRole)}
                disabled={saving}
                className={field}
              >
                <option value="USER">{t("globalUser")}</option>
                <option value="ADMIN">{t("globalAdmin")}</option>
              </select>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="submit"
            disabled={!departmentId || saving}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Spinner size={12} />}
            {saving ? t("saving") : tCommon("save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
