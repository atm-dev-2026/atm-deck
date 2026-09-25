"use client";

import { Calendar } from "lucide-react";
import { formatDueDate, isDueDateOverdue } from "@/lib/dueDate";
import { useHydrated } from "@/lib/useHydrated";

/**
 * Due date in the viewer's locale (with the time, when it has one), red once
 * it's past. Both the text and the overdue check depend on the browser's
 * locale/timezone, so they only render after hydration — otherwise they'd
 * differ from the server-rendered HTML, and React doesn't repair mismatched
 * attributes like the overdue class.
 */
export function DueDateBadge({ dueDate, hasTime }: { dueDate: string; hasTime: boolean }) {
  const hydrated = useHydrated();
  const overdue = hydrated && isDueDateOverdue(dueDate, hasTime);

  return (
    <span className={`flex items-center gap-1 ${overdue ? "text-red-500" : ""}`}>
      <Calendar size={11} />
      {hydrated && formatDueDate(dueDate, hasTime)}
    </span>
  );
}
