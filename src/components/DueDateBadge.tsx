"use client";

import { Calendar } from "lucide-react";
import { formatDueDate, isDueDateOverdue } from "@/lib/dueDate";
import { useHydrated } from "@/lib/useHydrated";
import { useDateLocale } from "@/components/CalendarProvider";

/**
 * Due date in the viewer's locale (with the time, when it has one), red once
 * it's past — unless the task is `done` (in a done column), since a finished
 * task isn't overdue. Both the text and the overdue check depend on the browser's
 * locale/timezone, so they only render after hydration — otherwise they'd
 * differ from the server-rendered HTML, and React doesn't repair mismatched
 * attributes like the overdue class.
 */
export function DueDateBadge({
  dueDate,
  hasTime,
  done = false,
}: {
  dueDate: string;
  hasTime: boolean;
  done?: boolean;
}) {
  const hydrated = useHydrated();
  const locale = useDateLocale();
  const overdue = hydrated && !done && isDueDateOverdue(dueDate, hasTime);

  return (
    <span className={`flex items-center gap-1 ${overdue ? "text-red-500" : ""}`}>
      <Calendar size={11} />
      {hydrated && formatDueDate(dueDate, hasTime, locale)}
    </span>
  );
}
