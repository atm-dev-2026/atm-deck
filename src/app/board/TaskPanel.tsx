"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Check, Copy, Download, Paperclip, Plus, Trash2, X } from "lucide-react";
import { PrioritySelect } from "@/components/PrioritySelect";
import { LabelPicker } from "@/components/LabelPicker";
import { LabelChip } from "@/components/LabelChip";
import { AssigneePicker } from "@/components/AssigneePicker";
import { Spinner } from "@/components/Spinner";
import { ActivityFeedItem, type ActivityEntryT } from "@/components/ActivityFeedItem";
import type { LabelColor } from "@/components/labelColors";
import type { Priority } from "@/components/priority";

export type ChecklistItemT = { id: string; text: string; done: boolean; order: number };
export type LabelT = { id: string; name: string; color: string };
export type TaskAttachmentT = { id: string; fileName: string; fileType: string; fileSize: number };
export type TaskUserT = { id: string; name: string | null; email: string | null; image: string | null };
export type TaskT = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  assignee: TaskUserT | null;
  dueDate: string | null;
  order: number;
  columnId: string;
  priority: Priority;
  labels: LabelT[];
  checklist: ChecklistItemT[];
  attachments: TaskAttachmentT[];
  createdBy?: TaskUserT | null;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type TaskPatch = Partial<{
  title: string;
  description: string;
  assigneeId: string | null;
  dueDate: string;
  priority: Priority;
  labelIds: string[];
}>;

