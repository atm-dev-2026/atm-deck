"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LogOut, Settings, Users } from "lucide-react";
import { Avatar } from "./Avatar";
import { GodModeAvatarRing, GodModeToggle } from "./GodModeToggle";
import { SubmitButton } from "./SubmitButton";

export function UserMenu({
  name,
  email,
  image,
  signOutAction,
  placement = "right",
  canManageUsers = false,
  canUseGodMode = false,
  godMode = false,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
  signOutAction: () => Promise<void>;
  placement?: "right" | "top";
  canManageUsers?: boolean;
  canUseGodMode?: boolean;
  godMode?: boolean;
}) {
  const t = useTranslations("Shell.userMenu");
  const tNav = useTranslations("Shell.nav");
  const [open, setOpen] = useState(false);
  const label = name ?? email ?? "?";

  // On desktop these live in the rail's SidebarActions group; the mobile
  // bottom bar has no room for it, so they stay in this popover there.
  const links =
    placement === "top"
      ? [
          ...(canManageUsers ? [{ href: "/member", label: tNav("membersTitle"), icon: Users }] : []),
          { href: "/settings", label: t("settings"), icon: Settings },
        ]
      : [];

  return (
    <div className={placement === "right" ? "relative" : "relative flex flex-1"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          placement === "right"
            ? "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-900/5 dark:hover:bg-white/5"
            : "mx-1 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium text-zinc-400 transition-colors dark:text-zinc-500"
        }
        title={label}
      >
        <GodModeAvatarRing active={godMode}>
          <Avatar label={label} image={image} size={placement === "right" ? "sm" : "xs"} />
        </GodModeAvatarRing>
        {placement === "top" && t("me")}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={
              placement === "right"
                ? "glass-strong absolute bottom-0 left-full z-20 ml-2 w-60 rounded-lg p-1"
                : "glass-strong fixed bottom-16 right-3 z-20 w-60 max-w-[calc(100vw-1.5rem)] rounded-lg p-1"
            }
          >
            <div className="mb-1 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">{name ?? t("signedIn")}</p>
              {email && <p className="truncate text-xs text-zinc-500">{email}</p>}
            </div>
            {canUseGodMode && <GodModeToggle enabled={godMode} />}
            {links.map(({ href, label: linkLabel, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <Icon size={14} />
                {linkLabel}
              </Link>
            ))}
            <form action={signOutAction}>
              <SubmitButton
                pendingLabel={t("signingOut")}
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <LogOut size={14} />
                {t("signOut")}
              </SubmitButton>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
