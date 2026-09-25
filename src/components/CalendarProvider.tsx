"use client";

import { createContext, useContext } from "react";
import { useLocale } from "next-intl";
import { defaultCalendar, type CalendarSystem } from "@/lib/calendar";

const CalendarContext = createContext<CalendarSystem>(defaultCalendar);

/** Seeded by the root layout from the calendar cookie. */
export function CalendarProvider({
  calendar,
  children,
}: {
  calendar: CalendarSystem;
  children: React.ReactNode;
}) {
  return <CalendarContext.Provider value={calendar}>{children}</CalendarContext.Provider>;
}

export function useCalendar(): CalendarSystem {
  return useContext(CalendarContext);
}

/**
 * The locale to hand to Intl / toLocale* for any date shown to the user: the
 * app's UI language plus the user's calendar choice, e.g. "th-u-ca-buddhist"
 * → "25 ก.ย. 2569", "en-u-ca-gregory" → "Sep 25, 2026".
 */
export function useDateLocale(): string {
  return `${useLocale()}-u-ca-${useCalendar()}`;
}
