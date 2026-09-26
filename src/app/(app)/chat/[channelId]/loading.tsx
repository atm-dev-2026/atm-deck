import { ChatMessagesSkeleton } from "@/components/skeletons/ChatMessagesSkeleton";

export default function Loading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="glass relative z-10 rounded-none border-x-0 border-t-0 px-4 py-3">
        <div className="h-4 w-28 animate-pulse rounded bg-zinc-900/10 dark:bg-white/10" />
      </div>
      <ChatMessagesSkeleton />
    </div>
  );
}
