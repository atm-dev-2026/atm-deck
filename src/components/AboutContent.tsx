"use client";

import Link from "next/link";
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
type Variant = "default" | "wide" | "banner";

// "wide"/"banner" widen the card via col-span so the grid reads as an
// asymmetric bento layout instead of a flat uniform grid — reserved for the
// flagship feature (longest copy) and a full-width closer.
const VARIANT_SPAN: Record<Variant, string> = {
  default: "",
  wide: "sm:col-span-2 lg:col-span-2",
  banner: "sm:col-span-2 lg:col-span-3",
};

function FeatureCard({ section, index, variant = "default" }: { section: Section; index: number; variant?: Variant }) {
  const ref = useRef<HTMLDivElement>(null);
  const Icon = ICONS[section.key];
  const horizontal = variant !== "default";

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
      className={`group relative overflow-hidden rounded-2xl glass p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-glow motion-safe:opacity-0 motion-safe:[animation-fill-mode:forwards] motion-safe:animate-[about-fade-up_0.7s_ease-out] ${VARIANT_SPAN[variant]}`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      {/* Hairline top edge-light, always faintly on, brightens on hover. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-100"
      />
      {/* Oversized ghost numeral, bleeding off the corner. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-3 right-1 select-none font-serif text-7xl font-semibold text-zinc-900/[0.045] dark:text-white/[0.05]"
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(260px circle at var(--x, 50%) var(--y, 50%), color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%)",
        }}
      />
      <div className={`relative flex ${horizontal ? "flex-col gap-4 sm:flex-row sm:items-start" : "flex-col"}`}>
        <div className={horizontal ? "flex shrink-0 flex-col items-start sm:w-44" : ""}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-accent/5 text-accent ring-1 ring-accent/20 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_24px_-6px_var(--accent)] motion-safe:group-hover:animate-[about-float_1.6s_ease-in-out_infinite] dark:from-accent/35 dark:to-accent/10">
            {Icon && <Icon size={19} />}
          </span>
          <h2 className={`font-serif font-semibold text-zinc-950 dark:text-zinc-50 ${horizontal ? "mt-3 text-base" : "mt-4 text-base"}`}>
            {section.title}
          </h2>
        </div>
        <p className={`text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 ${horizontal ? "sm:pt-1" : "mt-2"}`}>
          {section.body}
        </p>
      </div>
    </section>
  );
}

export function AboutContent({
  signedIn,
  title,
  subtitle,
  featuresEyebrow,
  featuresHeading,
  sections,
  marquee,
  footer,
  nav,
  cta,
}: {
  signedIn: boolean;
  title: string;
  subtitle: string;
  featuresEyebrow: string;
  featuresHeading: string;
  sections: Section[];
  marquee: string[];
  footer: string;
  nav: { features: string };
  cta: { signIn: string; openApp: string; learnMore: string };
}) {
  const primaryHref = signedIn ? "/" : "/login";
  const primaryLabel = signedIn ? cta.openApp : cta.signIn;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto motion-safe:[scroll-behavior:smooth]">
      <header className="glass sticky top-0 z-30 flex shrink-0 items-center justify-between rounded-none border-x-0 border-t-0 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-serif text-sm italic font-semibold text-accent-foreground shadow-glow">
            AD
          </span>
          <span className="font-serif text-sm font-semibold text-zinc-950 dark:text-zinc-50">ATM Deck</span>
        </div>
        <nav className="flex items-center gap-4">
          <a href="#features" className="hidden text-xs font-medium text-zinc-500 hover:text-accent sm:inline">
            {nav.features}
          </a>
          <Link
            href={primaryHref}
            className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-foreground shadow-glow transition-transform duration-300 hover:-translate-y-0.5"
          >
            {primaryLabel}
          </Link>
        </nav>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6">
        <div className="relative overflow-hidden px-0 pb-10 pt-16 text-center">
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
            <h1 className="mt-4 bg-[linear-gradient(110deg,var(--foreground)_35%,var(--accent)_50%,var(--foreground)_65%)] bg-[length:200%_100%] bg-clip-text font-serif text-3xl font-semibold text-transparent motion-safe:animate-[about-shimmer_5s_linear_infinite] sm:text-5xl">
              {title}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-zinc-500 sm:text-base">{subtitle}</p>

            <div className="mt-7 flex items-center justify-center gap-3">
              <Link
                href={primaryHref}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-glow transition-transform duration-300 hover:-translate-y-0.5"
              >
                {primaryLabel}
              </Link>
              <a
                href="#features"
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/5"
              >
                {cta.learnMore}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden border-y border-zinc-900/10 py-3 dark:border-white/10">
        <div className="flex w-max gap-10 motion-safe:animate-[about-marquee_26s_linear_infinite] motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:gap-x-10 motion-reduce:gap-y-2 motion-reduce:px-6">
          {[...marquee, ...marquee].map((label, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
        <div id="features" className="scroll-mt-20 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-accent">{featuresEyebrow}</span>
          <h2 className="mx-auto mt-2 max-w-lg font-serif text-2xl font-semibold text-zinc-950 dark:text-zinc-50 sm:text-3xl">
            {featuresHeading}
          </h2>
          <div aria-hidden className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-accent to-transparent" />
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section, i) => (
            <FeatureCard
              key={section.key}
              section={section}
              index={i}
              variant={i === 0 ? "wide" : i === sections.length - 1 ? "banner" : "default"}
            />
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-zinc-900/10 pt-6 text-center dark:border-white/10 sm:flex-row sm:text-left">
          <p className="text-xs text-zinc-500">© {new Date().getFullYear()} ATM Deck · ATM Holding</p>
          <p className="text-xs text-zinc-500">{footer}</p>
        </div>
      </div>
    </div>
  );
}
