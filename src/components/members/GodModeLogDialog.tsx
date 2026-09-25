"use client";

import { useTranslations } from "next-intl";
import { Zap, ZapOff } from "lucide-react";
import { Avatar } from "../Avatar";
import { Modal } from "../Modal";
import { useDateLocale } from "../CalendarProvider";
import { personLabel, type GodModeLogRow } from "./types";

export function GodModeLogDialog({ logs, onClose }: { logs: GodModeLogRow[]; onClose: () => void }) {
  const t = useTranslations("Members");
  const locale = useDateLocale();

  return (
    <Modal open title={t("godModeLogHeading")} onClose={onClose} width="max-w-lg">
      <div className="-mx-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-center gap-3 border-t border-zinc-900/5 px-2 py-2 first:border-t-0 dark:border-white/5"
          >
            <Avatar label={personLabel(log.user)} image={log.user.image} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">{personLabel(log.user)}</p>
              <p className="truncate text-xs text-zinc-500">
                {/* Dialog only mounts after a click, so browser-local time can't mismatch SSR. */}
                {new Date(log.createdAt).toLocaleString(locale)}
              </p>
            </div>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                log.enabled
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  : "bg-zinc-500/10 text-zinc-500"
              }`}
            >
              {log.enabled ? <Zap size={10} className="fill-current" /> : <ZapOff size={10} />}
              {log.enabled ? t("godModeOn") : t("godModeOff")}
            </span>
          </div>
        ))}
        {logs.length === 0 && <p className="px-2 py-6 text-center text-xs text-zinc-400">{t("godModeLogEmpty")}</p>}
      </div>
    </Modal>
  );
}
