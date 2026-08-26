export const LABEL_COLORS = {
  red: { dot: "bg-red-500", chip: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
  orange: { dot: "bg-orange-500", chip: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300" },
  amber: { dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  emerald: { dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  sky: { dot: "bg-sky-500", chip: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  violet: { dot: "bg-violet-500", chip: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  fuchsia: { dot: "bg-fuchsia-500", chip: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300" },
  zinc: { dot: "bg-zinc-500", chip: "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300" },
} as const;

export type LabelColor = keyof typeof LABEL_COLORS;

export function labelColorClasses(color: string) {
  return LABEL_COLORS[color as LabelColor] ?? LABEL_COLORS.zinc;
}
