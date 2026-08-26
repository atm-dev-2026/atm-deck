"use client";

import { useState } from "react";
import { PRIORITIES, priorityConfig, type Priority } from "./priority";

export function PrioritySelect({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (value: Priority) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = priorityConfig(value);
  const Icon = current.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <Icon size={13} className={current.className} strokeWidth={2.5} />
        {current.label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-40 rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {PRIORITIES.map((p) => {
              const PIcon = p.icon;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    onChange(p.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    p.value === value
                      ? "bg-zinc-100 font-medium text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <PIcon size={13} className={p.className} strokeWidth={2.5} />
                  {p.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
