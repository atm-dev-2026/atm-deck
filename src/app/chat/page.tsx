"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { useChatSidebar } from "./ChatSidebarContext";

export default function ChatHome() {
  const router = useRouter();
  const { toggleSidebar } = useChatSidebar();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch("/api/channels");
      if (!res.ok || ignore) return;
      const data = await res.json();
      if (data.joined?.length > 0) {
        router.replace(`/chat/${data.joined[0].id}`);
      } else {
        setChecked(true);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1.5 border-b border-zinc-200 px-2 py-3 dark:border-zinc-800 md:hidden">
        <button
          onClick={toggleSidebar}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Toggle channel list"
        >
          <Menu size={16} />
        </button>
      </div>
      {checked && (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-zinc-500">
          Pick a channel or direct message, or create a new channel to get started.
        </div>
      )}
    </div>
  );
}
