"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Avatar } from "./Avatar";

export function UserMenu({
  name,
  email,
  image,
  signOutAction,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const label = name ?? email ?? "?";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
        title={label}
      >
        <Avatar label={label} image={image} size="sm" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-0 left-full z-20 ml-2 w-52 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">{name ?? "Signed in"}</p>
              {email && <p className="truncate text-xs text-zinc-500">{email}</p>}
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="mt-1 flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
