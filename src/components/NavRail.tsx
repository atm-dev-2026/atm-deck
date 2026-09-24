"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutGrid, ListTodo, MessageSquare, ShieldCheck } from "lucide-react";

const ITEM_DEFS = [
  { href: "/", key: "boards" as const, icon: LayoutGrid, match: (p: string) => p === "/" || p.startsWith("/board") },
  { href: "/my-tasks", key: "myTasks" as const, icon: ListTodo, match: (p: string) => p.startsWith("/my-tasks") },
  { href: "/chat", key: "chat" as const, icon: MessageSquare, match: (p: string) => p.startsWith("/chat") },
];

const ADMIN_DEF = {
  href: "/admin/roles",
  key: "admin" as const,
  icon: ShieldCheck,
  match: (p: string) => p.startsWith("/admin"),
};

export function NavRail({ variant = "rail", isAdmin = false }: { variant?: "rail" | "bottom"; isAdmin?: boolean }) {
  const t = useTranslations("Shell.nav");
  const pathname = usePathname();
  const items = isAdmin ? [...ITEM_DEFS, ADMIN_DEF] : ITEM_DEFS;

  return (
    <nav className={variant === "rail" ? "flex flex-col items-center gap-1" : "flex flex-1 items-stretch"}>
      {items.map(({ href, key, icon: Icon, match }) => {
        const active = match(pathname);
        const label = t(key);
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={`flex items-center justify-center gap-0.5 font-medium transition-all duration-300 ${
              variant === "rail"
                ? "h-10 w-10 flex-col rounded-lg text-[9px]"
                : "mx-1 flex-1 flex-col gap-0.5 rounded-lg py-1.5 text-[10px]"
            } ${
              active
                ? "bg-accent/15 text-accent shadow-glow dark:bg-accent/20"
                : "text-zinc-400 hover:-translate-y-0.5 hover:bg-zinc-900/5 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200"
            }`}
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
