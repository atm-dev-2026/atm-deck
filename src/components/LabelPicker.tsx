"use client";

import { useState } from "react";
import { Check, Plus, Tag } from "lucide-react";
import { LABEL_COLORS, type LabelColor } from "./labelColors";

type BoardLabel = { id: string; name: string; color: string };

export function LabelPicker({
  boardLabels,
  selectedIds,
  onToggle,
  onCreate,
}: {
  boardLabels: BoardLabel[];
  selectedIds: string[];
  onToggle: (labelId: string) => void;
  onCreate: (name: string, color: LabelColor) => void;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>("sky");

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), color);
    setName("");
    setCreating(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <Tag size={12} />
        Labels
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-52 rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <div className="max-h-48 overflow-y-auto">
              {boardLabels.length === 0 && (
                <p className="px-2 py-2 text-xs text-zinc-400">No labels yet.</p>
              )}
              {boardLabels.map((label) => {
                const selected = selectedIds.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => onToggle(label.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${LABEL_COLORS[label.color as LabelColor]?.dot ?? LABEL_COLORS.zinc.dot}`} />
                    <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300">{label.name}</span>
                    {selected && <Check size={13} className="text-accent" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-1 border-t border-zinc-100 pt-1 dark:border-zinc-800">
              {creating ? (
                <form onSubmit={submitCreate} className="p-1.5">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Label name"
                    className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-accent/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="flex gap-1">
                      {(Object.keys(LABEL_COLORS) as LabelColor[]).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`h-4 w-4 rounded-full ${LABEL_COLORS[c].dot} ${color === c ? "ring-2 ring-offset-1 ring-zinc-400 dark:ring-offset-zinc-900" : ""}`}
                          aria-label={c}
                        />
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover"
                    >
                      Add
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  <Plus size={13} />
                  Create label
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
