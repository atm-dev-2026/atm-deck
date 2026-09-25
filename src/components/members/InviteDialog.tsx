"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Link2 } from "lucide-react";
import { Modal } from "../Modal";
import { Spinner } from "../Spinner";
import { useToast } from "../Toast";
import type { DepartmentOption, InviteRow } from "./types";

const field =
  "glass-field rounded-md px-2.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50 dark:text-zinc-100";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** "Add user": pick a role, then generate a single-use 10-minute invite link. */
export function InviteDialog({
  departments,
  onClose,
  onInviteCreated,
}: {
  departments: DepartmentOption[];
  onClose: () => void;
  onInviteCreated: (invite: InviteRow) => void;
}) {
  const t = useTranslations("Members");
  const tCommon = useTranslations("Common");
  const toast = useToast();

  const [departmentId, setDepartmentId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

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

  return (
    <Modal open title={t("inviteHeading")} onClose={onClose} dismissible={!generating}>
      <p className="text-xs text-zinc-500">{t("inviteHint")}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setLink(null); // a new role means a new link
          }}
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
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? <Spinner size={12} /> : <Link2 size={13} />}
          {generating ? t("generating") : link ? t("regenerateLink") : t("generateLink")}
        </button>
      </div>

      {link && (
        <div className="mt-4 rounded-lg bg-zinc-900/[0.03] p-3 dark:bg-white/[0.04]">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link.url}
              onFocus={(e) => e.target.select()}
              className={`${field} min-w-0 flex-1 font-mono text-xs ${expired ? "line-through opacity-50" : ""}`}
            />
            <button
              type="button"
              onClick={copy}
              disabled={expired}
              className="glass-field flex shrink-0 items-center gap-1 rounded-md px-2.5 py-2 text-xs text-zinc-600 transition-colors hover:text-accent disabled:opacity-50 dark:text-zinc-300"
            >
              <Copy size={12} />
              {t("copy")}
            </button>
          </div>
          <p className={`mt-2 text-xs ${expired ? "text-red-500" : "text-zinc-500"}`}>
            {expired ? t("linkExpired") : t("expiresIn", { time: formatRemaining(remaining) })}
          </p>
        </div>
      )}
    </Modal>
  );
}
