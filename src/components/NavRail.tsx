"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, MessageSquare } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Boards", icon: LayoutGrid, match: (p: string) => p === "/" || p.startsWith("/board") },
  { href: "/chat", label: "Chat", icon: MessageSquare, match: (p: string) => p.startsWith("/chat") },
];

export function NavRail() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col items-center gap-1">
      {ITEMS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={`flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-lg text-[9px] font-medium transition-colors ${
              active
                ? "bg-accent/10 text-accent dark:bg-accent/20"
                : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
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
