"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Info, Settings, Users } from "lucide-react";

/** Desktop rail's bottom button group, above the avatar: Manage users (if allowed) + Settings + About. */
export function SidebarActions({ canManageUsers }: { canManageUsers: boolean }) {
  const t = useTranslations("Shell.nav");
  const pathname = usePathname();

  const items = [
    ...(canManageUsers ? [{ href: "/member", label: t("members"), title: t("membersTitle"), icon: Users }] : []),
    { href: "/settings", label: t("settings"), title: t("settings"), icon: Settings },
    { href: "/about", label: t("about"), title: t("about"), icon: Info },
  ];

  return (
    <nav className="flex flex-col items-center gap-1 rounded-2xl bg-zinc-900/[0.03] p-1.5 dark:bg-white/[0.04]">
      {items.map(({ href, label, title, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            title={title}
            className={`group flex h-11 w-11 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-xl text-[9.5px] font-medium leading-none transition-all duration-300 ${
              active
                ? "bg-accent/15 text-accent shadow-glow dark:bg-accent/20"
                : "text-zinc-400 hover:-translate-y-0.5 hover:bg-zinc-900/5 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200"
            }`}
          >
            <Icon
              size={18}
              strokeWidth={active ? 2.25 : 2}
              className="shrink-0 transition-transform duration-300 group-hover:scale-110"
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
