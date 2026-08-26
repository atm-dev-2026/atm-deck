import { Building2, Globe2, Lock } from "lucide-react";

export type BoardVisibility = "GLOBAL" | "DEPARTMENT" | "PERSONAL";

const config: Record<BoardVisibility, { label: string; icon: typeof Globe2; className: string }> = {
  GLOBAL: {
    label: "Global",
    icon: Globe2,
    className: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  },
  DEPARTMENT: {
    label: "Department",
    icon: Building2,
    className: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  },
  PERSONAL: {
    label: "Personal",
    icon: Lock,
    className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

export function VisibilityBadge({ visibilityType }: { visibilityType: BoardVisibility }) {
  const { label, icon: Icon, className } = config[visibilityType];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${className}`}
    >
      <Icon size={10} />
      {label}
    </span>
  );
}
