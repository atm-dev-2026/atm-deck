import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  chatNoticeInclude,
  findTaskNotifications,
  toChatNotice,
  toTaskNotice,
} from "@/lib/notifications";
import type { TaskNotice } from "@/lib/notificationText";

export const dynamic = "force-dynamic";

// Same polling-SSE shape as /api/channels/[channelId]/stream, but app-wide:
// new messages in any of the user's channels plus their new task assignments.
const POLL_INTERVAL_MS = 3000;
const MAX_DURATION_MS = 50_000;
// Re-scan this far behind the cursor so a row committed late (its createdAt is
// set before its transaction commits) isn't skipped. Already-sent ids are
// filtered out below, and the client dedupes across reconnects.
const OVERLAP_MS = 5000;
const MAX_CURSOR_AGE_MS = 10 * 60_000;
// Only caps a burst (e.g. resuming a stale cursor) — it's alerts, not history.
const MAX_BATCH = 100;

function initialCursor(request: Request): Date {
  const now = Date.now();
  const raw =
    request.headers.get("last-event-id") ?? new URL(request.url).searchParams.get("since");
  const parsed = raw ? Date.parse(raw) : NaN;
  if (Number.isNaN(parsed) || parsed > now) return new Date(now);
  return new Date(Math.max(parsed, now - MAX_CURSOR_AGE_MS));
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const startedAt = Date.now();
  let cursor = initialCursor(request);
  const sent = new Set<string>();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      request.signal.addEventListener("abort", () => {
        closed = true;
      });

      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };
      const send = (event: string, data: unknown) =>
        write(`id: ${cursor.toISOString()}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      while (!closed && Date.now() - startedAt < MAX_DURATION_MS) {
        try {
          const pollStartedAt = new Date();
          const since = new Date(cursor.getTime() - OVERLAP_MS);

          const [messages, notifications] = await Promise.all([
            prisma.message.findMany({
              where: {
                createdAt: { gt: since },
                userId: { not: user.id },
                channel: { members: { some: { userId: user.id } } },
              },
              orderBy: { createdAt: "asc" },
              take: MAX_BATCH,
              include: chatNoticeInclude,
            }),
            findTaskNotifications(user, { createdAt: { gt: since } }),
          ]);

          const freshMessages = messages.filter((m) => !sent.has(m.id));
          const freshTasks = notifications
            .filter((n) => !sent.has(n.id))
            .map(toTaskNotice)
            .filter((n): n is TaskNotice => n !== null);
          for (const m of messages) sent.add(m.id);
          for (const n of notifications) sent.add(n.id);

          cursor = pollStartedAt;

          if (freshMessages.length) send("messages", freshMessages.map(toChatNotice));
          if (freshTasks.length) send("tasks", freshTasks);
          // Keeps proxies from idling the connection out and surfaces a closed
          // client as an enqueue failure.
          write(": ping\n\n");
        } catch {
          closed = true;
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      try {
        controller.close();
      } catch {
        // already closed
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
