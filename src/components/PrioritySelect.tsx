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
        className="glass-field flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-700 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow dark:text-zinc-300"
      >
        <Icon size={13} className={current.className} strokeWidth={2.5} />
        {current.label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="glass-strong absolute left-0 z-20 mt-1 w-40 rounded-md p-1">
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
