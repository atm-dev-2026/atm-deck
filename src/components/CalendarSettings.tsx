"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { calendars, setCalendarCookie, type CalendarSystem } from "@/lib/calendar";
import { useCalendar } from "./CalendarProvider";

const LABEL_KEYS: Record<CalendarSystem, "calendarBuddhist" | "calendarGregorian"> = {
  buddhist: "calendarBuddhist",
  gregory: "calendarGregorian",
};

export function CalendarSettings() {
  const t = useTranslations("Settings");
  const calendar = useCalendar();
  const router = useRouter();

  const choose = (value: CalendarSystem) => {
    setCalendarCookie(value);
    router.refresh();
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {calendars.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          className={`flex flex-col items-center gap-2 rounded-lg px-4 py-3 text-sm transition-all duration-300 ${
            calendar === value
              ? "glass border-accent/40 text-accent shadow-glow"
              : "glass-field text-zinc-600 hover:-translate-y-0.5 dark:text-zinc-400"
          }`}
        >
          {t(LABEL_KEYS[value])}
        </button>
      ))}
    </div>
  );
}
