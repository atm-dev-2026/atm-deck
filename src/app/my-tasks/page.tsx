"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Calendar, ListChecks, ListTodo, Paperclip } from "lucide-react";
import { LabelChip } from "@/components/LabelChip";
import { Skeleton } from "@/components/Skeleton";
import { VisibilityBadge, type BoardVisibility } from "@/components/VisibilityBadge";
import { priorityConfig } from "@/components/priority";
import type { LabelT, TaskUserT } from "../board/TaskPanel";
import type { Priority } from "@/components/priority";

type MyTask = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  dueDate: string | null;
  labels: LabelT[];
  checklist: { id: string; done: boolean }[];
  attachments: { id: string }[];
  createdBy: TaskUserT | null;
  column: {
    id: string;
    name: string;
    board: { id: string; name: string; visibilityType: BoardVisibility };
  };
};

export default function MyTasksPage() {
  const t = useTranslations("MyTasks");
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch("/api/tasks/mine");
      const data = await res.json();
      if (!ignore) {
        setTasks(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="glass relative z-10 flex flex-wrap items-center gap-2 rounded-none border-x-0 border-t-0 px-4 py-3 sm:px-5">
        <ListTodo size={16} className="text-zinc-400" />
        <h1 className="font-serif text-base font-semibold text-zinc-950 dark:text-zinc-50">{t("heading")}</h1>
        <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {tasks.length}
        </span>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {loading ? (
          <div role="status" aria-label={t("loading")} className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="glass flex flex-col gap-2 rounded-lg px-4 py-3">
                <Skeleton className="h-3.5 w-2/3 rounded bg-zinc-900/10 dark:bg-white/10" />
                <Skeleton className="h-2.5 w-1/3 rounded bg-zinc-900/5 dark:bg-white/5" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {tasks.length === 0 && (
              <div className="glass flex flex-col items-center justify-center gap-2 rounded-lg py-16 text-center">
                <ListTodo size={22} className="text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm text-zinc-500">{t("empty")}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {tasks.map((task) => {
                const priority = priorityConfig(task.priority);
                const PriorityIcon = priority.icon;
                const doneCount = task.checklist.filter((c) => c.done).length;
                const overdue = task.dueDate
                  ? new Date(task.dueDate) < new Date(new Date().toDateString())
                  : false;

                return (
                  <Link
                    key={task.id}
                    href={`/board/${task.column.board.id}?task=${task.id}`}
                    className="glass group flex flex-col gap-2 rounded-lg px-4 py-3 transition-all duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-glow"
                  >
                    <div className="flex items-start gap-2">
                      {task.priority !== "NONE" && (
                        <PriorityIcon
                          size={13}
                          strokeWidth={2.5}
                          className={`mt-0.5 shrink-0 ${priority.className}`}
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {task.title}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="truncate font-medium text-zinc-600 dark:text-zinc-300">
                        {task.column.board.name}
                      </span>
                      <VisibilityBadge visibilityType={task.column.board.visibilityType} />
                      <span className="text-zinc-300 dark:text-zinc-600">·</span>
                      <span className="truncate">{task.column.name}</span>
                    </div>

                    {task.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.labels.map((label) => (
                          <LabelChip key={label.id} name={label.name} color={label.color} />
                        ))}
                      </div>
                    )}

                    {(task.dueDate || task.checklist.length > 0 || task.attachments.length > 0) && (
                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 ${overdue ? "text-red-500" : ""}`}>
                            <Calendar size={11} />
                            {new Date(task.dueDate).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                        {task.checklist.length > 0 && (
                          <span className="flex items-center gap-1">
                            <ListChecks size={11} />
                            {doneCount}/{task.checklist.length}
                          </span>
                        )}
                        {task.attachments.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Paperclip size={11} />
                            {task.attachments.length}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
