"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDateLocale } from "@/components/CalendarProvider";

const POPOVER_WIDTH = 240; // w-60
const pad2 = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function parseKey(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/**
 * Calendar date picker ("YYYY-MM-DD", or "" for none) in the same popover
 * style as TimePicker/PrioritySelect — the native date input's picker is
 * drawn by the OS and can't be styled. Works on local calendar dates only;
 * no timezone conversion. Labels follow the app locale and the user's
 * calendar setting (พ.ศ. or ค.ศ.) via useDateLocale.
 */
export function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("Boards.task");
  const locale = useDateLocale();
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = parseKey(value);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const todayKey = toKey(new Date());

  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    // 2026-02-01 is a Sunday; weeks start on Sunday.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2026, 1, 1 + i)));
  }, [locale]);

  const days = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1 - viewMonth.getDay());
    return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
  }, [viewMonth]);

  const openPicker = () => {
    const base = selected ?? new Date();
    setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    // Open leftwards when there's no room to the right (e.g. the field wrapped
    // to the right side of the task panel).
    const left = rootRef.current?.getBoundingClientRect().left ?? 0;
    setAlignRight(left + POPOVER_WIDTH > window.innerWidth - 8);
    setOpen(true);
  };

  const pick = (next: string) => {
    setOpen(false);
    if (next !== value) onChange(next);
  };

  const shiftMonth = (delta: number) =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t("dueDateAria")}
        aria-expanded={open}
        onClick={openPicker}
        className={`rounded px-1 py-0.5 tabular-nums transition-colors hover:bg-zinc-900/5 dark:hover:bg-white/5 ${
          selected ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400"
        }`}
      >
        {selected
          ? selected.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
          : t("noDate")}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            className={`glass-strong absolute z-20 mt-1 w-60 rounded-md p-2 ${alignRight ? "right-0" : "left-0"}`}
          >
            <div className="mb-1 flex items-center justify-between">
              <button
                type="button"
                aria-label={t("prevMonthAria")}
                onClick={() => shiftMonth(-1)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                {viewMonth.toLocaleDateString(locale, { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                aria-label={t("nextMonthAria")}
                onClick={() => shiftMonth(1)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-zinc-400">
              {weekdays.map((w, i) => (
                <div key={i} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map((d) => {
                const key = toKey(d);
                const isSelected = key === value;
                const isToday = key === todayKey;
                const inMonth = d.getMonth() === viewMonth.getMonth();
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pick(key)}
                    className={`flex h-7 items-center justify-center rounded text-xs tabular-nums transition-colors ${
                      isSelected
                        ? "bg-accent/15 font-semibold text-accent dark:bg-accent/20"
                        : `${inMonth ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-300 dark:text-zinc-600"} hover:bg-zinc-100 dark:hover:bg-zinc-800`
                    } ${isToday && !isSelected ? "ring-1 ring-inset ring-accent/40" : ""}`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-1.5 flex justify-between border-t border-zinc-900/5 pt-1.5 dark:border-white/5">
              <button
                type="button"
                onClick={() => pick(todayKey)}
                className="rounded px-2 py-1 text-xs font-medium text-accent hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {t("today")}
              </button>
              <button
                type="button"
                onClick={() => pick("")}
                className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                {t("noDate")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
