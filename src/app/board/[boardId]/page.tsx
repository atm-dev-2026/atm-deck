"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ChevronLeft, ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { priorityConfig } from "@/components/priority";
import { LabelChip } from "@/components/LabelChip";
import { Spinner } from "@/components/Spinner";
import { VisibilityBadge, type BoardVisibility } from "@/components/VisibilityBadge";
import { InviteMembersPanel, type BoardMemberT } from "@/components/InviteMembersPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import type { LabelColor } from "@/components/labelColors";
import { TaskPanel, type TaskT, type LabelT } from "../TaskPanel";

type Column = {
  id: string;
  name: string;
  order: number;
  tasks: TaskT[];
};

type UserSummary = { id: string; name: string | null; email: string | null; image: string | null };
type Department = { id: string; name: string };

type Board = {
  id: string;
  name: string;
  ownerId: string;
  owner: UserSummary;
  visibilityType: BoardVisibility;
  departmentId: string | null;
  labels: LabelT[];
  columns: Column[];
  members: BoardMemberT[];
  access: { role: string; canEdit: boolean; canDelete: boolean; canManageMembers: boolean };
};

type DragOver = { columnId: string; index: number };

type PendingDelete =
  | { type: "column"; column: Column }
  | { type: "task"; task: TaskT };

