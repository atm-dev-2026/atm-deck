"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, MessageSquare } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Boards", icon: LayoutGrid, match: (p: string) => p === "/" || p.startsWith("/board") },
  { href: "/chat", label: "Chat", icon: MessageSquare, match: (p: string) => p.startsWith("/chat") },
];

export function NavRail({ variant = "rail" }: { variant?: "rail" | "bottom" }) {
  const pathname = usePathname();

  return (
    <nav className={variant === "rail" ? "flex flex-col items-center gap-1" : "flex flex-1 items-stretch"}>
      {ITEMS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
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
