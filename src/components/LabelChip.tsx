import { labelColorClasses } from "./labelColors";

export function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${labelColorClasses(color).chip}`}
    >
      {name}
    </span>
  );
}
