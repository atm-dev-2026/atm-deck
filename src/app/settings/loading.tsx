export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <div className="h-4 w-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
      <div className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="mt-3 h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        <div className="mt-8 h-3 w-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="mt-3 h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </div>
  );
}
