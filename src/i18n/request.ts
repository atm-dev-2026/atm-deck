import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale, LOCALE_COOKIE, type Locale } from "./locales";

export default getRequestConfig(async () => {
  const raw = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = (locales as readonly string[]).includes(raw ?? "") ? (raw as Locale) : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
