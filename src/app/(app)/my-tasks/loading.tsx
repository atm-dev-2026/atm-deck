import { ListTodo } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/Skeleton";

export default async function Loading() {
  const t = await getTranslations("MyTasks");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="glass relative z-10 flex flex-wrap items-center gap-2 rounded-none border-x-0 border-t-0 px-4 py-3 sm:px-5">
        <ListTodo size={16} className="text-zinc-400" />
        <h1 className="font-serif text-base font-semibold text-zinc-950 dark:text-zinc-50">{t("heading")}</h1>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div role="status" aria-label={t("loading")} className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass flex flex-col gap-2 rounded-lg px-4 py-3">
              <Skeleton className="h-3.5 w-2/3 rounded bg-zinc-900/10 dark:bg-white/10" />
              <Skeleton className="h-2.5 w-1/3 rounded bg-zinc-900/5 dark:bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
