"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { History, X } from "lucide-react";
import { Spinner } from "./Spinner";
import { ActivityFeedItem, type ActivityEntryT } from "./ActivityFeedItem";
import { ActivityFeedSkeleton } from "./skeletons/ActivityFeedSkeleton";

type ActivityPage = { items: ActivityEntryT[]; nextCursor: string | null };

export function BoardActivityPanel({ boardId }: { boardId: string }) {
  const t = useTranslations("Boards.activity");
  const tTask = useTranslations("Boards.task");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityEntryT[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = async (cursor?: string) => {
    const url = new URL(`/api/boards/${boardId}/activity`, window.location.origin);
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url.toString());
    if (!res.ok) return;
    const data: ActivityPage = await res.json();
    setItems((prev) => (cursor ? [...(prev ?? []), ...data.items] : data.items));
    setNextCursor(data.nextCursor);
  };

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next && items === null) {
        void load();
      }
      return next;
    });
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await load(nextCursor);
    setLoadingMore(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={toggleOpen}
        className="glass-field flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-300"
        aria-label={t("triggerAria")}
        title={t("triggerAria")}
      >
        <History size={14} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 flex justify-end bg-black/15 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="glass-strong flex h-full w-full max-w-md flex-col rounded-none border-y-0 border-r-0"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{t("heading")}</span>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label={tTask("closeAria")}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {items === null ? (
                <div role="status" aria-label={t("loading")}>
                  <ActivityFeedSkeleton />
                </div>
              ) : items.length === 0 ? (
                <p className="text-xs text-zinc-400">{t("empty")}</p>
              ) : (
                <>
                  <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                    {items.map((entry) => (
                      <ActivityFeedItem key={entry.id} entry={entry} />
                    ))}
                  </div>
                  {nextCursor && (
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 disabled:cursor-wait dark:hover:bg-zinc-800"
                    >
                      {loadingMore && <Spinner size={12} />}
                      {t("loadMore")}
                    </button>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
