export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="glass relative z-10 flex items-center gap-3 rounded-none border-x-0 border-t-0 px-4 py-3">
        <div className="h-7 w-7 animate-pulse rounded-md bg-zinc-900/10 dark:bg-white/10" />
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-900/10 dark:bg-white/10" />
      </div>
      <div className="flex flex-1 gap-3 overflow-hidden p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass flex w-72 shrink-0 flex-col gap-2 rounded-xl p-3">
            <div className="mb-1 h-3 w-16 animate-pulse rounded bg-zinc-900/10 dark:bg-white/10" />
            <div className="h-16 animate-pulse rounded-md bg-zinc-900/5 dark:bg-white/5" />
            <div className="h-16 animate-pulse rounded-md bg-zinc-900/5 dark:bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
