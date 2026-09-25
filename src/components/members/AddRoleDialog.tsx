"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "../Modal";
import { Spinner } from "../Spinner";
import { useToast } from "../Toast";
import type { DepartmentOption } from "./types";

export function AddRoleDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (department: DepartmentOption) => void;
}) {
  const t = useTranslations("Members");
  const tCommon = useTranslations("Common");
  const toast = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? tCommon("somethingWentWrong"));
        return;
      }
      onCreated({ id: data.id, name: data.name });
      toast.success(t("roleCreated"));
      onClose();
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={t("addRole")} onClose={onClose} dismissible={!saving} width="max-w-sm">
      <form onSubmit={submit}>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("newRolePlaceholder")}
          className="glass-field w-full rounded-md px-2.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-accent/50 dark:text-zinc-100"
        />
        <div className="mt-4 flex justify-end gap-2">
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
            disabled={!name.trim() || saving}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Spinner size={12} />}
            {tCommon("create")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
