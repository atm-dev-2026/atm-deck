"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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

export function ChatSidebar() {
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
    if (!newChannelName.trim()) return;
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
  };

  const joinChannel = async (channelId: string) => {
    await fetch(`/api/channels/${channelId}/join`, { method: "POST" });
    await loadChannels();
    router.push(`/chat/${channelId}`);
  };

  const openNewDm = async () => {
    setShowNewDm(true);
    if (users.length === 0) {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    }
  };

  const startDm = async (userId: string) => {
    const res = await fetch("/api/dms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setShowNewDm(false);
    await loadDms();
    if (res.ok) {
      const dm = await res.json();
      router.push(`/chat/${dm.id}`);
    }
  };

  const linkClass = (channelId: string) =>
    `block truncate rounded px-2 py-1 text-sm ${
      pathname === `/chat/${channelId}`
        ? "bg-zinc-200 font-medium text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
    }`;

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Channels
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => setShowBrowse((v) => !v)}
              className="text-xs text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              title="Browse channels"
            >
              #
            </button>
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="text-xs text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              title="Create channel"
            >
              +
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
              className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <button
              type="submit"
              className="rounded bg-zinc-950 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
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
                className="flex items-center justify-between rounded px-1 py-0.5 text-left text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                <span className="truncate">#{c.name}</span>
                <span className="text-zinc-400">join</span>
              </button>
            ))}
          </div>
        )}

        <nav className="flex flex-col gap-0.5">
          {joined.map((c) => (
            <Link key={c.id} href={`/chat/${c.id}`} className={linkClass(c.id)}>
              #{c.name}
            </Link>
          ))}
        </nav>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Direct Messages
          </h2>
          <button
            onClick={openNewDm}
            className="text-xs text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            title="New message"
          >
            +
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
                className="truncate rounded px-1 py-0.5 text-left text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                {u.name ?? u.email}
              </button>
            ))}
          </div>
        )}

        <nav className="flex flex-col gap-0.5">
          {dms.map((dm) => (
            <Link key={dm.id} href={`/chat/${dm.id}`} className={linkClass(dm.id)}>
              {dm.other?.name ?? dm.other?.email ?? "Unknown"}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
