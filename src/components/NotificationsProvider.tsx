"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "./Toast";
import {
  chatNoticeText,
  taskNoticeText,
  type ChatNotice,
  type NoticeText,
  type TaskNotice,
  type Translate,
} from "@/lib/notificationText";
import {
  currentPushSubscription,
  registerServiceWorker,
  showSystemNotification,
  syncPushSubscription,
  systemNotificationsOn,
} from "@/lib/push-client";

type NotificationsContextValue = {
  /** channelId → unread messages by others. */
  channelUnread: Record<string, number>;
  chatUnreadTotal: number;
  taskUnreadCount: number;
  markTaskRead: (taskId: string) => void;
  /** This device is subscribed to Web Push, so alerts arrive with the app closed. */
  pushActive: boolean;
  /** Re-checks this device's push subscription after Settings changes it. */
  refreshPush: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue>({
  channelUnread: {},
  chatUnreadTotal: 0,
  taskUnreadCount: 0,
  markTaskRead: () => {},
  pushActive: false,
  refreshPush: async () => {},
});

export function useNotifications() {
  return useContext(NotificationsContext);
}

type Summary = { channels: Record<string, number>; tasks: TaskNotice[]; asOf: string };

const MARK_READ_THROTTLE_MS = 1500;

function isVisible() {
  return document.visibilityState === "visible";
}

function chatChannelOf(pathname: string): string | null {
  const match = /^\/chat\/([^/]+)/.exec(pathname);
  return match ? match[1] : null;
}

/**
 * App-wide notification state for a signed-in user with a role: unread badges,
 * live alerts from /api/notifications/stream, and this device's push setup.
 *
 * How an incoming message/task is surfaced:
 *   - its chat is open in front of you → marked read, no alert
 *   - you're on /my-tasks → marked read, toast, list refreshed
 *   - this tab is visible → in-app toast
 *   - tab hidden, no Web Push on this device → system notification from the page
 *   - tab hidden, Web Push on → left to the push (public/sw.js shows it)
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const toast = useToast();
  const tRaw = useTranslations("Notifications");
  const t = tRaw as unknown as Translate;

  const [channelUnread, setChannelUnread] = useState<Record<string, number>>({});
  const [tasks, setTasks] = useState<TaskNotice[]>([]);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [pushActive, setPushActive] = useState(false);

  // Latest values for the long-lived stream handlers.
  const pathnameRef = useRef(pathname);
  const tRef = useRef(t);
  const tasksRef = useRef(tasks);
  const asOfRef = useRef<string | null>(null);
  const seenRef = useRef(new Set<string>());
  const pushActiveRef = useRef(false);
  // Only one tab (the Web Locks holder) raises system notifications, so several
  // open tabs don't each pop the same alert.
  const leaderRef = useRef(false);
  const lastMarkedRef = useRef(new Map<string, number>());
  const pendingMarkRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const alertRef = useRef<(text: NoticeText) => void>(() => {});

  useEffect(() => {
    pathnameRef.current = pathname;
    tRef.current = t;
    tasksRef.current = tasks;
    alertRef.current = (text: NoticeText) => {
      if (isVisible()) {
        toast.notify({ title: text.title, message: text.body, href: text.url });
      } else if (leaderRef.current && !pushActiveRef.current) {
        showSystemNotification(text).catch(() => {});
      }
    };
  });

  const markChannelRead = useCallback((channelId: string) => {
    setChannelUnread((prev) => {
      if (!prev[channelId]) return prev;
      const next = { ...prev };
      delete next[channelId];
      return next;
    });

    // Throttled, but trailing: a burst of messages while you watch ends with
    // one last POST, so nothing you saw is left unread on the server.
    if (pendingMarkRef.current.has(channelId)) return;
    const send = () => {
      lastMarkedRef.current.set(channelId, Date.now());
      fetch(`/api/channels/${channelId}/read`, { method: "POST" }).catch(() => {});
    };
    const wait = MARK_READ_THROTTLE_MS - (Date.now() - (lastMarkedRef.current.get(channelId) ?? 0));
    if (wait <= 0) {
      send();
      return;
    }
    pendingMarkRef.current.set(
      channelId,
      setTimeout(() => {
        pendingMarkRef.current.delete(channelId);
        send();
      }, wait),
    );
  }, []);

  const markTaskRead = useCallback((taskId: string) => {
    if (!tasksRef.current.some((n) => n.taskId === taskId)) return;
    tasksRef.current = tasksRef.current.filter((n) => n.taskId !== taskId);
    setTasks((prev) => prev.filter((n) => n.taskId !== taskId));
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    }).catch(() => {});
  }, []);

  const markAllTasksRead = useCallback(() => {
    if (tasksRef.current.length === 0) return;
    tasksRef.current = [];
    setTasks([]);
    fetch("/api/notifications/read", { method: "POST" }).catch(() => {});
  }, []);

  /** Looking at something marks it read: the open chat, or /my-tasks. */
  const markViewedRead = useCallback(() => {
    if (!isVisible()) return;
    const channelId = chatChannelOf(pathnameRef.current);
    if (channelId) markChannelRead(channelId);
    if (pathnameRef.current.startsWith("/my-tasks")) markAllTasksRead();
  }, [markChannelRead, markAllTasksRead]);

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/notifications").catch(() => null);
    if (!res?.ok) return;
    const summary: Summary = await res.json();
    asOfRef.current = summary.asOf;
    setChannelUnread(summary.channels);
    tasksRef.current = summary.tasks;
    setTasks(summary.tasks);
    setAsOf((prev) => prev ?? summary.asOf);
    // The page may have opened straight onto something now counted as unread.
    markViewedRead();
  }, [markViewedRead]);

  const refreshPush = useCallback(async () => {
    let active = false;
    try {
      const subscription = systemNotificationsOn()
        ? await syncPushSubscription(locale)
        : await currentPushSubscription();
      active = Boolean(subscription) && systemNotificationsOn();
    } catch (error) {
      // e.g. private/incognito windows, where browsers refuse push outright.
      console.warn("Push subscription sync failed", error);
    }
    pushActiveRef.current = active;
    setPushActive(active);
  }, [locale]);

  // Initial unread state.
  useEffect(() => {
    (async () => {
      await loadSummary();
    })();
  }, [loadSummary]);

  // Service worker + push: re-registering on each load also re-claims this
  // browser's endpoint for whoever is signed in and keeps its language current.
  useEffect(() => {
    registerServiceWorker();
    (async () => {
      await refreshPush();
    })();
  }, [refreshPush]);

  useEffect(() => {
    if (!("locks" in navigator)) {
      leaderRef.current = true;
      return;
    }
    const controller = new AbortController();
    navigator.locks
      .request("atm-deck-notifier", { signal: controller.signal }, () => {
        leaderRef.current = true;
        // Held until this tab goes away.
        return new Promise<void>(() => {});
      })
      .catch(() => {});
    return () => {
      controller.abort();
      leaderRef.current = false;
    };
  }, []);

  // Live events, once the first summary says where to start from.
  useEffect(() => {
    if (!asOf) return;
    const source = new EventSource(`/api/notifications/stream?since=${encodeURIComponent(asOf)}`);

    const isNew = (id: string, createdAt: string) => {
      if (seenRef.current.has(id)) return false;
      seenRef.current.add(id);
      // Already counted by the summary this tab last loaded.
      return !asOfRef.current || createdAt > asOfRef.current;
    };

    source.addEventListener("messages", (event) => {
      const notices: ChatNotice[] = JSON.parse((event as MessageEvent).data);
      for (const n of notices) {
        if (!isNew(n.messageId, n.createdAt)) continue;
        if (chatChannelOf(pathnameRef.current) === n.channelId && isVisible()) {
          markChannelRead(n.channelId);
          continue;
        }
        setChannelUnread((prev) => ({ ...prev, [n.channelId]: (prev[n.channelId] ?? 0) + 1 }));
        alertRef.current(chatNoticeText(tRef.current, n));
      }
    });

    source.addEventListener("tasks", (event) => {
      const notices: TaskNotice[] = JSON.parse((event as MessageEvent).data);
      for (const n of notices) {
        if (!isNew(n.notificationId, n.createdAt)) continue;
        alertRef.current(taskNoticeText(tRef.current, n));
        if (pathnameRef.current.startsWith("/my-tasks") && isVisible()) {
          // Already looking at the list — mark it read and reload the
          // (server-rendered) list so the new task appears in it.
          fetch("/api/notifications/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId: n.taskId }),
          }).catch(() => {});
          router.refresh();
          continue;
        }
        setTasks((prev) => [...prev.filter((p) => p.notificationId !== n.notificationId), n]);
      }
    });

    // The stream closes itself every ~50s and EventSource reconnects; resync
    // the counts then, which also picks up reads made in other tabs.
    let opened = false;
    source.addEventListener("open", () => {
      if (opened) loadSummary();
      opened = true;
    });

    return () => source.close();
  }, [asOf, loadSummary, markChannelRead, router]);

  // On navigating somewhere, and on coming back to this tab. (The ref-syncing
  // effect above has already run, so markViewedRead sees this pathname.)
  useEffect(() => {
    markViewedRead();
    document.addEventListener("visibilitychange", markViewedRead);
    return () => document.removeEventListener("visibilitychange", markViewedRead);
  }, [pathname, markViewedRead]);

  const chatUnreadTotal = useMemo(
    () => Object.values(channelUnread).reduce((sum, n) => sum + n, 0),
    [channelUnread],
  );
  const taskUnreadCount = tasks.length;
  const total = chatUnreadTotal + taskUnreadCount;

  // "(3) ATM Deck" in the tab title. Next rewrites <title> on navigation, so
  // re-apply the prefix whenever it does.
  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(/^\(\d+\+?\) /, "");
      const next = total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [total]);

  // Badge on the installed app's icon, where supported.
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (count?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (total > 0) nav.setAppBadge?.(total).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [total]);

  const value = useMemo(
    () => ({ channelUnread, chatUnreadTotal, taskUnreadCount, markTaskRead, pushActive, refreshPush }),
    [channelUnread, chatUnreadTotal, taskUnreadCount, markTaskRead, pushActive, refreshPush],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

/** A small count pill for nav items and channel rows. */
export function UnreadBadge({ count, className = "" }: { count: number; className?: string }) {
  const t = useTranslations("Notifications");
  if (count <= 0) return null;
  return (
    <span
      aria-label={t("unreadAria", { count })}
      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
