"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Compass, Plus } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import { ChannelListSkeleton, DmListSkeleton } from "@/components/skeletons/ListRowSkeleton";

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
  const t = useTranslations("Chat.sidebar");
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

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
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
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
      if (res.ok) {
        const channel = await res.json();
        setNewChannelName("");
        setShowCreate(false);
        await loadChannels();
        router.push(`/chat/${channel.id}`);
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? t("createChannelFailed"));
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
    `flex items-center gap-2 truncate rounded-md px-2 py-1 text-sm transition-all duration-300 ${
      pathname === `/chat/${channelId}`
        ? "bg-accent/10 font-medium text-accent shadow-glow dark:bg-accent/20"
        : "text-zinc-600 hover:-translate-y-0.5 hover:bg-zinc-900/5 dark:text-zinc-400 dark:hover:bg-white/5"
    }`;

  return (
    <aside className="glass flex h-full w-full flex-col gap-6 overflow-y-auto rounded-none border-y-0 border-l-0 p-3">
      <div>
        <div className="mb-1 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("channels")}
          </h2>
          <div className="flex gap-0.5">
            <button
              onClick={() => setShowBrowse((v) => !v)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              title={t("browseChannels")}
            >
              <Compass size={13} />
            </button>
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              title={t("createChannel")}
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
              className="glass-field min-w-0 flex-1 rounded px-2 py-1 text-xs text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:text-zinc-50"
            />
            <button
              type="submit"
              disabled={creatingChannel}
              className="flex items-center gap-1.5 rounded bg-accent px-2 py-1 text-xs font-medium text-accent-foreground shadow-glow transition-transform hover:-translate-y-0.5 hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
            >
              {creatingChannel && <Spinner size={11} />}
              {t("add")}
            </button>
          </form>
        )}

        {showBrowse && (
          <div className="glass-field mb-2 flex flex-col gap-1 rounded p-2">
            {joinable.length === 0 && (
              <p className="text-xs text-zinc-400">{t("noMoreChannels")}</p>
            )}
            {joinable.map((c) => (
              <button
                key={c.id}
                onClick={() => joinChannel(c.id)}
                disabled={pendingId === c.id}
                className="flex items-center justify-between rounded px-1 py-0.5 text-left text-xs text-zinc-600 hover:bg-zinc-100 disabled:cursor-wait dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                <span className="truncate">#{c.name}</span>
                {pendingId === c.id ? <Spinner size={11} /> : <span className="text-zinc-400">{t("join")}</span>}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div role="status" aria-label={t("loadingChannels")}>
            <ChannelListSkeleton />
          </div>
        ) : (
          <nav className="flex flex-col gap-0.5">
            {joined.map((c) => (
              <Link key={c.id} href={`/chat/${c.id}`} className={linkClass(c.id)} onClick={onNavigate}>
                <span className="text-zinc-400">#</span>
                <span className="truncate">{c.name}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("directMessages")}
          </h2>
          <button
            onClick={openNewDm}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            title={t("newMessage")}
          >
            <Plus size={13} />
          </button>
        </div>

        {showNewDm && (
          <div className="glass-field mb-2 flex flex-col gap-1 rounded p-2">
            {users.length === 0 && (
              <p className="text-xs text-zinc-400">{t("noOtherUsers")}</p>
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

        {loading ? (
          <div role="status" aria-label={t("loadingMessages")}>
            <DmListSkeleton />
          </div>
        ) : (
          <nav className="flex flex-col gap-0.5">
            {dms.map((dm) => {
              const label = dm.other?.name ?? dm.other?.email ?? t("unknown");
              return (
                <Link key={dm.id} href={`/chat/${dm.id}`} className={linkClass(dm.id)} onClick={onNavigate}>
                  <Avatar label={label} image={dm.other?.image} size="xs" />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </aside>
  );
}
