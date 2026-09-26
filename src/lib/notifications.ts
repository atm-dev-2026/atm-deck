import { createTranslator, type AbstractIntlMessages } from "next-intl";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { afterResponse } from "@/lib/afterResponse";
import { boardListWhereClause } from "@/lib/permissions";
import { sendPush } from "@/lib/push";
import type { CurrentUser } from "@/lib/current-user";
import type { Locale } from "@/i18n/locales";
import {
  chatNoticeText,
  taskNoticeText,
  type ChatNotice,
  type TaskNotice,
  type Translate,
} from "@/lib/notificationText";
import en from "../../messages/en.json";
import th from "../../messages/th.json";

const MESSAGES = { en, th } as const;

/** Push text is built outside any request's locale, so translate explicitly. */
export function translatorFor(locale: Locale, namespace = "Notifications"): Translate {
  // The namespace is dynamic, so next-intl can't type-check keys against it.
  return createTranslator({
    locale,
    messages: MESSAGES[locale] as AbstractIntlMessages,
    namespace,
  }) as unknown as Translate;
}

// ---------------------------------------------------------------------------
// Chat messages

export const chatNoticeInclude = {
  user: { select: { name: true, email: true } },
  channel: { select: { name: true, isDirect: true } },
  attachments: { select: { fileName: true }, orderBy: { createdAt: "asc" }, take: 1 },
} satisfies Prisma.MessageInclude;

type MessageForNotice = Prisma.MessageGetPayload<{ include: typeof chatNoticeInclude }>;

export function toChatNotice(m: MessageForNotice): ChatNotice {
  return {
    messageId: m.id,
    channelId: m.channelId,
    channelName: m.channel.name,
    isDirect: m.channel.isDirect,
    parentId: m.parentId,
    authorName: m.user.name ?? m.user.email,
    text: m.body,
    firstAttachmentName: m.attachments[0]?.fileName ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

/**
 * Pushes a new message to every other member of its channel. Unread state
 * needs no write here — it's derived from ChannelMember.lastReadAt — and open
 * tabs pick the message up from /api/notifications/stream.
 */
export async function notifyChatMessage(messageId: string): Promise<void> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { ...chatNoticeInclude, channel: { select: { name: true, isDirect: true, members: { select: { userId: true } } } } },
  });
  if (!message) return;

  const recipients = message.channel.members
    .map((m) => m.userId)
    .filter((id) => id !== message.userId);
  const notice = toChatNotice(message);
  await sendPush(recipients, (locale) => chatNoticeText(translatorFor(locale), notice));
}

// ---------------------------------------------------------------------------
// Task assignments

export const taskNotificationInclude = {
  actor: { select: { name: true, email: true } },
  task: {
    select: {
      id: true,
      title: true,
      column: { select: { board: { select: { id: true, name: true } } } },
    },
  },
} satisfies Prisma.NotificationInclude;

type NotificationForNotice = Prisma.NotificationGetPayload<{ include: typeof taskNotificationInclude }>;

export function toTaskNotice(n: NotificationForNotice): TaskNotice | null {
  if (!n.task) return null;
  return {
    notificationId: n.id,
    taskId: n.task.id,
    taskTitle: n.task.title,
    boardId: n.task.column.board.id,
    boardName: n.task.column.board.name,
    actorName: n.actor ? n.actor.name ?? n.actor.email : null,
    createdAt: n.createdAt.toISOString(),
  };
}

/**
 * Records that `assigneeId` was given `taskId` by `actorId` and pushes it to
 * them. Assigning a task to yourself notifies nobody.
 */
export async function notifyTaskAssigned({
  taskId,
  assigneeId,
  actorId,
}: {
  taskId: string;
  assigneeId: string | null | undefined;
  actorId: string;
}): Promise<void> {
  if (!assigneeId || assigneeId === actorId) return;

  const notification = await prisma.notification.create({
    data: { userId: assigneeId, type: "TASK_ASSIGNED", actorId, taskId },
    include: taskNotificationInclude,
  });
  const notice = toTaskNotice(notification);
  if (!notice) return;

  afterResponse(() =>
    sendPush([assigneeId], (locale) => taskNoticeText(translatorFor(locale), notice)),
  );
}

/**
 * The live task notifications of `user` matching `where` — dropping any whose
 * task was deleted, handed to someone else since, or sits on a board they can
 * no longer see.
 */
export function findTaskNotifications(user: CurrentUser, where: Prisma.NotificationWhereInput) {
  return prisma.notification.findMany({
    where: {
      ...where,
      userId: user.id,
      type: "TASK_ASSIGNED",
      task: {
        deletedAt: null,
        assigneeId: user.id,
        column: { deletedAt: null, board: boardListWhereClause(user) },
      },
    },
    orderBy: { createdAt: "asc" },
    include: taskNotificationInclude,
  });
}

// ---------------------------------------------------------------------------
// Unread summary

export type UnreadSummary = {
  /** channelId → number of unread messages by others (thread replies included). */
  channels: Record<string, number>;
  tasks: TaskNotice[];
};

export async function getUnreadSummary(user: CurrentUser): Promise<UnreadSummary> {
  const [channelRows, taskNotifications] = await Promise.all([
    prisma.$queryRaw<{ channelId: string; count: number }[]>`
      SELECT m."channelId", COUNT(*)::int AS "count"
      FROM "Message" m
      JOIN "ChannelMember" cm ON cm."channelId" = m."channelId" AND cm."userId" = ${user.id}
      WHERE m."userId" <> ${user.id} AND m."createdAt" > cm."lastReadAt"
      GROUP BY m."channelId"
    `,
    findTaskNotifications(user, { readAt: null }),
  ]);

  return {
    channels: Object.fromEntries(channelRows.map((r) => [r.channelId, r.count])),
    tasks: taskNotifications.map(toTaskNotice).filter((n): n is TaskNotice => n !== null),
  };
}
