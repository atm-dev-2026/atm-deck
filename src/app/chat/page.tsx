"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChatHome() {
  const router = useRouter();
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

  if (!checked) return null;

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
      Pick a channel or direct message, or create a new channel to get started.
    </div>
  );
}
