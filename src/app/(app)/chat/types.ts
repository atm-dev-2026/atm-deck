export type ChatUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type ReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export type ChatAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

export type ChatMessage = {
  id: string;
  channelId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  user: ChatUser;
  reactions: ReactionSummary[];
  attachments: ChatAttachment[];
  replyCount: number;
};

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "👀", "✅"];
