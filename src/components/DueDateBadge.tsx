"use client";

import { Calendar } from "lucide-react";
import { useHydrated } from "@/lib/useHydrated";

/**
 * Due date in the viewer's locale, red once it's past. Both the text and the
 * overdue check depend on the browser's locale/timezone, so they only render
 * after hydration — otherwise they'd differ from the server-rendered HTML,
 * and React doesn't repair mismatched attributes like the overdue class.
 */
export function DueDateBadge({ dueDate }: { dueDate: string }) {
  const hydrated = useHydrated();
  const date = new Date(dueDate);
  const overdue = hydrated && date < new Date(new Date().toDateString());

  return (
    <span className={`flex items-center gap-1 ${overdue ? "text-red-500" : ""}`}>
      <Calendar size={11} />
      {hydrated && date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
    </span>
  );
}
