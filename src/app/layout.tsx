import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/AppShell";
import { CalendarProvider } from "@/components/CalendarProvider";
import { ThemeSync } from "@/components/ThemeSync";
import { ToastProvider } from "@/components/Toast";
import { themeInitScript } from "@/lib/theme";
import { CALENDAR_COOKIE, parseCalendar } from "@/lib/calendar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Shell");
  return {
    title: "ATM Deck",
    description: t("appDescription"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const calendar = parseCalendar((await cookies()).get(CALENDAR_COOKIE)?.value);

  return (
    <html
      lang={locale}
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-full overflow-hidden flex flex-col bg-background text-foreground">
        <NextIntlClientProvider>
          <CalendarProvider calendar={calendar}>
            <ThemeSync />
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </CalendarProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
