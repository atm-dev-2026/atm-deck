"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

const pad2 = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => pad2(i));
const MINUTE_STEP = 5;
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => pad2(i * MINUTE_STEP));

/**
 * 24-hour time picker ("HH:mm", or "" for no time) in the same popover style
 * as PrioritySelect/AssigneePicker — a native <select>/<input type="time">
 * can't be styled or forced to 24-hour. Picking an hour keeps it open for the
 * minute; picking a minute, "no time", or clicking away commits via onChange.
 */
export function TimePicker({
  value,
  disabled = false,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("Boards.task");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  const shown = open ? draft : value;
  const [hour, minute] = draft ? draft.split(":") : ["", ""];
  // Keep a minute that isn't on the 5-minute grid (e.g. set elsewhere) pickable.
  const minutes = minute && !MINUTES.includes(minute) ? [...MINUTES, minute].sort() : MINUTES;

  const close = (next: string) => {
    setOpen(false);
    if (next !== value) onChange(next);
  };

  // Center the current selection in each column when the popover opens.
  useEffect(() => {
    if (!open) return;
    for (const list of [hourListRef.current, minuteListRef.current]) {
      const selected = list?.querySelector<HTMLElement>("[data-selected]");
      if (list && selected) {
        list.scrollTop = selected.offsetTop - list.clientHeight / 2 + selected.clientHeight / 2;
      }
    }
  }, [open]);

  const itemClass = (selected: boolean) =>
    `flex w-full items-center justify-center rounded py-1 text-xs tabular-nums transition-colors ${
      selected
        ? "bg-accent/15 font-semibold text-accent dark:bg-accent/20"
        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
    }`;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-label={t("dueTimeAria")}
        aria-expanded={open}
        onClick={() => {
          setDraft(value);
          setOpen(true);
        }}
        className={`rounded px-1 py-0.5 tabular-nums transition-colors hover:bg-zinc-900/5 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-white/5 ${
          shown ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400"
        }`}
      >
        {shown || "--:--"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => close(draft)} />
          <div
            onKeyDown={(e) => {
              if (e.key === "Escape") close(draft);
            }}
            className="glass-strong absolute right-0 z-20 mt-1 w-36 rounded-md p-1"
          >
            <div className="flex gap-1">
              <div className="flex-1">
                <div className="px-1 pb-1 pt-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {t("hour")}
                </div>
                <div ref={hourListRef} className="relative max-h-44 overflow-y-auto [scrollbar-width:thin]">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      data-selected={h === hour || undefined}
                      onClick={() => setDraft(`${h}:${minute || "00"}`)}
                      className={itemClass(h === hour)}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-px bg-zinc-900/5 dark:bg-white/5" />
              <div className="flex-1">
                <div className="px-1 pb-1 pt-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {t("minute")}
                </div>
                <div ref={minuteListRef} className="relative max-h-44 overflow-y-auto [scrollbar-width:thin]">
                  {minutes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      data-selected={m === minute || undefined}
                      onClick={() => close(`${hour || "00"}:${m}`)}
                      className={itemClass(m === minute)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-1 border-t border-zinc-900/5 pt-1 dark:border-white/5">
              <button
                type="button"
                onClick={() => close("")}
                className="flex w-full items-center justify-between rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                {t("noTime")}
                {!draft && <Check size={12} className="text-accent" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
