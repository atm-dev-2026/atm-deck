"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { History } from "lucide-react";
import { useDateLocale } from "../CalendarProvider";
import { useHydrated } from "@/lib/useHydrated";
import { personLabel, type InviteRow } from "./types";

const STATUS_STYLES = {
  active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  expired: "bg-zinc-500/10 text-zinc-500",
  accepted: "bg-accent/10 text-accent dark:bg-accent/20",
} as const;

export function InviteHistory({ invites }: { invites: InviteRow[] }) {
  const t = useTranslations("Members");
  const locale = useDateLocale();
  const hydrated = useHydrated();
  // Ticks so still-"active" links flip to expired while the page is open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Timestamps depend on the browser's timezone, so they render after hydration only.
  const formatTime = (iso: string) => (hydrated ? new Date(iso).toLocaleString(locale) : "");

  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <History size={13} />
        {t("historyHeading")}
      </h2>

      <div className="glass mt-3 rounded-lg p-1">
        {invites.map((invite) => {
          // Server-computed status until hydrated, so SSR and hydration agree.
          const status =
            hydrated && invite.status === "active" && Date.parse(invite.expiresAt) <= now
              ? "expired"
              : invite.status;
          return (
            <div key={invite.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded px-3 py-2">
              <div className="min-w-0 flex-1 basis-48">
                <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">{invite.department.name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {t("generatedBy", { name: personLabel(invite.createdBy) })}
                  {hydrated && ` · ${formatTime(invite.createdAt)}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[status]}`}>
                  {status === "accepted"
                    ? t("statusAccepted", { name: invite.acceptedBy ? personLabel(invite.acceptedBy) : "—" })
                    : status === "active"
                      ? t("statusActive")
                      : t("statusExpired")}
                </span>
                {invite.acceptedAt && <span className="text-[10px] text-zinc-400">{formatTime(invite.acceptedAt)}</span>}
              </div>
            </div>
          );
        })}
        {invites.length === 0 && <p className="px-3 py-3 text-xs text-zinc-400">{t("historyEmpty")}</p>}
      </div>
    </section>
  );
}
