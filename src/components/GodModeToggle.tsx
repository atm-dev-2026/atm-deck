"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Zap } from "lucide-react";
import { Spinner } from "./Spinner";
import { Switch } from "./Switch";
import { useToast } from "./Toast";

/** Self-service god mode switch for users whose role allows it. Server logs every change. */
export function GodModeToggle({ enabled }: { enabled: boolean }) {
  const t = useTranslations("Shell.godMode");
  const tCommon = useTranslations("Common");
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const toggle = async (next: boolean) => {
    setPending(true);
    try {
      const res = await fetch("/api/god-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? tCommon("somethingWentWrong"));
        return;
      }
      toast.success(next ? t("turnedOn") : t("turnedOff"));
      // Permissions are resolved server-side; re-render so boards etc. reflect the new mode.
      router.refresh();
    } catch {
      toast.error(tCommon("somethingWentWrong"));
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className={`mb-1 flex items-center gap-2 rounded px-3 py-2 ${
        enabled ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "text-zinc-600 dark:text-zinc-400"
      }`}
    >
      <Zap size={14} className={enabled ? "fill-current" : ""} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t("label")}</p>
        <p className="text-[10px] leading-tight text-zinc-400">{enabled ? t("onHint") : t("offHint")}</p>
      </div>
      {pending && <Spinner size={12} />}
      <Switch checked={enabled} onChange={toggle} disabled={pending} label={t("label")} />
    </div>
  );
}

/** Avatar wrapper that marks an account currently in god mode. */
export function GodModeAvatarRing({ active, children }: { active: boolean; children: React.ReactNode }) {
  if (!active) return <>{children}</>;
  return (
    <span className="relative inline-flex rounded-full ring-2 ring-rose-500 ring-offset-1 ring-offset-transparent">
      {children}
      <span className="absolute -right-1 -bottom-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-white">
        <Zap size={8} className="fill-current" />
      </span>
    </span>
  );
}
