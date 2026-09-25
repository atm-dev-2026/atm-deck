"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/** Centered glass dialog shell — same overlay/escape behavior as ConfirmDialog. */
export function Modal({
  open,
  title,
  onClose,
  dismissible = true,
  width = "max-w-md",
  children,
}: {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  /** False while a request is in flight, so the dialog can't be closed mid-save. */
  dismissible?: boolean;
  width?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
      onClick={() => dismissible && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`glass-strong flex max-h-[calc(100vh-2rem)] w-full ${width} flex-col rounded-xl`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-900/5 px-4 py-3 dark:border-white/5">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={!dismissible}
            className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-900/5 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-white/5 dark:hover:text-zinc-200"
          >
            <X size={14} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
