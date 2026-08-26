import type { Prisma } from "@/generated/prisma/client";

const messageWithRelations = {
  include: {
    user: { select: { id: true, name: true, email: true, image: true } },
    reactions: { select: { emoji: true, userId: true } },
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
    replyCount: message._count.replies,
  };
}
