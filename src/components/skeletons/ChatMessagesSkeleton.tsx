import { Skeleton } from "@/components/Skeleton";

export function ChatMessagesSkeleton() {
  return (
    <div className="flex-1 space-y-3 px-4 py-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-900" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-24 rounded bg-zinc-100 dark:bg-zinc-900" />
            <Skeleton className="h-3 w-2/3 rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>
        </div>
      ))}
    </div>
  );
}