export default function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [board, setBoard] = useState<Board | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({});
  const [newColumnName, setNewColumnName] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [submittingColumn, setSubmittingColumn] = useState(false);
  const [addingTaskFor, setAddingTaskFor] = useState<Set<string>>(new Set());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<DragOver | null>(null);

  const [editingBoard, setEditingBoard] = useState(false);
  const [editName, setEditName] = useState("");
  const [editVisibility, setEditVisibility] = useState<BoardVisibility>("PERSONAL");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [savingBoard, setSavingBoard] = useState(false);
  const [boardEditError, setBoardEditError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [deleteItemError, setDeleteItemError] = useState<string | null>(null);

  const [deletingBoard, setDeletingBoard] = useState(false);
  const [confirmingBoardDelete, setConfirmingBoardDelete] = useState(false);
  const [boardDeleteError, setBoardDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch(`/api/boards/${boardId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!ignore) setBoard(data);
    })();
    return () => {
      ignore = true;
    };
  }, [boardId]);

  const updateColumns = (updater: (columns: Column[]) => Column[]) => {
    setBoard((prev) => (prev ? { ...prev, columns: updater(prev.columns) } : prev));
  };

  const openEditBoard = () => {
    if (!board) return;
    setEditName(board.name);
    setEditVisibility(board.visibilityType);
    setEditDepartmentId(board.departmentId ?? "");
    setBoardEditError(null);
    setEditingBoard(true);
    if (departments.length === 0) {
      fetch("/api/departments")
        .then((res) => res.json())
        .then((data) => setDepartments(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  };

  const saveBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!board || !editName.trim() || savingBoard) return;
    if (editVisibility === "DEPARTMENT" && !editDepartmentId) {
      setBoardEditError("Pick a department for a department board.");
      return;
    }
    setSavingBoard(true);
    setBoardEditError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          visibilityType: editVisibility,
          departmentId: editVisibility === "DEPARTMENT" ? editDepartmentId : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBoard((prev) => (prev ? { ...prev, ...data } : prev));
        setEditingBoard(false);
      } else {
        setBoardEditError(data?.error ?? "Couldn't save changes.");
      }
    } finally {
      setSavingBoard(false);
    }
  };

  const confirmDeleteBoard = async () => {
    setDeletingBoard(true);
    setBoardDeleteError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setBoardDeleteError(data?.error ?? "Couldn't delete the board.");
        return;
      }
      router.push("/");
    } finally {
      setDeletingBoard(false);
    }
  };

  const mergeTask = (taskId: string, patch: Partial<TaskT>) => {
    updateColumns((cols) =>
      cols.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      })),
    );
  };

  const addTask = async (columnId: string) => {
    const title = newTaskTitle[columnId]?.trim();
    if (!title || addingTaskFor.has(columnId)) return;
    setNewTaskTitle((prev) => ({ ...prev, [columnId]: "" }));
    setAddingTaskFor((prev) => new Set(prev).add(columnId));

    const tempId = `temp-${Math.random().toString(36).slice(2)}`;
    const tempTask: TaskT = {
      id: tempId,
      title,
      description: null,
      assignee: null,
      dueDate: null,
      order: 0,
      columnId,
      priority: "NONE",
      labels: [],
      checklist: [],
    };
    updateColumns((cols) =>
      cols.map((c) => (c.id === columnId ? { ...c, tasks: [...c.tasks, tempTask] } : c)),
    );

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId, title }),
      });
      if (res.ok) {
        const task: TaskT = await res.json();
        updateColumns((cols) =>
          cols.map((c) =>
            c.id === columnId ? { ...c, tasks: c.tasks.map((t) => (t.id === tempId ? task : t)) } : c,
          ),
        );
      } else {
        const data = await res.json().catch(() => null);
        updateColumns((cols) =>
          cols.map((c) => (c.id === columnId ? { ...c, tasks: c.tasks.filter((t) => t.id !== tempId) } : c)),
        );
        toast.error(data?.error ?? "Couldn't create the task.");
      }
    } finally {
      setAddingTaskFor((prev) => {
        const next = new Set(prev);
        next.delete(columnId);
        return next;
      });
    }
  };

  const addColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newColumnName.trim();
    if (!name || submittingColumn) return;
    setNewColumnName("");
    setAddingColumn(false);
    setSubmittingColumn(true);

    const tempId = `temp-${Math.random().toString(36).slice(2)}`;
    const tempColumn: Column = { id: tempId, name, order: board?.columns.length ?? 0, tasks: [] };
    setBoard((prev) => (prev ? { ...prev, columns: [...prev.columns, tempColumn] } : prev));

    try {
      const res = await fetch("/api/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, name }),
      });
      if (res.ok) {
        const column = await res.json();
        setBoard((prev) =>
          prev
            ? { ...prev, columns: prev.columns.map((c) => (c.id === tempId ? { ...column, tasks: [] } : c)) }
            : prev,
        );
      } else {
        const data = await res.json().catch(() => null);
        setBoard((prev) => (prev ? { ...prev, columns: prev.columns.filter((c) => c.id !== tempId) } : prev));
        toast.error(data?.error ?? "Couldn't create the column.");
      }
    } finally {
      setSubmittingColumn(false);
    }
  };

  const requestDeleteTask = (task: TaskT) => {
    if (task.id.startsWith("temp-")) {
      updateColumns((cols) => cols.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== task.id) })));
      setEditingTaskId((id) => (id === task.id ? null : id));
      return;
    }
    setDeleteItemError(null);
    setPendingDelete({ type: "task", task });
  };

  const requestDeleteColumn = (column: Column) => {
    if (column.id.startsWith("temp-")) {
      updateColumns((cols) => cols.filter((c) => c.id !== column.id));
      return;
    }
    setDeleteItemError(null);
    setPendingDelete({ type: "column", column });
  };

  const confirmPendingDelete = async () => {
    if (!pendingDelete) return;
    setDeletingItem(true);
    setDeleteItemError(null);
    try {
      if (pendingDelete.type === "task") {
        const { task } = pendingDelete;
        const previousColumns = board!.columns.map((c) => ({ ...c, tasks: [...c.tasks] }));
        updateColumns((cols) => cols.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== task.id) })));
        setEditingTaskId((id) => (id === task.id ? null : id));
        const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setBoard((prev) => (prev ? { ...prev, columns: previousColumns } : prev));
          setDeleteItemError(data?.error ?? "Couldn't delete the task.");
          return;
        }
      } else {
        const { column } = pendingDelete;
        const previousColumns = board!.columns;
        updateColumns((cols) => cols.filter((c) => c.id !== column.id));
        const res = await fetch(`/api/columns/${column.id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setBoard((prev) => (prev ? { ...prev, columns: previousColumns } : prev));
          setDeleteItemError(data?.error ?? "Couldn't delete the column.");
          return;
        }
      }
      setPendingDelete(null);
    } finally {
      setDeletingItem(false);
    }
  };

  const patchTask = async (taskId: string, patch: Record<string, unknown>): Promise<boolean> => {
    const body: Record<string, unknown> = { ...patch };
    if ("description" in body) body.description = body.description || null;
    if ("assignee" in body) body.assignee = body.assignee || null;
    if ("dueDate" in body) body.dueDate = body.dueDate || null;

    const previousTask = board?.columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    mergeTask(taskId, patch as Partial<TaskT>);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      mergeTask(taskId, updated);
      return true;
    }
    const data = await res.json().catch(() => null);
    if (previousTask) mergeTask(taskId, previousTask);
    toast.error(data?.error ?? "Couldn't save changes.");
    return false;
  };

  const createLabel = async (taskId: string, currentLabelIds: string[], name: string, color: LabelColor) => {
    const res = await fetch(`/api/boards/${boardId}/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Couldn't create the label.");
      return;
    }
    const label: LabelT = await res.json();
    setBoard((prev) => (prev ? { ...prev, labels: [...prev.labels, label] } : prev));
    patchTask(taskId, { labelIds: [...currentLabelIds, label.id] });
  };

  const addChecklistItem = async (taskId: string, text: string) => {
    const res = await fetch(`/api/tasks/${taskId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Couldn't add the item.");
      return;
    }
    const item = await res.json();
    updateColumns((cols) =>
      cols.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) => (t.id === taskId ? { ...t, checklist: [...t.checklist, item] } : t)),
      })),
    );
  };

  const toggleChecklistItem = async (taskId: string, itemId: string, done: boolean) => {
    const previousDone = board
      ?.columns.flatMap((c) => c.tasks)
      .find((t) => t.id === taskId)
      ?.checklist.find((ci) => ci.id === itemId)?.done;
    updateColumns((cols) =>
      cols.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) =>
          t.id === taskId
            ? { ...t, checklist: t.checklist.map((ci) => (ci.id === itemId ? { ...ci, done } : ci)) }
            : t,
        ),
      })),
    );
    const res = await fetch(`/api/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    if (!res.ok && previousDone !== undefined) {
      updateColumns((cols) =>
        cols.map((c) => ({
          ...c,
          tasks: c.tasks.map((t) =>
            t.id === taskId
              ? { ...t, checklist: t.checklist.map((ci) => (ci.id === itemId ? { ...ci, done: previousDone } : ci)) }
              : t,
          ),
        })),
      );
      toast.error("Couldn't update the checklist item.");
    }
  };

  const deleteChecklistItem = async (taskId: string, itemId: string) => {
    const task = board?.columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    const removedIndex = task?.checklist.findIndex((ci) => ci.id === itemId) ?? -1;
    const removedItem = removedIndex >= 0 ? task!.checklist[removedIndex] : undefined;
    updateColumns((cols) =>
      cols.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) =>
          t.id === taskId ? { ...t, checklist: t.checklist.filter((ci) => ci.id !== itemId) } : t,
        ),
      })),
    );
    const res = await fetch(`/api/checklist/${itemId}`, { method: "DELETE" });
    if (!res.ok && removedItem) {
      updateColumns((cols) =>
        cols.map((c) => ({
          ...c,
          tasks: c.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const checklist = [...t.checklist];
            checklist.splice(removedIndex, 0, removedItem);
            return { ...t, checklist };
          }),
        })),
      );
      toast.error("Couldn't delete the checklist item.");
    }
  };

  const handleDrop = async () => {
    if (!board || !draggingId || !dragOver) {
      setDraggingId(null);
      setDragOver(null);
      return;
    }
    const { columnId: targetColumnId, index: dropIndex } = dragOver;
    const draggedId = draggingId;
    setDraggingId(null);
    setDragOver(null);

    const sourceColumn = board.columns.find((c) => c.tasks.some((t) => t.id === draggedId));
    if (!sourceColumn) return;
    const sourceIndex = sourceColumn.tasks.findIndex((t) => t.id === draggedId);
    const draggedTask = sourceColumn.tasks[sourceIndex];

    let targetIndex = dropIndex;
    if (sourceColumn.id === targetColumnId && sourceIndex < dropIndex) targetIndex -= 1;

    const previousColumns = board.columns;
    const newColumns = board.columns.map((c) => ({ ...c, tasks: [...c.tasks] }));
    const srcCol = newColumns.find((c) => c.id === sourceColumn.id)!;
    const dstCol = newColumns.find((c) => c.id === targetColumnId)!;

    srcCol.tasks.splice(sourceIndex, 1);
    const movedTask = { ...draggedTask, columnId: targetColumnId };
    dstCol.tasks.splice(Math.max(0, Math.min(targetIndex, dstCol.tasks.length)), 0, movedTask);

    srcCol.tasks.forEach((t, i) => (t.order = i));
    if (dstCol.id !== srcCol.id) dstCol.tasks.forEach((t, i) => (t.order = i));

    setBoard({ ...board, columns: newColumns });

    const touchedCols = dstCol.id === srcCol.id ? [dstCol] : [srcCol, dstCol];
    try {
      const responses = await Promise.all(
        touchedCols.flatMap((col) =>
          col.tasks.map((t) =>
            fetch(`/api/tasks/${t.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order: t.order,
                ...(t.id === draggedId ? { columnId: targetColumnId } : {}),
              }),
            }),
          ),
        ),
      );
      if (responses.some((r) => !r.ok)) {
        setBoard((prev) => (prev ? { ...prev, columns: previousColumns } : prev));
        toast.error("Couldn't save the new task order.");
      }
    } catch {
      setBoard((prev) => (prev ? { ...prev, columns: previousColumns } : prev));
      toast.error("Couldn't save the new task order.");
    }
  };

  if (!board) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  const columns = [...board.columns].sort((a, b) => a.order - b.order);
  const editingTask = editingTaskId
    ? columns.flatMap((c) => c.tasks).find((t) => t.id === editingTaskId) ?? null
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Link
          href="/"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <ChevronLeft size={16} />
        </Link>
        {editingBoard ? (
          <form onSubmit={saveBoard} className="flex flex-1 flex-wrap items-center gap-2">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="min-w-0 max-w-xs flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
            <select
              value={editVisibility}
              onChange={(e) => setEditVisibility(e.target.value as BoardVisibility)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="PERSONAL">Personal</option>
              <option value="DEPARTMENT">Department</option>
              <option value="GLOBAL">Global</option>
            </select>
            {editVisibility === "DEPARTMENT" && (
              <select
                value={editDepartmentId}
                onChange={(e) => setEditDepartmentId(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="">Select a department…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="submit"
              disabled={savingBoard}
              className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
            >
              {savingBoard && <Spinner size={12} />}
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingBoard(false)}
              disabled={savingBoard}
              className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            {boardEditError && <p className="w-full text-xs text-red-500">{boardEditError}</p>}
          </form>
        ) : (
          <>
            <h1 className="min-w-0 max-w-[50vw] truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50 sm:max-w-xs">
              {board.name}
            </h1>
            <VisibilityBadge visibilityType={board.visibilityType} />
            {board.access.canEdit && (
              <button
                onClick={openEditBoard}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label="Edit board"
              >
                <Pencil size={13} />
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <InviteMembersPanel
                boardId={board.id}
                owner={board.owner}
                members={board.members}
                canManageMembers={board.access.canManageMembers}
                onInvited={(member) =>
                  setBoard((prev) =>
                    prev
                      ? {
                          ...prev,
                          members: [...prev.members.filter((m) => m.user.id !== member.user.id), member],
                        }
                      : prev,
                  )
                }
                onRemoved={(userId) =>
                  setBoard((prev) =>
                    prev ? { ...prev, members: prev.members.filter((m) => m.user.id !== userId) } : prev,
                  )
                }
                onRoleChanged={(userId, role) =>
                  setBoard((prev) =>
                    prev
                      ? {
                          ...prev,
                          members: prev.members.map((m) => (m.user.id === userId ? { ...m, role } : m)),
                        }
                      : prev,
                  )
                }
              />
              {board.access.canDelete && (
                <button
                  onClick={() => {
                    setBoardDeleteError(null);
                    setConfirmingBoardDelete(true);
                  }}
                  className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                  aria-label="Delete board"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-1 gap-3 overflow-x-auto p-4">
        {columns.map((column) => {
          const columnPending = column.id.startsWith("temp-");
          return (
          <div
            key={column.id}
            className={`flex w-[85vw] max-w-72 shrink-0 flex-col rounded-lg bg-zinc-100/70 dark:bg-zinc-900/60 sm:w-72 ${columnPending ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{column.name}</h2>
                {columnPending ? (
                  <Spinner size={11} />
                ) : (
                  <span className="rounded-full bg-zinc-200/70 px-1.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {column.tasks.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => requestDeleteColumn(column)}
                disabled={columnPending}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-red-500 dark:hover:bg-zinc-800"
                aria-label="Delete column"
              >
                <X size={13} />
              </button>
            </div>

            <div
              className="flex min-h-8 flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-1"
              onDragOver={(e) => {
                e.preventDefault();
                if (e.target === e.currentTarget) setDragOver({ columnId: column.id, index: column.tasks.length });
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop();
              }}
            >
              {column.tasks.map((task, index) => (
                <div key={task.id}>
                  {dragOver?.columnId === column.id && dragOver.index === index && draggingId && (
                    <div className="mb-1.5 h-0.5 rounded-full bg-accent" />
                  )}
                  <TaskCard
                    task={task}
                    dragging={draggingId === task.id}
                    onDragStart={() => setDraggingId(task.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOver(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const before = e.clientY < rect.top + rect.height / 2;
                      setDragOver({ columnId: column.id, index: before ? index : index + 1 });
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDrop();
                    }}
                    onClick={() => setEditingTaskId(task.id)}
                    onDelete={() => requestDeleteTask(task)}
                  />
                </div>
              ))}
              {dragOver?.columnId === column.id && dragOver.index === column.tasks.length && draggingId && (
                <div className="h-0.5 rounded-full bg-accent" />
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addTask(column.id);
              }}
              className="flex items-center gap-1 p-2"
            >
              {addingTaskFor.has(column.id) ? (
                <span className="shrink-0 text-zinc-400">
                  <Spinner size={13} />
                </span>
              ) : (
                <Plus size={13} className="shrink-0 text-zinc-400" />
              )}
              <input
                value={newTaskTitle[column.id] ?? ""}
                onChange={(e) => setNewTaskTitle((prev) => ({ ...prev, [column.id]: e.target.value }))}
                placeholder="Add a task"
                disabled={columnPending || addingTaskFor.has(column.id)}
                className="min-w-0 flex-1 bg-transparent py-1 text-xs text-zinc-700 placeholder:text-zinc-400 focus:outline-none disabled:cursor-wait dark:text-zinc-300"
              />
            </form>
          </div>
          );
        })}

        {addingColumn ? (
          <form
            onSubmit={addColumn}
            className="flex w-[85vw] max-w-72 shrink-0 flex-col gap-2 rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-700 sm:w-72"
          >
            <input
              autoFocus
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Column name"
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-accent/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <div className="flex gap-1.5">
              <button
                type="submit"
                disabled={submittingColumn}
                className="flex items-center gap-1.5 rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
              >
                {submittingColumn && <Spinner size={11} />}
                Add column
              </button>
              <button
                type="button"
                onClick={() => setAddingColumn(false)}
                disabled={submittingColumn}
                className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingColumn(true)}
            disabled={submittingColumn}
            className="flex h-9 w-[85vw] max-w-56 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 text-xs font-medium text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 disabled:cursor-wait disabled:opacity-70 dark:border-zinc-700 dark:hover:text-zinc-300 sm:w-56"
          >
            {submittingColumn ? <Spinner size={13} /> : <Plus size={13} />}
            Add column
          </button>
        )}
      </div>

      {editingTask && (
        <TaskPanel
          task={editingTask}
          boardLabels={board.labels}
          onClose={() => setEditingTaskId(null)}
          onUpdate={(patch) => patchTask(editingTask.id, patch)}
          onDelete={() => requestDeleteTask(editingTask)}
          onCreateLabel={(name, color) =>
            createLabel(editingTask.id, editingTask.labels.map((l) => l.id), name, color)
          }
          onAddChecklistItem={(text) => addChecklistItem(editingTask.id, text)}
          onToggleChecklistItem={(itemId, done) => toggleChecklistItem(editingTask.id, itemId, done)}
          onDeleteChecklistItem={(itemId) => deleteChecklistItem(editingTask.id, itemId)}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete
            ? pendingDelete.type === "column"
              ? `Delete "${pendingDelete.column.name}"?`
              : `Delete "${pendingDelete.task.title}"?`
            : ""
        }
        description={
          pendingDelete?.type === "column"
            ? `This removes ${pendingDelete.column.tasks.length} ${
                pendingDelete.column.tasks.length === 1 ? "task" : "tasks"
              }. This can't be undone.`
            : "This can't be undone."
        }
        pending={deletingItem}
        error={deleteItemError}
        onConfirm={confirmPendingDelete}
        onCancel={() => {
          if (!deletingItem) setPendingDelete(null);
        }}
      />

      <ConfirmDialog
        open={confirmingBoardDelete}
        title={`Delete "${board.name}"?`}
        description={`This permanently removes ${board.columns.length} ${
          board.columns.length === 1 ? "column" : "columns"
        } and all its tasks. This can't be undone.`}
        pending={deletingBoard}
        error={boardDeleteError}
        onConfirm={confirmDeleteBoard}
        onCancel={() => {
          if (!deletingBoard) setConfirmingBoardDelete(false);
        }}
      />
    </div>
  );
}

function TaskCard({
  task,
  dragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onClick,
  onDelete,
}: {
  task: TaskT;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick: () => void;
  onDelete: () => void;
}) {
  const priority = priorityConfig(task.priority);
  const PriorityIcon = priority.icon;
  const doneCount = task.checklist.filter((c) => c.done).length;
  const overdue = task.dueDate ? new Date(task.dueDate) < new Date(new Date().toDateString()) : false;
  const pending = task.id.startsWith("temp-");

  return (
    <div
      draggable={!pending}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={pending ? undefined : onClick}
      className={`group rounded-md border border-zinc-200 bg-white p-2.5 text-sm shadow-sm transition dark:border-zinc-800 dark:bg-zinc-950 ${
        pending ? "opacity-50" : "cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700"
      } ${dragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5">
          {pending ? (
            <Spinner size={13} />
          ) : (
            task.priority !== "NONE" && (
              <PriorityIcon size={13} strokeWidth={2.5} className={`mt-0.5 shrink-0 ${priority.className}`} />
            )
          )}
          <span className="text-zinc-900 dark:text-zinc-50">{task.title}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 rounded p-0.5 text-zinc-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
          aria-label="Delete task"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {task.labels.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <LabelChip key={label.id} name={label.name} color={label.color} />
          ))}
        </div>
      )}

      {(task.assignee || task.dueDate || task.checklist.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
          {task.assignee && <span className="truncate">{task.assignee}</span>}
          {task.dueDate && (
            <span className={`flex items-center gap-1 ${overdue ? "text-red-500" : ""}`}>
              <Calendar size={11} />
              {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
          {task.checklist.length > 0 && (
            <span className="flex items-center gap-1">
              <ListChecks size={11} />
              {doneCount}/{task.checklist.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
