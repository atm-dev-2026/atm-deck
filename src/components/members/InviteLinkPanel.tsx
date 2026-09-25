"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Link2, Plus } from "lucide-react";
import { Spinner } from "../Spinner";
import { useToast } from "../Toast";
import type { DepartmentOption, InviteRow } from "./types";

const sectionHeading = "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500";
const field =
  "glass-field rounded px-2 py-1.5 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50 dark:text-zinc-200";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function InviteLinkPanel({
  departments,
  onDepartmentCreated,
  onInviteCreated,
}: {
  departments: DepartmentOption[];
  onDepartmentCreated: (department: DepartmentOption) => void;
  onInviteCreated: (invite: InviteRow) => void;
}) {
  const t = useTranslations("Members");
  const tCommon = useTranslations("Common");
  const toast = useToast();

  const [departmentId, setDepartmentId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [newRoleName, setNewRoleName] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);

  const remaining = link ? link.expiresAt - now : 0;
  const expired = link !== null && remaining <= 0;

  useEffect(() => {
    if (!link || expired) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [link, expired]);

  const generate = async () => {
    if (!departmentId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? tCommon("somethingWentWrong"));
        return;
      }
      const { token, ...invite } = data;
      setNow(Date.now());
      setLink({ url: `${window.location.origin}/invite/${token}`, expiresAt: Date.parse(invite.expiresAt) });
      onInviteCreated({ ...invite, status: "active" });
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const createRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newRoleName.trim();
    if (!name) return;
    setCreatingRole(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? tCommon("somethingWentWrong"));
        return;
      }
      onDepartmentCreated({ id: data.id, name: data.name });
      setDepartmentId(data.id);
      setNewRoleName("");
      toast.success(t("roleCreated"));
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    } finally {
      setCreatingRole(false);
    }
  };

  return (
    <section className="mt-6">
      <h2 className={sectionHeading}>
        <Link2 size={13} />
        {t("inviteHeading")}
      </h2>
      <p className="mt-1 text-xs text-zinc-500">{t("inviteHint")}</p>

      <div className="glass mt-3 rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className={`${field} min-w-0 flex-1`}
          >
            <option value="" disabled>
              {t("selectRole")}
            </option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={generate}
            disabled={!departmentId || generating}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating && <Spinner size={12} />}
            {generating ? t("generating") : t("generateLink")}
          </button>
        </div>

        {link && (
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={link.url}
                onFocus={(e) => e.target.select()}
                className={`${field} min-w-0 flex-1 font-mono ${expired ? "line-through opacity-50" : ""}`}
              />
              <button
                type="button"
                onClick={copy}
                disabled={expired}
                className="glass-field flex shrink-0 items-center gap-1 rounded px-2 py-1.5 text-xs text-zinc-600 transition-colors hover:text-accent disabled:opacity-50 dark:text-zinc-300"
              >
                <Copy size={12} />
                {t("copy")}
              </button>
            </div>
            <p className={`mt-1.5 text-xs ${expired ? "text-red-500" : "text-zinc-400"}`}>
              {expired ? t("linkExpired") : t("expiresIn", { time: formatRemaining(remaining) })}
            </p>
          </div>
        )}

        <form onSubmit={createRole} className="mt-3 flex items-center gap-2 border-t border-zinc-900/5 pt-3 dark:border-white/5">
          <input
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder={t("newRolePlaceholder")}
            className={`${field} min-w-0 flex-1`}
          />
          <button
            type="submit"
            disabled={!newRoleName.trim() || creatingRole}
            className="glass-field flex shrink-0 items-center gap-1 rounded px-2 py-1.5 text-xs text-zinc-600 transition-colors hover:text-accent disabled:opacity-50 dark:text-zinc-300"
          >
            {creatingRole ? <Spinner size={12} /> : <Plus size={12} />}
            {t("addRole")}
          </button>
        </form>
      </div>
    </section>
  );
}
