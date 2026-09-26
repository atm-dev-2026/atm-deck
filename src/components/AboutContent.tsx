"use client";

import { useRef, type PointerEvent } from "react";
import {
  Bell,
  KanbanSquare,
  ListTodo,
  MessageSquare,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  boards: KanbanSquare,
  myTasks: ListTodo,
  chat: MessageSquare,
  notifications: Bell,
  access: ShieldCheck,
  settings: SettingsIcon,
};

type Section = { key: string; title: string; body: string };

function FeatureCard({ section, index }: { section: Section; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const Icon = ICONS[section.key];

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--y", `${e.clientY - rect.top}px`);
  }

  return (
    <section
      ref={ref}
      onPointerMove={handlePointerMove}
      className="group relative overflow-hidden rounded-xl glass p-4 opacity-0 transition-[transform,box-shadow] duration-300 [animation-fill-mode:forwards] hover:-translate-y-1 hover:shadow-glow motion-safe:animate-[about-fade-up_0.7s_ease-out]"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(220px circle at var(--x, 50%) var(--y, 50%), color-mix(in srgb, var(--accent) 20%, transparent), transparent 70%)",
        }}
      />
      <div className="relative">
        <h2 className="flex items-center gap-2 font-serif text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent transition-transform duration-300 group-hover:scale-110 motion-safe:group-hover:animate-[about-float_1.6s_ease-in-out_infinite] dark:bg-accent/20">
            {Icon && <Icon size={16} />}
          </span>
          {section.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{section.body}</p>
      </div>
    </section>
  );
}

export function AboutContent({
  title,
  subtitle,
  sections,
  footer,
}: {
  title: string;
  subtitle: string;
  sections: Section[];
  footer: string;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="relative -mx-6 -mt-10 mb-8 overflow-hidden px-6 pb-8 pt-14 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 left-[8%] h-56 w-56 rounded-full bg-accent/30 blur-3xl motion-safe:animate-[about-drift-a_18s_ease-in-out_infinite] dark:bg-accent/20" />
          <div className="absolute top-0 right-[5%] h-64 w-64 rounded-full bg-accent/20 blur-3xl motion-safe:animate-[about-drift-b_22s_ease-in-out_infinite] dark:bg-accent/15" />
          <div className="absolute bottom-[-3rem] left-[32%] h-48 w-48 rounded-full bg-accent/25 blur-3xl motion-safe:animate-[about-drift-c_26s_ease-in-out_infinite] dark:bg-accent/15" />
        </div>

        <div className="relative motion-safe:animate-[about-fade-up_0.6s_ease-out]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-[11px] font-medium text-accent dark:bg-accent/20">
            <Sparkles size={12} />
            ATM Deck
          </span>
          <h1
            className="mt-4 bg-[linear-gradient(110deg,var(--foreground)_35%,var(--accent)_50%,var(--foreground)_65%)] bg-[length:200%_100%] bg-clip-text font-serif text-3xl font-semibold text-transparent motion-safe:animate-[about-shimmer_5s_linear_infinite] sm:text-4xl"
          >
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-500">{subtitle}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section, i) => (
          <FeatureCard key={section.key} section={section} index={i} />
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-zinc-500">{footer}</p>
    </div>
  );
}
