"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutGrid, ListTodo, MessageSquare } from "lucide-react";

const ITEM_DEFS = [
  { href: "/", key: "boards" as const, icon: LayoutGrid, match: (p: string) => p === "/" || p.startsWith("/board") },
  { href: "/my-tasks", key: "myTasks" as const, icon: ListTodo, match: (p: string) => p.startsWith("/my-tasks") },
  { href: "/chat", key: "chat" as const, icon: MessageSquare, match: (p: string) => p.startsWith("/chat") },
];

export function NavRail({ variant = "rail" }: { variant?: "rail" | "bottom" }) {
  const t = useTranslations("Shell.nav");
  const pathname = usePathname();

  return (
    <nav
      className={
        variant === "rail"
          ? "flex flex-col items-center gap-1 rounded-2xl bg-zinc-900/[0.03] p-1.5 dark:bg-white/[0.04]"
          : "flex flex-1 items-stretch"
      }
    >
      {ITEM_DEFS.map(({ href, key, icon: Icon, match }) => {
        const active = match(pathname);
        const label = t(key);
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={`group flex items-center justify-center gap-1 whitespace-nowrap font-medium leading-none transition-all duration-300 ${
              variant === "rail"
                ? "h-11 w-11 flex-col rounded-xl text-[9.5px]"
                : "mx-1 flex-1 flex-col gap-1 rounded-lg py-1.5 text-[10px]"
            } ${
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
