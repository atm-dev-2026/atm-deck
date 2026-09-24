"use client";

import { useState } from "react";
import { Check, UserX } from "lucide-react";
import { Avatar } from "./Avatar";

type Member = { id: string; name: string | null; email: string | null; image: string | null };

export function AssigneePicker({
  members,
  value,
  onChange,
}: {
  members: Member[];
  value: string | null;
  onChange: (userId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = members.find((m) => m.id === value) ?? null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="glass-field flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-700 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow dark:text-zinc-300"
      >
        {current ? (
          <>
            <Avatar label={current.name ?? current.email ?? "?"} image={current.image} size="xs" />
            {current.name ?? current.email}
          </>
        ) : (
          <>
            <UserX size={13} className="text-zinc-400" />
            Unassigned
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="glass-strong absolute left-0 z-20 mt-1 w-52 rounded-md p-1">
            <div className="max-h-56 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  value === null
                    ? "bg-zinc-100 font-medium text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <UserX size={13} className="shrink-0 text-zinc-400" />
                <span className="flex-1 truncate">Unassigned</span>
                {value === null && <Check size={13} className="text-accent" />}
              </button>
              {members.map((member) => {
                const selected = member.id === value;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      onChange(member.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      selected
                        ? "bg-zinc-100 font-medium text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <Avatar label={member.name ?? member.email ?? "?"} image={member.image} size="xs" />
                    <span className="flex-1 truncate">{member.name ?? member.email}</span>
                    {selected && <Check size={13} className="text-accent" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
