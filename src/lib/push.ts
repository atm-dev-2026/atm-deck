import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { defaultLocale, locales, type Locale } from "@/i18n/locales";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
// Contact for push services (Google/Apple/Mozilla) — a mailto: or https: URL.
const subject = process.env.VAPID_SUBJECT;

/** Web Push only runs once all three VAPID env vars are set. */
export const pushConfigured = Boolean(publicKey && privateKey && subject);

if (pushConfigured) {
  webpush.setVapidDetails(subject!, publicKey!, privateKey!);
}

/** What the service worker (public/sw.js) turns into a system notification. */
export type PushPayload = {
  title: string;
  body: string;
  url: string;
  /** Notifications sharing a tag replace each other instead of piling up. */
  tag: string;
};

export function toLocale(value: string | null | undefined): Locale {
  return (locales as readonly string[]).includes(value ?? "") ? (value as Locale) : defaultLocale;
}

/**
 * Pushes to every live browser subscription of `userIds`, rendering the payload
 * in each subscription's own language. Skips users who lost their role (they're
 * locked out of the app) and subscriptions whose login session has expired.
 * Subscriptions the push service reports gone (404/410) are deleted.
 */
export async function sendPush(
  userIds: string[],
  build: (locale: Locale) => PushPayload,
): Promise<void> {
  if (!pushConfigured || userIds.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId: { in: userIds },
      user: { departmentMemberships: { some: {} } },
      session: { expires: { gt: new Date() } },
    },
  });
  await deliver(subscriptions, build);
}

type StoredSubscription = { id: string; endpoint: string; p256dh: string; auth: string; locale: string };

export async function deliver(
  subscriptions: StoredSubscription[],
  build: (locale: Locale) => PushPayload,
): Promise<{ sent: number; failed: number }> {
  if (!pushConfigured) return { sent: 0, failed: subscriptions.length };

  const payloads = new Map<Locale, string>();
  const payloadFor = (locale: Locale) => {
    let payload = payloads.get(locale);
    if (!payload) {
      payload = JSON.stringify(build(locale));
      payloads.set(locale, payload);
    }
    return payload;
  };

  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payloadFor(toLocale(s.locale)),
          { TTL: 60 * 60, urgency: "high" },
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          gone.push(s.id);
        } else {
          console.error("Web push failed", status, error);
        }
      }
    }),
  );

  if (gone.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
  }
  return { sent, failed: subscriptions.length - sent };
}
