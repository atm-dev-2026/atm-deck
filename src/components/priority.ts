import { AlertTriangle, ArrowDown, ArrowUp, Equal, Minus } from "lucide-react";

export type Priority = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const PRIORITIES: {
  value: Priority;
  label: string;
  icon: typeof Minus;
  className: string;
}[] = [
  { value: "URGENT", label: "Urgent", icon: AlertTriangle, className: "text-red-500" },
  { value: "HIGH", label: "High", icon: ArrowUp, className: "text-orange-500" },
  { value: "MEDIUM", label: "Medium", icon: Equal, className: "text-amber-500" },
  { value: "LOW", label: "Low", icon: ArrowDown, className: "text-sky-500" },
  { value: "NONE", label: "No priority", icon: Minus, className: "text-zinc-400 dark:text-zinc-500" },
];

export function priorityConfig(priority: Priority) {
  return PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[4];
}
