"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { locales, setLocaleCookie, type Locale } from "@/i18n/locales";

const LABELS: Record<Locale, string> = {
  th: "ไทย",
  en: "English",
};

export function LocaleSettings() {
  const locale = useLocale();
  const router = useRouter();

  const choose = (value: Locale) => {
    setLocaleCookie(value);
    router.refresh();
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {locales.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          className={`flex flex-col items-center gap-2 rounded-lg px-4 py-3 text-sm transition-all duration-300 ${
            locale === value
              ? "glass border-accent/40 text-accent shadow-glow"
              : "glass-field text-zinc-600 hover:-translate-y-0.5 dark:text-zinc-400"
          }`}
        >
          {LABELS[value]}
        </button>
      ))}
    </div>
  );
}
