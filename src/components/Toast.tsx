"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Bell, CheckCircle2, Info, X } from "lucide-react";
import { useTranslations } from "next-intl";

type ToastVariant = "success" | "error" | "info" | "notify";
type ToastItem = { id: string; variant: ToastVariant; message: string; title?: string; href?: string };

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  /** An incoming notification: titled, and opens `href` when clicked. */
  notify: (toast: { title: string; message: string; href: string }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantConfig: Record<ToastVariant, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: "text-emerald-500" },
  error: { icon: AlertCircle, className: "text-red-500" },
  info: { icon: Info, className: "text-accent" },
  notify: { icon: Bell, className: "text-accent" },
};

const DURATION_MS: Record<ToastVariant, number> = { success: 4000, error: 4000, info: 4000, notify: 6000 };
// Notifications can arrive in bursts; keep only the newest few on screen.
const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Common");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeout = timeouts.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeouts.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { ...toast, id }].slice(-MAX_VISIBLE));
      timeouts.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION_MS[toast.variant]),
      );
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    success: (message) => push({ variant: "success", message }),
    error: (message) => push({ variant: "error", message }),
    info: (message) => push({ variant: "info", message }),
    notify: ({ title, message, href }) => push({ variant: "notify", title, message, href }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-50 flex flex-col gap-2 sm:bottom-4">
        {toasts.map((toast) => {
          const { icon: Icon, className } = variantConfig[toast.variant];
          const content = (
            <>
              <Icon size={15} className={`mt-0.5 shrink-0 ${className}`} />
              <div className="min-w-0 flex-1">
                {toast.title && (
                  <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">{toast.title}</p>
                )}
                <p className={toast.title ? "line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400" : undefined}>
                  {toast.message}
                </p>
              </div>
            </>
          );
          return (
            <div
              key={toast.id}
              className="glass-strong pointer-events-auto flex max-w-sm items-start gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-800 dark:text-zinc-200"
            >
              {toast.href ? (
                <Link
                  href={toast.href}
                  onClick={() => dismiss(toast.id)}
                  className="flex min-w-0 flex-1 items-start gap-2"
                >
                  {content}
                </Link>
              ) : (
                content
              )}
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                aria-label={t("dismiss")}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
