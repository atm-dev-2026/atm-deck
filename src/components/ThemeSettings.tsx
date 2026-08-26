"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { getStoredTheme, setStoredTheme, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeSettings() {
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
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          className={`flex flex-col items-center gap-2 rounded-lg border px-4 py-3 text-sm transition ${
            theme === null
              ? "border-transparent text-transparent"
              : theme === value
                ? "border-accent bg-accent/5 text-accent dark:bg-accent/10"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700"
          }`}
        >
          <Icon size={18} className={theme === null ? "opacity-0" : undefined} />
          {label}
        </button>
      ))}
    </div>
  );
}
