export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="glass relative z-10 rounded-none border-x-0 border-t-0 px-4 py-3">
        <div className="h-4 w-28 animate-pulse rounded bg-zinc-900/10 dark:bg-white/10" />
      </div>
      <div className="flex-1 space-y-3 px-4 py-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
