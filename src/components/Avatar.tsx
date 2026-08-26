const SIZES = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-6 w-6 text-[11px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
} as const;

const PALETTE = [
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
];

function hashColor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function Avatar({
  label,
  image,
  size = "md",
}: {
  label: string;
  image?: string | null;
  size?: keyof typeof SIZES;
}) {
  const initial = label.trim().slice(0, 1).toUpperCase() || "?";

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        className={`${SIZES[size]} shrink-0 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10`}
      />
    );
  }

  return (
    <div
      className={`flex ${SIZES[size]} shrink-0 items-center justify-center rounded-full font-semibold ${hashColor(label)}`}
    >
      {initial}
    </div>
  );
}
