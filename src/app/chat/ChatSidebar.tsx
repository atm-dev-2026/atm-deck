"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Compass, Plus } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Spinner } from "@/components/Spinner";

type Channel = {
  id: string;
  name: string | null;
  topic: string | null;
};

type ChatUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type Dm = {
  id: string;
  other: ChatUser | null;
};

export function ChatSidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const router = useRouter();

  const [joined, setJoined] = useState<Channel[]>([]);
  const [joinable, setJoinable] = useState<Channel[]>([]);
  const [dms, setDms] = useState<Dm[]>([]);
  const [showBrowse, setShowBrowse] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showNewDm, setShowNewDm] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadChannels = async () => {
    const res = await fetch("/api/channels");
    if (!res.ok) return;
    const data = await res.json();
    setJoined(data.joined);
    setJoinable(data.joinable);
  };

  const loadDms = async () => {
    const res = await fetch("/api/dms");
    if (!res.ok) return;
    setDms(await res.json());
  };

  useEffect(() => {
    (async () => {
      await Promise.all([loadChannels(), loadDms()]);
    })();
  }, []);

  const createChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || creatingChannel) return;
    setCreatingChannel(true);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChannelName.trim() }),
      });
      setNewChannelName("");
      setShowCreate(false);
      await loadChannels();
      if (res.ok) {
        const channel = await res.json();
        router.push(`/chat/${channel.id}`);
      }
    } finally {
      setCreatingChannel(false);
    }
  };

  const joinChannel = async (channelId: string) => {
    setPendingId(channelId);
    await fetch(`/api/channels/${channelId}/join`, { method: "POST" });
    await loadChannels();
    router.push(`/chat/${channelId}`);
    setPendingId(null);
    onNavigate?.();
  };

  const openNewDm = async () => {
    setShowNewDm(true);
    if (users.length === 0) {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    }
  };

  const startDm = async (userId: string) => {
    setPendingId(userId);
    const res = await fetch("/api/dms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setShowNewDm(false);
    await loadDms();
    setPendingId(null);
    if (res.ok) {
      const dm = await res.json();
      router.push(`/chat/${dm.id}`);
      onNavigate?.();
    }
  };

  const linkClass = (channelId: string) =>
    `flex items-center gap-2 truncate rounded-md px-2 py-1 text-sm ${
      pathname === `/chat/${channelId}`
        ? "bg-accent/10 font-medium text-accent dark:bg-accent/20"
        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
    }`;

  return (
    <aside className="flex h-full w-full flex-col gap-6 overflow-y-auto border-r border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <div className="mb-1 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Channels
          </h2>
          <div className="flex gap-0.5">
            <button
              onClick={() => setShowBrowse((v) => !v)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              title="Browse channels"
            >
              <Compass size={13} />
            </button>
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              title="Create channel"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {showCreate && (
          <form onSubmit={createChannel} className="mb-2 flex gap-1">
            <input
              autoFocus
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="channel-name"
              className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-accent/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <button
              type="submit"
              disabled={creatingChannel}
              className="flex items-center gap-1.5 rounded bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
            >
              {creatingChannel && <Spinner size={11} />}
              Add
            </button>
          </form>
        )}

        {showBrowse && (
          <div className="mb-2 flex flex-col gap-1 rounded border border-dashed border-zinc-300 p-2 dark:border-zinc-700">
            {joinable.length === 0 && (
              <p className="text-xs text-zinc-400">No more channels to join.</p>
            )}
            {joinable.map((c) => (
              <button
                key={c.id}
                onClick={() => joinChannel(c.id)}
                disabled={pendingId === c.id}
                className="flex items-center justify-between rounded px-1 py-0.5 text-left text-xs text-zinc-600 hover:bg-zinc-100 disabled:cursor-wait dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                <span className="truncate">#{c.name}</span>
                {pendingId === c.id ? <Spinner size={11} /> : <span className="text-zinc-400">join</span>}
              </button>
            ))}
          </div>
        )}

        <nav className="flex flex-col gap-0.5">
          {joined.map((c) => (
            <Link key={c.id} href={`/chat/${c.id}`} className={linkClass(c.id)} onClick={onNavigate}>
              <span className="text-zinc-400">#</span>
              <span className="truncate">{c.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Direct Messages
          </h2>
          <button
            onClick={openNewDm}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            title="New message"
          >
            <Plus size={13} />
          </button>
        </div>

        {showNewDm && (
          <div className="mb-2 flex flex-col gap-1 rounded border border-dashed border-zinc-300 p-2 dark:border-zinc-700">
            {users.length === 0 && (
              <p className="text-xs text-zinc-400">No other users yet.</p>
            )}
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => startDm(u.id)}
                disabled={pendingId === u.id}
                className="flex items-center justify-between gap-2 truncate rounded px-1 py-0.5 text-left text-xs text-zinc-600 hover:bg-zinc-100 disabled:cursor-wait dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                <span className="truncate">{u.name ?? u.email}</span>
                {pendingId === u.id && <Spinner size={11} />}
              </button>
            ))}
          </div>
        )}

        <nav className="flex flex-col gap-0.5">
          {dms.map((dm) => {
            const label = dm.other?.name ?? dm.other?.email ?? "Unknown";
            return (
              <Link key={dm.id} href={`/chat/${dm.id}`} className={linkClass(dm.id)} onClick={onNavigate}>
                <Avatar label={label} image={dm.other?.image} size="xs" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
