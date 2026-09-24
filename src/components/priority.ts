import { AlertTriangle, ArrowDown, ArrowUp, Equal, Minus } from "lucide-react";

export type Priority = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type PriorityLabelKey = "urgent" | "high" | "medium" | "low" | "none";

export const PRIORITIES: {
  value: Priority;
  labelKey: PriorityLabelKey;
  icon: typeof Minus;
  className: string;
}[] = [
  { value: "URGENT", labelKey: "urgent", icon: AlertTriangle, className: "text-red-500" },
  { value: "HIGH", labelKey: "high", icon: ArrowUp, className: "text-orange-500" },
  { value: "MEDIUM", labelKey: "medium", icon: Equal, className: "text-amber-500" },
  { value: "LOW", labelKey: "low", icon: ArrowDown, className: "text-sky-500" },
  { value: "NONE", labelKey: "none", icon: Minus, className: "text-zinc-400 dark:text-zinc-500" },
];

export function priorityConfig(priority: Priority) {
  return PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[4];
}
