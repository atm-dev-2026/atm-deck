/**
 * Task due dates come in two shapes, told apart by `Task.dueDateHasTime`:
 * - date-only: a calendar date, stored as UTC midnight of that date, so it's
 *   read back in UTC and names the same day in every timezone;
 * - timed: an exact instant, shown in the viewer's timezone.
 *
 * Pure helpers, shared by the task UI and the task API routes.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function localDateString(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isDueDateOverdue(dueDate: string, hasTime: boolean, now = new Date()): boolean {
  if (hasTime) return new Date(dueDate) < now;
  // Overdue once the due day has fully passed in the viewer's timezone.
  return dueDate.slice(0, 10) < localDateString(now);
}

export function formatDueDate(dueDate: string, hasTime: boolean): string {
  const date = new Date(dueDate);
  return hasTime
    ? date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Stored value → the date input's "YYYY-MM-DD" and a 24-hour "HH:mm" time. Browser-only for timed values. */
export function toDueDateInputs(dueDate: string | null, hasTime: boolean): { date: string; time: string } {
  if (!dueDate) return { date: "", time: "" };
  if (!hasTime) return { date: dueDate.slice(0, 10), time: "" };
  const d = new Date(dueDate);
  return { date: localDateString(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

/** Input values → the PATCH body fields. The time is read in the browser's timezone. */
export function fromDueDateInputs(date: string, time: string): { dueDate: string | null; dueDateHasTime: boolean } {
  if (!date) return { dueDate: null, dueDateHasTime: false };
  if (!time) return { dueDate: date, dueDateHasTime: false };
  return { dueDate: new Date(`${date}T${time}`).toISOString(), dueDateHasTime: true };
}

/**
 * Activity-log representation: "YYYY-MM-DD" for date-only, ISO without
 * milliseconds for timed. Entries logged before times existed hold a full
 * `toISOString()` of UTC midnight ("…T00:00:00.000Z"); dropping milliseconds
 * from timed values keeps those unambiguous — see formatDueDateLogValue.
 */
export function dueDateLogValue(dueDate: Date | null, hasTime: boolean): string | null {
  if (!dueDate) return null;
  return hasTime ? dueDate.toISOString().replace(/\.\d{3}Z$/, "Z") : dueDate.toISOString().slice(0, 10);
}

export function formatDueDateLogValue(value: string): string {
  const legacyDateOnly = value.endsWith("T00:00:00.000Z");
  const hasTime = !DATE_ONLY.test(value) && !legacyDateOnly;
  return formatDueDate(legacyDateOnly ? value.slice(0, 10) : value, hasTime);
}
