import { Skeleton } from "@/components/Skeleton";

export function ActivityFeedSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2.5 py-2">
          <Skeleton className="h-6 w-6 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-900" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3 rounded bg-zinc-100 dark:bg-zinc-900" />
            <Skeleton className="h-2.5 w-1/3 rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>
        </div>
      ))}
    </div>
  );
}