export function TaskPanel({
  task,
  boardLabels,
  boardMembers,
  onClose,
  onUpdate,
  onDelete,
  onCreateLabel,
  addingChecklistItem = false,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onAddAttachments,
  onDeleteAttachment,
}: {
  task: TaskT;
  boardLabels: LabelT[];
  boardMembers: TaskUserT[];
  onClose: () => void;
  onUpdate: (patch: TaskPatch) => Promise<boolean>;
  onDelete: () => void;
  onCreateLabel: (name: string, color: LabelColor) => Promise<void>;
  addingChecklistItem?: boolean;
  onAddChecklistItem: (text: string) => void;
  onToggleChecklistItem: (itemId: string, done: boolean) => void;
  onDeleteChecklistItem: (itemId: string) => void;
  onAddAttachments: (files: FileList | File[]) => void;
  onDeleteAttachment: (attachmentId: string) => void;
}) {
  const t = useTranslations("Boards.task");
  const tActivity = useTranslations("Boards.activity");
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");
  const [newChecklistText, setNewChecklistText] = useState("");
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());
  const [numberCopied, setNumberCopied] = useState(false);
  const [activity, setActivity] = useState<ActivityEntryT[] | null>(null);
  const [activityTaskId, setActivityTaskId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tasks/${task.id}/activity`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ActivityEntryT[]) => {
        if (cancelled) return;
        setActivity(data);
        setActivityTaskId(task.id);
      })
      .catch(() => {
        if (cancelled) return;
        setActivity([]);
        setActivityTaskId(task.id);
      });
    return () => {
      cancelled = true;
    };
  }, [task.id]);

  const activityLoading = activityTaskId !== task.id;

  const copyTaskNumber = async () => {
    try {
      await navigator.clipboard.writeText(String(task.number));
      setNumberCopied(true);
      setTimeout(() => setNumberCopied(false), 1500);
    } catch {
      // clipboard access denied or unavailable — nothing to recover from
    }
  };

  const commit = async (field: string, patch: TaskPatch, revertLocal?: () => void) => {
    setSavingFields((prev) => new Set(prev).add(field));
    const ok = await onUpdate(patch);
    if (!ok) revertLocal?.();
    setSavingFields((prev) => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  };

  const doneCount = task.checklist.filter((c) => c.done).length;

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/15 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="glass-strong flex h-full w-full max-w-md flex-col rounded-none border-y-0 border-r-0"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{t("eyebrow")}</span>
            <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">#{task.number}</span>
            <button
              type="button"
              onClick={copyTaskNumber}
              className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-900/10 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
              aria-label={t("copyNumberAria")}
              title={t("copyNumberAria")}
            >
              {numberCopied ? (
                <Check size={12} strokeWidth={2.5} className="text-emerald-500" />
              ) : (
                <Copy size={12} strokeWidth={2} />
              )}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onDelete}
              className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              aria-label={t("deleteAria")}
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label={t("closeAria")}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex items-start gap-2">
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() =>
                title.trim() &&
                title !== task.title &&
                commit("title", { title: title.trim() }, () => setTitle(task.title))
              }
              rows={2}
              className="w-full resize-none border-none bg-transparent font-serif text-xl font-semibold leading-snug text-zinc-950 focus:outline-none dark:text-zinc-50"
            />
            {savingFields.has("title") && <Spinner size={13} />}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <PrioritySelect value={task.priority} onChange={(priority) => commit("priority", { priority })} />
              {savingFields.has("priority") && <Spinner size={11} />}
            </div>

            <div className="flex items-center gap-1.5">
              <AssigneePicker
                members={boardMembers}
                value={task.assignee?.id ?? null}
                onChange={(assigneeId) => commit("assignee", { assigneeId })}
              />
              {savingFields.has("assignee") && <Spinner size={11} />}
            </div>

            <div className="glass-field flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400">
              <Calendar size={12} className="text-zinc-400" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={() =>
                  dueDate !== (task.dueDate ? task.dueDate.slice(0, 10) : "") &&
                  commit("dueDate", { dueDate }, () => setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : ""))
                }
                className="bg-transparent focus:outline-none"
              />
              {savingFields.has("dueDate") && <Spinner size={11} />}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {task.labels.map((label) => (
              <button
                key={label.id}
                onClick={() =>
                  commit("labels", { labelIds: task.labels.filter((l) => l.id !== label.id).map((l) => l.id) })
                }
              >
                <LabelChip name={label.name} color={label.color} />
              </button>
            ))}
            <LabelPicker
              boardLabels={boardLabels}
              selectedIds={task.labels.map((l) => l.id)}
              onToggle={(labelId) => {
                const has = task.labels.some((l) => l.id === labelId);
                const ids = has
                  ? task.labels.filter((l) => l.id !== labelId).map((l) => l.id)
                  : [...task.labels.map((l) => l.id), labelId];
                commit("labels", { labelIds: ids });
              }}
              onCreate={onCreateLabel}
            />
            {savingFields.has("labels") && <Spinner size={11} />}
          </div>

          <div className="mt-5 flex items-center gap-2">
            <label className="block text-xs font-medium text-zinc-500">{t("description")}</label>
            {savingFields.has("description") && <Spinner size={11} />}
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() =>
              description !== (task.description ?? "") &&
              commit("description", { description }, () => setDescription(task.description ?? ""))
            }
            rows={4}
            placeholder={t("descriptionPlaceholder")}
            className="glass-field mt-1 w-full rounded-md px-2.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:text-zinc-200"
          />

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-500">{t("checklist")}</label>
              {task.checklist.length > 0 && (
                <span className="text-xs text-zinc-400">
                  {doneCount}/{task.checklist.length}
                </span>
              )}
            </div>

            {task.checklist.length > 0 && (
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${(doneCount / task.checklist.length) * 100}%` }}
                />
              </div>
            )}

            <div className="mt-2 flex flex-col gap-0.5">
              {task.checklist.map((item) => {
                const itemPending = item.id.startsWith("temp-");
                return (
                  <div
                    key={item.id}
                    className={`group flex items-center gap-2 rounded px-1 py-1 transition-colors hover:bg-zinc-900/5 dark:hover:bg-white/5 ${itemPending ? "opacity-60" : ""}`}
                  >
                    {itemPending ? (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-zinc-400">
                        <Spinner size={11} />
                      </span>
                    ) : (
                      <button
                        onClick={() => onToggleChecklistItem(item.id, !item.done)}
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          item.done
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-zinc-300 dark:border-zinc-600"
                        }`}
                      >
                        {item.done && <Check size={11} strokeWidth={3} />}
                      </button>
                    )}
                    <span
                      className={`flex-1 text-sm ${item.done ? "text-zinc-400 line-through" : "text-zinc-700 dark:text-zinc-300"}`}
                    >
                      {item.text}
                    </span>
                    <button
                      onClick={() => onDeleteChecklistItem(item.id)}
                      disabled={itemPending}
                      className="rounded p-0.5 text-zinc-300 opacity-0 hover:text-red-500 group-hover:opacity-100 disabled:cursor-wait"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newChecklistText.trim() || addingChecklistItem) return;
                onAddChecklistItem(newChecklistText.trim());
                setNewChecklistText("");
              }}
              className="mt-1 flex items-center gap-2 px-1"
            >
              {addingChecklistItem ? (
                <span className="shrink-0 text-zinc-400">
                  <Spinner size={13} />
                </span>
              ) : (
                <Plus size={13} className="shrink-0 text-zinc-400" />
              )}
              <input
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder={t("addItemPlaceholder")}
                disabled={addingChecklistItem}
                className="flex-1 bg-transparent py-1 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none disabled:cursor-wait dark:text-zinc-300"
              />
            </form>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-500">{t("attachments")}</label>
              {task.attachments.length > 0 && (
                <span className="text-xs text-zinc-400">{task.attachments.length}</span>
              )}
            </div>

            <div className="mt-2 flex flex-col gap-1.5">
              {task.attachments.map((attachment) => {
                const pending = attachment.id.startsWith("temp-");
                const url = `/api/task-attachments/${attachment.id}`;
                const isImage = attachment.fileType.startsWith("image/");
                return (
                  <div
                    key={attachment.id}
                    className={`group flex items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-2 text-sm dark:border-zinc-800 ${pending ? "opacity-60" : ""}`}
                  >
                    {pending ? (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-zinc-400">
                        <Spinner size={13} />
                      </span>
                    ) : isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={attachment.fileName} className="h-8 w-8 shrink-0 rounded object-cover" />
                    ) : (
                      <Paperclip size={14} className="shrink-0 text-zinc-400" />
                    )}
                    {pending ? (
                      <span className="min-w-0 flex-1 truncate text-zinc-500">{attachment.fileName}</span>
                    ) : (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 flex-1 truncate text-zinc-700 hover:underline dark:text-zinc-300"
                      >
                        {attachment.fileName}
                      </a>
                    )}
                    <span className="shrink-0 text-xs text-zinc-400">{formatFileSize(attachment.fileSize)}</span>
                    {!pending && (
                      <>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded p-0.5 text-zinc-300 opacity-0 hover:text-zinc-600 group-hover:opacity-100 dark:hover:text-zinc-300"
                          aria-label={t("downloadAria", { fileName: attachment.fileName })}
                        >
                          <Download size={13} />
                        </a>
                        <button
                          onClick={() => onDeleteAttachment(attachment.id)}
                          className="shrink-0 rounded p-0.5 text-zinc-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
                          aria-label={t("removeAttachmentAria", { fileName: attachment.fileName })}
                        >
                          <X size={13} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) onAddAttachments(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1.5 flex items-center gap-2 rounded px-1 py-1 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <Plus size={13} className="shrink-0" />
              {t("attachFile")}
            </button>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-500">{tActivity("heading")}</label>
              {!activityLoading && activity && activity.length > 0 && (
                <span className="text-xs text-zinc-400">{activity.length}</span>
              )}
            </div>

            {activityLoading || activity === null ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                <Spinner size={13} />
                {tActivity("loading")}
              </div>
            ) : activity.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-400">{tActivity("empty")}</p>
            ) : (
              <div className="mt-1 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                {activity.map((entry) => (
                  <ActivityFeedItem key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
