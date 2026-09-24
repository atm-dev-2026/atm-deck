"use client";

import { useState } from "react";
import { Calendar, Check, Plus, Trash2, User, X } from "lucide-react";
import { PrioritySelect } from "@/components/PrioritySelect";
import { LabelPicker } from "@/components/LabelPicker";
import { LabelChip } from "@/components/LabelChip";
import { Spinner } from "@/components/Spinner";
import type { LabelColor } from "@/components/labelColors";
import type { Priority } from "@/components/priority";

export type ChecklistItemT = { id: string; text: string; done: boolean; order: number };
export type LabelT = { id: string; name: string; color: string };
export type TaskT = {
  id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  dueDate: string | null;
  order: number;
  columnId: string;
  priority: Priority;
  labels: LabelT[];
  checklist: ChecklistItemT[];
};

type TaskPatch = Partial<{
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: Priority;
  labelIds: string[];
}>;

export function TaskPanel({
  task,
  boardLabels,
  onClose,
  onUpdate,
  onDelete,
  onCreateLabel,
  addingChecklistItem = false,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
}: {
  task: TaskT;
  boardLabels: LabelT[];
  onClose: () => void;
  onUpdate: (patch: TaskPatch) => Promise<boolean>;
  onDelete: () => void;
  onCreateLabel: (name: string, color: LabelColor) => Promise<void>;
  addingChecklistItem?: boolean;
  onAddChecklistItem: (text: string) => void;
  onToggleChecklistItem: (itemId: string, done: boolean) => void;
  onDeleteChecklistItem: (itemId: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [assignee, setAssignee] = useState(task.assignee ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");
  const [newChecklistText, setNewChecklistText] = useState("");
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());

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
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Task</span>
          <div className="flex items-center gap-1">
            <button
              onClick={onDelete}
              className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              aria-label="Delete task"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label="Close"
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

            <div className="glass-field flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400">
              <User size={12} className="text-zinc-400" />
              <input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                onBlur={() =>
                  assignee !== (task.assignee ?? "") &&
                  commit("assignee", { assignee }, () => setAssignee(task.assignee ?? ""))
                }
                placeholder="Unassigned"
                className="w-24 bg-transparent focus:outline-none"
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
            <label className="block text-xs font-medium text-zinc-500">Description</label>
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
            placeholder="Add more detail…"
            className="glass-field mt-1 w-full rounded-md px-2.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:text-zinc-200"
          />

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-500">Checklist</label>
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
                placeholder="Add item"
                disabled={addingChecklistItem}
                className="flex-1 bg-transparent py-1 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none disabled:cursor-wait dark:text-zinc-300"
              />
            </form>
          </div>
        </div>
      </aside>
    </div>
  );
}
