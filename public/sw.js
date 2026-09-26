// ATM Deck service worker — shows notifications only; it caches nothing, so the
// app behaves exactly as it does without it.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const ICON = "/pwa-icon/192";
const BADGE = "/pwa-icon/badge";

// Payload shape: { title, body, url, tag } — see PushPayload in src/lib/push.ts.
self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data ? event.data.json() : null;
  } catch {
    data = null;
  }
  if (!data || !data.title) return;

  event.waitUntil(
    (async () => {
      // A visible ATM Deck tab already shows it in-app (toast + badges).
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows.some((client) => client.visibilityState === "visible")) return;

      await self.registration.showNotification(data.title, {
        body: data.body,
        tag: data.tag,
        renotify: Boolean(data.tag),
        icon: ICON,
        badge: BADGE,
        data: { url: data.url || "/" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        if (existing.url !== target && "navigate" in existing) {
          await existing.navigate(target).catch(() => {});
        }
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
