"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BellRing } from "lucide-react";
import { Switch } from "./Switch";
import { Spinner } from "./Spinner";
import { useToast } from "./Toast";
import { useNotifications } from "./NotificationsProvider";
import { useHydrated } from "@/lib/useHydrated";
import {
  currentPushSubscription,
  notificationSupport,
  systemNotificationsOn,
  turnOffNotifications,
  turnOnNotifications,
  type NotificationSupport,
} from "@/lib/push-client";

type State = {
  support: NotificationSupport;
  permission: NotificationPermission;
  on: boolean;
};

function readState(): State {
  const support = notificationSupport();
  return {
    support,
    permission: support === "supported" ? Notification.permission : "default",
    on: systemNotificationsOn(),
  };
}

export function NotificationSettings() {
  const t = useTranslations("Notifications.settings");
  const locale = useLocale();
  const toast = useToast();
  const { pushActive, refreshPush } = useNotifications();
  // Read from browser APIs on every render (cheap); `rerender` after changing them.
  const hydrated = useHydrated();
  const [, setVersion] = useState(0);
  const rerender = () => setVersion((v) => v + 1);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  const state = hydrated ? readState() : null;
  if (!state) {
    return <div className="glass-field h-14 animate-pulse rounded-lg" />;
  }

  const turnOn = async () => {
    setBusy(true);
    try {
      const ok = await turnOnNotifications(locale);
      if (!ok && Notification.permission !== "denied") toast.error(t("failed"));
    } catch (error) {
      console.error(error);
      toast.error(t("failed"));
    } finally {
      await refreshPush();
      rerender();
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      await turnOffNotifications();
    } finally {
      await refreshPush();
      rerender();
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const subscription = await currentPushSubscription();
      const res = subscription
        ? await fetch("/api/push/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          })
        : null;
      if (res?.ok) toast.success(t("testSent"));
      else toast.error(t("testFailed"));
    } catch {
      toast.error(t("testFailed"));
    } finally {
      setTesting(false);
    }
  };

  if (state.support === "ios-needs-install") {
    return <p className="glass-field rounded-lg p-3 text-sm text-zinc-600 dark:text-zinc-400">{t("iosInstall")}</p>;
  }
  if (state.support === "unsupported") {
    return <p className="glass-field rounded-lg p-3 text-sm text-zinc-600 dark:text-zinc-400">{t("unsupported")}</p>;
  }
  if (state.permission === "denied") {
    return <p className="glass-field rounded-lg p-3 text-sm text-zinc-600 dark:text-zinc-400">{t("blocked")}</p>;
  }

  if (state.permission === "default" && !state.on) {
    return (
      <button
        type="button"
        onClick={turnOn}
        disabled={busy}
        className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground shadow-glow transition-transform hover:-translate-y-0.5 hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
      >
        {busy ? <Spinner size={14} /> : <BellRing size={14} />}
        {busy ? t("enabling") : t("enable")}
      </button>
    );
  }

  return (
    <div className="glass flex flex-col gap-3 rounded-lg p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">{t("onThisDevice")}</p>
          <p className="text-xs text-zinc-500">
            {state.on ? (pushActive ? t("onHint") : t("onHintNoPush")) : t("offHint")}
          </p>
        </div>
        {busy ? (
          <Spinner size={16} />
        ) : (
          <Switch checked={state.on} onChange={(next) => (next ? turnOn() : turnOff())} label={t("onThisDevice")} />
        )}
      </div>
      {state.on && pushActive && (
        <button
          type="button"
          onClick={sendTest}
          disabled={testing}
          className="glass-field flex w-fit items-center gap-2 rounded-md px-3 py-1.5 text-xs text-zinc-600 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-wait disabled:opacity-70 dark:text-zinc-300"
        >
          {testing ? <Spinner size={12} /> : <BellRing size={12} />}
          {testing ? t("sendingTest") : t("sendTest")}
        </button>
      )}
    </div>
  );
}
