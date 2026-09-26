"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MailOpen } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { useDateLocale } from "@/components/CalendarProvider";

export type InviteView =
  | { state: "active"; roleName: string; inviterName: string; expiresAt: string }
  | { state: "notFound" | "expired" | "used" | "alreadyMember" };

export function InviteAccept({ token, view, email }: { token: string; view: InviteView; email: string }) {
  const t = useTranslations("Invite");
  const tCommon = useTranslations("Common");
  const locale = useDateLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error ?? tCommon("somethingWentWrong"));
    } catch {
      setError(tCommon("somethingWentWrong"));
    }
    setPending(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass-strong w-full max-w-sm rounded-2xl p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <MailOpen size={20} />
        </div>

        {view.state === "active" ? (
          <>
            <h1 className="mt-5 font-serif text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {t("heading")}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              {t("body", { inviter: view.inviterName, role: view.roleName })}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {t("expiresAt", {
                time: new Date(view.expiresAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
              })}
            </p>
            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
            <button
              type="button"
              onClick={accept}
              disabled={pending}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
            >
              {pending && <Spinner size={14} />}
              {pending ? t("accepting") : t("accept")}
            </button>
          </>
        ) : (
          <>
            <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-300">{t(view.state)}</p>
            {view.state === "alreadyMember" && (
              <Link
                href="/"
                className="glass-field mt-6 inline-flex items-center rounded-md px-3 py-1.5 text-sm text-zinc-600 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow dark:text-zinc-300"
              >
                {t("goHome")}
              </Link>
            )}
          </>
        )}

        {email && <p className="mt-6 text-xs text-zinc-400">{t("signedInAs", { email })}</p>}
      </div>
    </div>
  );
}
