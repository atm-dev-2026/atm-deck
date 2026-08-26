export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="h-7 w-7 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
      <div className="flex flex-1 gap-3 overflow-hidden p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-zinc-100/70 p-3 dark:bg-zinc-900/60">
            <div className="mb-1 h-3 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-16 animate-pulse rounded-md bg-white dark:bg-zinc-950" />
            <div className="h-16 animate-pulse rounded-md bg-white dark:bg-zinc-950" />
          </div>
        ))}
      </div>
    </div>
  );
}
