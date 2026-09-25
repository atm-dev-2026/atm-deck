import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { messageInclude, serializeMessage } from "@/lib/chat";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 2000;
const MAX_DURATION_MS = 50_000;
const TYPING_WINDOW_MS = 5000;
// How far back a client-supplied cursor may reach, so a bogus or very old one
// can't turn a poll into a full-history dump.
const MAX_CURSOR_AGE_MS = 10 * 60_000;

/**
 * Where to start polling from: the last event id on an EventSource reconnect
 * (every event carries the cursor as its id), else the `since` snapshot time
 * the server-rendered page loaded its messages at — so messages posted between
 * that render and this stream opening aren't skipped — else now.
 */
function initialCursor(request: Request): Date {
  const now = Date.now();
  const raw =
    request.headers.get("last-event-id") ?? new URL(request.url).searchParams.get("since");
  const parsed = raw ? Date.parse(raw) : NaN;
  if (Number.isNaN(parsed) || parsed > now) return new Date(now);
  return new Date(Math.max(parsed, now - MAX_CURSOR_AGE_MS));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;
  const { channelId } = await params;

  const membership = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
  });
  if (!membership) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  const startedAt = Date.now();
  let cursor = initialCursor(request);

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      request.signal.addEventListener("abort", () => {
        closed = true;
      });

      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(
              `id: ${cursor.toISOString()}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          closed = true;
        }
      };

      while (!closed && Date.now() - startedAt < MAX_DURATION_MS) {
        try {
          const messages = await prisma.message.findMany({
            where: { channelId, parentId: null, updatedAt: { gt: cursor } },
            orderBy: { updatedAt: "asc" },
            include: messageInclude,
          });
          if (messages.length) {
            cursor = messages[messages.length - 1].updatedAt;
            send(
              "messages",
              messages.map((m) => serializeMessage(m, userId)),
            );
          }

          const typing = await prisma.typingIndicator.findMany({
            where: {
              channelId,
              userId: { not: userId },
              updatedAt: { gt: new Date(Date.now() - TYPING_WINDOW_MS) },
            },
            include: { user: { select: { id: true, name: true } } },
          });
          send(
            "typing",
            typing.map((t) => ({ userId: t.userId, name: t.user.name })),
          );
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
