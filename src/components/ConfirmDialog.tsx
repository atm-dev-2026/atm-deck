"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Spinner } from "./Spinner";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  pendingLabel,
  destructive = true,
  pending = false,
  error = null,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Common");
  const resolvedConfirmLabel = confirmLabel ?? t("delete");
  const resolvedCancelLabel = cancelLabel ?? t("cancel");
  const resolvedPendingLabel = pendingLabel ?? t("deleting");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
      onClick={() => !pending && onCancel()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-strong w-full max-w-sm rounded-lg p-4"
      >
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
        {description && <div className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</div>}
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium disabled:cursor-wait disabled:opacity-70 ${
              destructive
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-accent text-accent-foreground hover:bg-accent-hover"
            }`}
          >
            {pending && <Spinner size={12} />}
            {pending ? resolvedPendingLabel : resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
