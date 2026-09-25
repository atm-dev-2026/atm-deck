import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const messageWithRelations = {
  include: {
    user: { select: { id: true, name: true, email: true, image: true } },
    reactions: { select: { emoji: true, userId: true } },
    attachments: {
      select: { id: true, fileName: true, fileType: true, fileSize: true },
      orderBy: { createdAt: "asc" },
    },
    _count: { select: { replies: true } },
  },
} satisfies Prisma.MessageDefaultArgs;

export type MessageWithRelations = Prisma.MessageGetPayload<
  typeof messageWithRelations
>;

export const messageInclude = messageWithRelations.include;

export function serializeMessage(
  message: MessageWithRelations,
  currentUserId: string,
) {
  const grouped = new Map<string, { emoji: string; count: number; reactedByMe: boolean }>();
  for (const reaction of message.reactions) {
    const entry = grouped.get(reaction.emoji) ?? {
      emoji: reaction.emoji,
      count: 0,
      reactedByMe: false,
    };
    entry.count += 1;
    if (reaction.userId === currentUserId) entry.reactedByMe = true;
    grouped.set(reaction.emoji, entry);
  }

  return {
    id: message.id,
    channelId: message.channelId,
    parentId: message.parentId,
    body: message.body,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    editedAt: message.editedAt,
    user: message.user,
    reactions: Array.from(grouped.values()),
    attachments: message.attachments,
    replyCount: message._count.replies,
  };
}

/**
 * Loads a channel with its members for `userId` — shared by
 * GET /api/channels/[channelId] and the channel page's server component.
 * Public channels are viewable by non-members (`isMember: false`); DMs are not.
 */
export async function getChannelForUser(channelId: string, userId: string) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });
  if (!channel) return { ok: false as const, status: 404 as const };

  const isMember = channel.members.some((m) => m.userId === userId);
  if (channel.isDirect && !isMember) return { ok: false as const, status: 403 as const };

  return { ok: true as const, channel: { ...channel, isMember } };
}

/**
 * A channel's top-level messages, serialized for `userId`. Does not check
 * membership — callers must, since this backs both GET
 * /api/channels/[channelId]/messages and the channel page.
 */
export async function getChannelMessages(channelId: string, userId: string) {
  const messages = await prisma.message.findMany({
    where: { channelId, parentId: null },
    orderBy: { createdAt: "asc" },
    include: messageInclude,
  });
  return messages.map((m) => serializeMessage(m, userId));
}
