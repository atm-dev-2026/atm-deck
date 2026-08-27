"use client";

import { useEffect, useRef, useState, use } from "react";
import { Hash, Menu, Paperclip, Send } from "lucide-react";
import { useChatUserId } from "../ChatUserContext";
import { useChatSidebar } from "../ChatSidebarContext";
import { MessageItem } from "../MessageItem";
import { PendingAttachmentList } from "../AttachmentView";
import { useAttachmentUpload } from "../useAttachmentUpload";
import { ThreadPanel } from "./ThreadPanel";
import { ChatMessage, ChatUser } from "../types";

type Channel = {
  id: string;
  name: string | null;
  topic: string | null;
  isDirect: boolean;
  members: { userId: string; user: ChatUser }[];
};

type TypingUser = { userId: string; name: string | null };

export default function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = use(params);
  // Remount the view whenever channelId changes, so all local state
  // (messages, thread panel, etc.) resets cleanly instead of leaking
  // between channels.
  return <ChannelView key={channelId} channelId={channelId} />;
}

function ChannelView({ channelId }: { channelId: string }) {
  const currentUserId = useChatUserId();
  const { toggleSidebar } = useChatSidebar();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [draft, setDraft] = useState("");
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSentRef = useRef(0);
  const attachmentUpload = useAttachmentUpload(channelId);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const [channelRes, messagesRes] = await Promise.all([
        fetch(`/api/channels/${channelId}`),
        fetch(`/api/channels/${channelId}/messages`),
      ]);
      if (ignore) return;
      if (!channelRes.ok) {
        setNotFound(true);
        return;
      }
      setChannel(await channelRes.json());
      if (messagesRes.ok) setMessages(await messagesRes.json());
    })();

    return () => {
      ignore = true;
    };
  }, [channelId]);

  useEffect(() => {
    const source = new EventSource(`/api/channels/${channelId}/stream`);

    source.addEventListener("messages", (event) => {
      const incoming: ChatMessage[] = JSON.parse((event as MessageEvent).data);
      setMessages((prev) => {
        const byId = new Map(prev.map((m) => [m.id, m]));
        for (const m of incoming) byId.set(m.id, m);
        return Array.from(byId.values()).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
    });

    source.addEventListener("typing", (event) => {
      const users: TypingUser[] = JSON.parse((event as MessageEvent).data);
      setTypingUsers(users);
    });

    return () => source.close();
  }, [channelId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const sendTyping = () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    fetch(`/api/channels/${channelId}/typing`, { method: "POST" });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body && attachmentUpload.pending.length === 0) return;

    let attachments;
    try {
      attachments = await attachmentUpload.uploadAll();
    } catch {
      return;
    }

    setDraft("");
    const res = await fetch(`/api/channels/${channelId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, attachments }),
    });
    if (res.ok) {
      const message: ChatMessage = await res.json();
      setMessages((prev) => [...prev.filter((m) => m.id !== message.id), message]);
    }
  };

  const react = async (id: string, emoji: string) => {
    const res = await fetch(`/api/messages/${id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      const updated: ChatMessage = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
    }
  };

  const saveEdit = async (id: string, body: string) => {
    const res = await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      const updated: ChatMessage = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/messages/${id}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  if (notFound) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <MobileChatHeader onMenuClick={toggleSidebar} />
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Channel not found, or you don&apos;t have access.
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <MobileChatHeader onMenuClick={toggleSidebar} />
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          Loading…
        </div>
      </div>
    );
  }

  const other = channel.isDirect
    ? channel.members.find((m) => m.userId !== currentUserId)?.user
    : null;
  const title = channel.isDirect ? other?.name ?? other?.email ?? "Direct message" : channel.name;

  const typingLabel =
    typingUsers.length > 0
      ? `${typingUsers.map((t) => t.name ?? "Someone").join(", ")} ${
          typingUsers.length === 1 ? "is" : "are"
        } typing…`
      : "";

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="glass relative z-10 flex items-center gap-1.5 rounded-none border-x-0 border-t-0 px-2 py-3 sm:px-4">
          <button
            onClick={toggleSidebar}
            className="mr-1 shrink-0 rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 md:hidden"
            aria-label="Toggle channel list"
          >
            <Menu size={16} />
          </button>
          {!channel.isDirect && <Hash size={14} className="shrink-0 text-zinc-400" />}
          <div className="min-w-0">
            <h1 className="truncate font-serif text-base font-semibold text-zinc-950 dark:text-zinc-50">
              {title}
            </h1>
            {channel.topic && (
              <p className="truncate text-xs text-zinc-500">{channel.topic}</p>
            )}
          </div>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-2 py-3">
          <div className="flex flex-col gap-1">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                onReact={(emoji) => react(message.id, emoji)}
                onSave={(body) => saveEdit(message.id, body)}
                onDelete={() => remove(message.id)}
                onOpenThread={() => setOpenThreadId(message.id)}
              />
            ))}
            {messages.length === 0 && (
              <p className="px-2 py-8 text-center text-sm text-zinc-400">
                No messages yet — say hello.
              </p>
            )}
          </div>
        </div>

        <div className="h-5 px-4 text-xs text-zinc-400">
          {typingLabel}
          {attachmentUpload.error && (
            <span className="text-red-500">{attachmentUpload.error}</span>
          )}
        </div>

        <PendingAttachmentList
          pending={attachmentUpload.pending}
          onRemove={attachmentUpload.removeFile}
        />

        <form
          onSubmit={sendMessage}
          className="glass relative z-10 flex gap-2 rounded-none border-x-0 border-b-0 p-3"
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
            className="shrink-0 rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Attach file"
          >
            <Paperclip size={16} />
          </button>
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              sendTyping();
            }}
            placeholder={channel.isDirect ? `Message ${title}` : `Message #${channel.name}`}
            className="glass-field min-w-0 flex-1 rounded-md px-3 py-2 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={attachmentUpload.uploading}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground shadow-glow transition-transform hover:-translate-y-0.5 hover:bg-accent-hover disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </form>
      </div>

      {openThreadId && (
        <ThreadPanel
          messageId={openThreadId}
          currentUserId={currentUserId}
          onClose={() => setOpenThreadId(null)}
        />
      )}
    </div>
  );
}

function MobileChatHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <div className="glass relative z-10 flex items-center gap-1.5 rounded-none border-x-0 border-t-0 px-2 py-3 md:hidden">
      <button
        onClick={onMenuClick}
        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-label="Toggle channel list"
      >
        <Menu size={16} />
      </button>
    </div>
  );
}
