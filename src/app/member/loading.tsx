const pulse = "animate-pulse rounded bg-zinc-900/10 dark:bg-white/10";

export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8">
        <div className={`h-7 w-32 ${pulse}`} />
        <div className={`mt-2 h-3 w-24 ${pulse}`} />
        <div className="mt-5 flex items-center gap-3">
          <div className={`h-9 w-full max-w-xs rounded-full ${pulse}`} />
          <div className={`ml-auto h-9 w-36 rounded-full ${pulse}`} />
        </div>
        <div className="glass mt-5 overflow-hidden rounded-xl">
          <div className="flex gap-6 border-b border-zinc-900/5 px-6 py-3.5 dark:border-white/5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={`h-3 w-16 ${pulse}`} />
            ))}
          </div>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-t border-zinc-900/5 px-5 py-3 dark:border-white/5">
              <div className={`h-10 w-10 rounded-full ${pulse}`} />
              <div className="flex-1">
                <div className={`h-3 w-40 ${pulse}`} />
                <div className={`mt-2 h-2.5 w-28 ${pulse}`} />
              </div>
              <div className={`h-5 w-9 rounded-full ${pulse}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
