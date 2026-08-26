"use client";

import { useEffect, useState } from "react";
import { ChatMessage } from "../types";
import { MessageItem } from "../MessageItem";

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
    if (!draft.trim() || !parent) return;
    await fetch(`/api/channels/${parent.channelId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft.trim(), parentId: parent.id }),
    });
    setDraft("");
    load();
  };

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Thread</h2>
        <button
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Close
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

      <form
        onSubmit={sendReply}
        className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Reply…"
          className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          className="rounded bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Send
        </button>
      </form>
    </aside>
  );
}
