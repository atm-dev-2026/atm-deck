// Shared by the server (Web Push text) and the client (toasts / in-page system
// notifications) so both say the same thing. No server-only imports here.

/** A translator scoped to the "Notifications" namespace. */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** A new chat message, as the notification stream sends it. */
export type ChatNotice = {
  messageId: string;
  channelId: string;
  channelName: string | null;
  isDirect: boolean;
  parentId: string | null;
  authorName: string | null;
  text: string;
  firstAttachmentName: string | null;
  createdAt: string;
};

/** A task assigned to the recipient, as the notification stream sends it. */
export type TaskNotice = {
  notificationId: string;
  taskId: string;
  taskTitle: string;
  boardId: string;
  boardName: string;
  actorName: string | null;
  createdAt: string;
};

export type NoticeText = { title: string; body: string; url: string; tag: string };

const PREVIEW_LENGTH = 140;

function preview(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > PREVIEW_LENGTH ? `${oneLine.slice(0, PREVIEW_LENGTH - 1)}…` : oneLine;
}

export function chatNoticeText(t: Translate, n: ChatNotice): NoticeText {
  const name = n.authorName ?? t("someone");
  const text = n.text.trim()
    ? preview(n.text)
    : n.firstAttachmentName
      ? t("chat.attachment", { fileName: n.firstAttachmentName })
      : t("chat.emptyBody");

  // DMs are titled by who wrote; channels by the channel, with the author in the body.
  const baseTitle = n.isDirect ? name : t("chat.channelTitle", { channel: n.channelName ?? "" });
  return {
    title: n.parentId ? t("chat.threadTitle", { title: baseTitle }) : baseTitle,
    body: n.isDirect ? text : t("chat.channelBody", { name, text }),
    url: `/chat/${n.channelId}`,
    tag: `chat-${n.channelId}`,
  };
}

export function taskNoticeText(t: Translate, n: TaskNotice): NoticeText {
  return {
    title: t("task.title"),
    body: t("task.body", {
      name: n.actorName ?? t("someone"),
      task: preview(n.taskTitle),
      board: n.boardName,
    }),
    url: `/board/${n.boardId}?task=${n.taskId}`,
    tag: `task-${n.taskId}`,
  };
}
