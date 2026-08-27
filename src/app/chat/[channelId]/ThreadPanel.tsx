"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { ChatMessage } from "../types";
import { MessageItem } from "../MessageItem";
import { PendingAttachmentList } from "../AttachmentView";
import { useAttachmentUpload } from "../useAttachmentUpload";

export function ThreadPanel({
  messageId,
  currentUserId,
  onClose,
}: {
  messageId: string;
  currentUserId: string;
  onClose: () => void;
}) {
  const [parent, setParent] = useState<ChatMessage | null>(null);
  const [replies, setReplies] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentUpload = useAttachmentUpload(parent?.channelId ?? "");

  const load = async () => {
    const res = await fetch(`/api/messages/${messageId}/thread`);
    if (!res.ok) return;
    const data = await res.json();
    setParent(data.parent);
    setReplies(data.replies);
  };

  useEffect(() => {
    (async () => {
      await load();
    })();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageId]);

  const react = async (id: string, emoji: string) => {
    await fetch(`/api/messages/${id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    load();
  };

  const saveEdit = async (id: string, body: string) => {
    await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/messages/${id}`, { method: "DELETE" });
    load();
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parent) return;
    const body = draft.trim();
    if (!body && attachmentUpload.pending.length === 0) return;

    let attachments;
    try {
      attachments = await attachmentUpload.uploadAll();
    } catch {
      return;
    }

    await fetch(`/api/channels/${parent.channelId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, parentId: parent.id, attachments }),
    });
    setDraft("");
    load();
  };

  return (
    <div
      className="fixed inset-0 z-30 flex justify-end bg-black/20 md:static md:z-auto md:shrink-0 md:bg-transparent"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-sm shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:w-96 md:max-w-none"
      >
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Thread</h2>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Close thread"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {parent && (
          <>
            <MessageItem
              message={parent}
              currentUserId={currentUserId}
              onReact={(emoji) => react(parent.id, emoji)}
              onSave={(body) => saveEdit(parent.id, body)}
              onDelete={() => remove(parent.id)}
              showReplyLink={false}
            />
            <div className="my-2 border-t border-zinc-100 dark:border-zinc-900" />
          </>
        )}
        <div className="flex flex-col gap-1">
          {replies.map((reply) => (
            <MessageItem
              key={reply.id}
              message={reply}
              currentUserId={currentUserId}
              onReact={(emoji) => react(reply.id, emoji)}
              onSave={(body) => saveEdit(reply.id, body)}
              onDelete={() => remove(reply.id)}
              showReplyLink={false}
            />
          ))}
        </div>
      </div>

      {attachmentUpload.error && (
        <p className="px-3 pt-2 text-xs text-red-500">{attachmentUpload.error}</p>
      )}
      <PendingAttachmentList
        pending={attachmentUpload.pending}
        onRemove={attachmentUpload.removeFile}
      />

      <form
        onSubmit={sendReply}
        className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) attachmentUpload.addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Attach file"
        >
          <Paperclip size={14} />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Reply…"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={attachmentUpload.uploading}
          className="flex items-center rounded-md bg-accent px-2.5 py-1.5 text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
        >
          <Send size={13} />
        </button>
      </form>
      </aside>
    </div>
  );
}
