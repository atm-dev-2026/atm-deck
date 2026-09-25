"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

export type RoleTab = { id: string; label: string; count: number; warn?: boolean };

/** Horizontally scrolling tab strip with arrow buttons when the roles overflow. */
export function RoleTabs({
  tabs,
  active,
  onChange,
  onAddRole,
}: {
  tabs: RoleTab[];
  active: string;
  onChange: (id: string) => void;
  onAddRole: () => void;
}) {
  const t = useTranslations("Members");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () =>
      setOverflow({
        left: el.scrollLeft > 1,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [tabs.length]);

  const scrollBy = (direction: 1 | -1) =>
    scrollerRef.current?.scrollBy({ left: direction * scrollerRef.current.clientWidth * 0.6, behavior: "smooth" });

  const arrow =
    "glass-strong absolute top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 transition-colors hover:text-accent";

  return (
    <div className="relative border-b border-zinc-900/5 dark:border-white/5">
      {overflow.left && (
        <button type="button" onClick={() => scrollBy(-1)} className={`${arrow} left-1`} aria-label={t("scrollTabs")}>
          <ChevronLeft size={15} />
        </button>
      )}
      <div ref={scrollerRef} role="tablist" className="flex items-stretch overflow-x-auto px-2 [scrollbar-width:none]">
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.id)}
              className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-4 py-3 text-xs font-medium transition-colors ${
                selected
                  ? "text-accent"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {tab.label}
              {tab.warn && tab.count > 0 && (
                <span className="rounded-full bg-red-500/15 px-1.5 text-[10px] font-semibold text-red-500">
                  {tab.count}
                </span>
              )}
              {selected && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onAddRole}
          title={t("addRole")}
          className="flex shrink-0 items-center gap-1 whitespace-nowrap px-3 py-3 text-xs text-zinc-400 transition-colors hover:text-accent"
        >
          <Plus size={13} />
          {t("addRole")}
        </button>
      </div>
      {overflow.right && (
        <button type="button" onClick={() => scrollBy(1)} className={`${arrow} right-1`} aria-label={t("scrollTabs")}>
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}
