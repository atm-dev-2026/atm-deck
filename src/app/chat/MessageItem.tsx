"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/Avatar";
import { Spinner } from "@/components/Spinner";
import { AttachmentView } from "./AttachmentView";
import { ChatMessage, QUICK_REACTIONS } from "./types";

export function MessageItem({
  message,
  currentUserId,
  onReact,
  onSave,
  onDelete,
  onOpenThread,
  showReplyLink = true,
}: {
  message: ChatMessage;
  currentUserId: string;
  onReact: (emoji: string) => void;
  onSave: (body: string) => Promise<boolean>;
  onDelete: () => void;
  onOpenThread?: () => void;
  showReplyLink?: boolean;
}) {
  const t = useTranslations("Chat.message");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);
  const [savingEdit, setSavingEdit] = useState(false);
  const isMine = message.user.id === currentUserId;

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || savingEdit) return;
    setSavingEdit(true);
    const ok = await onSave(draft.trim());
    setSavingEdit(false);
    if (ok) setEditing(false);
  };

  return (
    <div className="group flex gap-3 rounded-lg px-2 py-1.5 transition-colors duration-300 hover:bg-zinc-900/[0.03] dark:hover:bg-white/[0.04]">
      <Avatar label={message.user.name ?? message.user.email ?? "?"} image={message.user.image} size="md" />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {message.user.name ?? message.user.email}
          </span>
          <span className="text-xs text-zinc-400">
            {new Date(message.createdAt).toLocaleString()}
          </span>
          {message.editedAt && (
            <span className="text-xs text-zinc-400">{t("edited")}</span>
          )}
        </div>

        {editing ? (
          <form onSubmit={submitEdit} className="mt-1 flex gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={savingEdit}
              className="glass-field min-w-0 flex-1 rounded px-2 py-1 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-wait dark:text-zinc-50"
            />
            <button
              type="submit"
              disabled={savingEdit}
              className="flex items-center gap-1.5 rounded bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
            >
              {savingEdit && <Spinner size={11} />}
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(message.body);
              }}
              disabled={savingEdit}
              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {t("cancel")}
            </button>
          </form>
        ) : (
          <>
            {message.body && (
              <p className="whitespace-pre-wrap break-words text-sm text-zinc-800 dark:text-zinc-200">
                {message.body}
              </p>
            )}
            {message.attachments.map((attachment) => (
              <AttachmentView key={attachment.id} attachment={attachment} />
            ))}
          </>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1">
          {message.reactions.map((r) => (
            <button
              key={r.emoji}
              onClick={() => onReact(r.emoji)}
              className={`rounded-full border px-1.5 py-0.5 text-xs ${
                r.reactedByMe
                  ? "border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-800"
                  : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              }`}
            >
              {r.emoji} {r.count}
            </button>
          ))}

          <div className="relative hidden items-center gap-0.5 group-hover:flex">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className="rounded px-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title={t("reactAria", { emoji })}
              >
                {emoji}
              </button>
            ))}
          </div>

          {showReplyLink && (
            <button
              onClick={onOpenThread}
              className="ml-1 text-xs text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              {message.replyCount > 0 ? t("replyCount", { n: message.replyCount }) : t("replyInThread")}
            </button>
          )}

          {isMine && !editing && (
            <span className="ml-1 hidden gap-2 text-xs text-zinc-400 group-hover:inline-flex">
              <button
                onClick={() => setEditing(true)}
                className="hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                {t("edit")}
              </button>
              <button onClick={onDelete} className="hover:text-red-500">
                {t("delete")}
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
