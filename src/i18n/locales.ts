export const locales = ["th", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "th";
export const LOCALE_COOKIE = "atm-deck-locale";

export function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
