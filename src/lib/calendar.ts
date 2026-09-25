/**
 * Which era dates are shown in, chosen per browser in Settings. Values are
 * Unicode calendar identifiers, appended to the UI locale as `-u-ca-<value>`
 * (see useDateLocale), so they work with every Intl/toLocale* formatter.
 */
export const calendars = ["buddhist", "gregory"] as const;
export type CalendarSystem = (typeof calendars)[number];
export const defaultCalendar: CalendarSystem = "buddhist";
export const CALENDAR_COOKIE = "atm-deck-calendar";

export function parseCalendar(value: string | undefined): CalendarSystem {
  return (calendars as readonly string[]).includes(value ?? "") ? (value as CalendarSystem) : defaultCalendar;
}

export function setCalendarCookie(calendar: CalendarSystem) {
  document.cookie = `${CALENDAR_COOKIE}=${calendar}; path=/; max-age=31536000; samesite=lax`;
}
