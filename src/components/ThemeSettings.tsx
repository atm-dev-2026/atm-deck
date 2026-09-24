"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { getStoredTheme, setStoredTheme, type Theme } from "@/lib/theme";

const OPTION_DEFS: { value: Theme; key: "light" | "dark" | "system"; icon: typeof Sun }[] = [
  { value: "light", key: "light", icon: Sun },
  { value: "dark", key: "dark", icon: Moon },
  { value: "system", key: "system", icon: Monitor },
];

export function ThemeSettings() {
  const t = useTranslations("Shell.theme");
  // localStorage isn't available during SSR, so this starts unresolved
  // and fills in on mount rather than risking a hydration mismatch.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from a browser-only source (localStorage) that isn't available during SSR
    setTheme(getStoredTheme());
  }, []);

  const choose = (value: Theme) => {
    setTheme(value);
    setStoredTheme(value);
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTION_DEFS.map(({ value, key, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          className={`flex flex-col items-center gap-2 rounded-lg px-4 py-3 text-sm transition-all duration-300 ${
            theme === null
              ? "border border-transparent text-transparent"
              : theme === value
                ? "glass border-accent/40 text-accent shadow-glow"
                : "glass-field text-zinc-600 hover:-translate-y-0.5 dark:text-zinc-400"
          }`}
        >
          <Icon size={18} className={theme === null ? "opacity-0" : undefined} />
          {t(key)}
        </button>
      ))}
    </div>
  );
}
