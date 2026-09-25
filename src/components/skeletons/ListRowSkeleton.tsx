import { Skeleton } from "@/components/Skeleton";

export function ChannelListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5 px-2 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-3.5 w-24 rounded bg-zinc-100 dark:bg-zinc-900" />
      ))}
    </div>
  );
}

export function DmListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5 px-2 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-900" />
          <Skeleton className="h-3.5 w-20 rounded bg-zinc-100 dark:bg-zinc-900" />
        </div>
      ))}
    </div>
  );
}
