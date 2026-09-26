// Browser-side helpers for system notifications and Web Push. The server side
// lives in src/lib/push.ts; the service worker is public/sw.js.

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
// Per-device opt-out: permission can't be revoked from script, so turning
// notifications off in Settings is remembered here instead.
const OFF_KEY = "atm-deck-notifications-off";
const SUBSCRIBE_TIMEOUT_MS = 15_000;

export type NotificationSupport =
  | "unsupported"
  // iPhone/iPad Safari: only an app added to the Home Screen can notify.
  | "ios-needs-install"
  | "supported";

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function notificationSupport(): NotificationSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return isIos() && !isStandalone() ? "ios-needs-install" : "unsupported";
  }
  return "supported";
}

/** Whether Web Push (alerts with the app closed) can work here at all. */
export function pushSupported(): boolean {
  return (
    notificationSupport() === "supported" && "PushManager" in window && VAPID_PUBLIC_KEY.length > 0
  );
}

export function notificationsTurnedOff(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) === "1";
  } catch {
    return false;
  }
}

function setTurnedOff(off: boolean) {
  try {
    if (off) localStorage.setItem(OFF_KEY, "1");
    else localStorage.removeItem(OFF_KEY);
  } catch {
    // Private mode etc. — the setting just won't stick.
  }
}

/** System notifications are on for this device: permission granted and not opted out. */
export function systemNotificationsOn(): boolean {
  return (
    notificationSupport() === "supported" &&
    Notification.permission === "granted" &&
    !notificationsTurnedOff()
  );
}

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (notificationSupport() !== "supported") return Promise.resolve(null);
  registrationPromise ??= navigator.serviceWorker
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .then(() => navigator.serviceWorker.ready)
    .catch((error) => {
      console.error("Service worker registration failed", error);
      registrationPromise = null;
      return null;
    });
  return registrationPromise;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registration = await registerServiceWorker();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/**
 * Subscribes this browser to Web Push (or reuses its existing subscription) and
 * registers it with the server for the signed-in user and current language.
 * Safe to call repeatedly — the server upserts by endpoint.
 */
export async function syncPushSubscription(locale: string): Promise<PushSubscription | null> {
  if (!pushSupported() || !systemNotificationsOn()) return null;
  const registration = await registerServiceWorker();
  if (!registration) return null;

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    // subscribe() can hang forever where the browser can't reach its push
    // service (some privacy browsers, headless Chrome) — don't wait on it.
    (await Promise.race([
      registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Push subscribe timed out")), SUBSCRIBE_TIMEOUT_MS),
      ),
    ]));

  const res = await fetch("/api/push/subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...subscription.toJSON(), locale }),
  });
  if (!res.ok) throw new Error(`Push subscription rejected (${res.status})`);
  return subscription;
}

/**
 * Asks for permission (from a click) and turns system notifications + push on.
 * Push failing isn't fatal: in-tab system notifications still work without it.
 */
export async function turnOnNotifications(locale: string): Promise<boolean> {
  if (notificationSupport() !== "supported") return false;
  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return false;

  setTurnedOff(false);
  await registerServiceWorker();
  if (pushSupported()) {
    await syncPushSubscription(locale).catch((error) =>
      console.warn("Push subscription failed; notifications will only arrive while a tab is open", error),
    );
  }
  return true;
}

export async function turnOffNotifications(): Promise<void> {
  setTurnedOff(true);
  const subscription = await currentPushSubscription().catch(() => null);
  if (!subscription) return;
  await fetch("/api/push/subscription", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => {});
  await subscription.unsubscribe().catch(() => {});
}

/**
 * Shows a system notification from the page (used while a tab is open but
 * hidden). Goes through the service worker so clicks are handled in one place
 * and it works on Android, where `new Notification()` isn't allowed.
 */
export async function showSystemNotification(n: {
  title: string;
  body: string;
  url: string;
  tag: string;
}): Promise<void> {
  if (!systemNotificationsOn()) return;
  const registration = await registerServiceWorker();
  if (!registration) return;
  await registration.showNotification(n.title, {
    body: n.body,
    tag: n.tag,
    icon: "/pwa-icon/192",
    badge: "/pwa-icon/badge",
    data: { url: n.url },
    // `renotify` isn't in TS's lib.dom NotificationOptions yet.
    ...({ renotify: true } as NotificationOptions),
  });
}
