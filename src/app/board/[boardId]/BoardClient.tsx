"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Calendar, ChevronLeft, ListChecks, Paperclip, Pencil, Plus, Trash2, X } from "lucide-react";
import { priorityConfig } from "@/components/priority";
import { LabelChip } from "@/components/LabelChip";
import { Spinner } from "@/components/Spinner";
import { Avatar } from "@/components/Avatar";
import { VisibilityBadge, type BoardVisibility } from "@/components/VisibilityBadge";
import { InviteMembersPanel, type BoardMemberT } from "@/components/InviteMembersPanel";
import { BoardActivityPanel } from "@/components/BoardActivityPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import type { LabelColor } from "@/components/labelColors";
import { supabase } from "@/lib/supabase";
import { TaskPanel, type TaskT, type LabelT } from "../TaskPanel";

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

type Column = {
  id: string;
  name: string;
  order: number;
  tasks: TaskT[];
};

type UserSummary = { id: string; name: string | null; email: string | null; image: string | null };
type Department = { id: string; name: string };

export type Board = {
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

export default function BoardClient({
  boardId,
  initialBoard,
}: {
  boardId: string;
  initialBoard: Board;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const t = useTranslations("Boards.board");
  const tf = useTranslations("Boards.form");
  const tl = useTranslations("Boards.list");
  const [board, setBoard] = useState<Board>(initialBoard);
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({});
  const [newColumnName, setNewColumnName] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [submittingColumn, setSubmittingColumn] = useState(false);
  const [addingTaskFor, setAddingTaskFor] = useState<Set<string>>(new Set());
  const [addingChecklistFor, setAddingChecklistFor] = useState<Set<string>>(new Set());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(() => {
    const taskId = searchParams.get("task");
    const isOpenable = taskId && initialBoard.columns.some((c) => c.tasks.some((t) => t.id === taskId));
    return isOpenable ? taskId : null;
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<DragOver | null>(null);

  const [editingBoard, setEditingBoard] = useState(false);
  const [editName, setEditName] = useState("");
  const [editVisibility, setEditVisibility] = useState<BoardVisibility>("PERSONAL");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [savingBoard, setSavingBoard] = useState(false);
  const [boardEditError, setBoardEditError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [deleteItemError, setDeleteItemError] = useState<string | null>(null);

  const [deletingBoard, setDeletingBoard] = useState(false);
  const [confirmingBoardDelete, setConfirmingBoardDelete] = useState(false);
  const [boardDeleteError, setBoardDeleteError] = useState<string | null>(null);

  const updateColumns = (updater: (columns: Column[]) => Column[]) => {
    setBoard((prev) => (prev ? { ...prev, columns: updater(prev.columns) } : prev));
  };

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const applyTaskUpsert = (task: TaskT) => {
      updateColumns((cols) =>
        cols.map((c) => {
          const withoutTask = c.tasks.filter((t) => t.id !== task.id);
          if (c.id !== task.columnId) return { ...c, tasks: withoutTask };
          return { ...c, tasks: [...withoutTask, task].sort((a, b) => a.order - b.order) };
        }),
      );
    };

    const applyTaskDelete = (taskId: string) => {
      updateColumns((cols) => cols.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== taskId) })));
    };

    const channel = client
      .channel(`board:${boardId}`)
      .on("broadcast", { event: "task-created" }, ({ payload }) => applyTaskUpsert(payload as TaskT))
      .on("broadcast", { event: "task-updated" }, ({ payload }) => applyTaskUpsert(payload as TaskT))
      .on("broadcast", { event: "task-deleted" }, ({ payload }) =>
        applyTaskDelete((payload as { id: string }).id),
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [boardId]);

  const openEditBoard = () => {
    if (!board) return;
    setEditName(board.name);
    setEditVisibility(board.visibilityType);
    setEditDepartmentId(board.departmentId ?? "");
    setBoardEditError(null);
    setEditingBoard(true);
    if (departments.length === 0) {
      setDepartmentsLoading(true);
      fetch("/api/departments")
        .then((res) => res.json())
        .then((data) => setDepartments(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setDepartmentsLoading(false));
    }
  };

  const saveBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!board || !editName.trim() || savingBoard) return;
    if (editVisibility === "DEPARTMENT" && !editDepartmentId) {
      setBoardEditError(tf("pickDepartment"));
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
        setBoardEditError(data?.error ?? t("saveFailed"));
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
        setBoardDeleteError(data?.error ?? tl("deleteFailed"));
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
      number: 0,
      title,
      description: null,
      assignee: null,
      dueDate: null,
      order: 0,
      columnId,
      priority: "NONE",
      labels: [],
      checklist: [],
      attachments: [],
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
          cols.map((c) => {
            if (c.id !== columnId) return c;
            // The realtime "task-created" broadcast for this same task may already have
            // inserted it (keyed by its real id) before this response arrives — drop both
            // the temp placeholder and any such duplicate before adding the real task.
            const withoutTempOrDuplicate = c.tasks.filter((t) => t.id !== tempId && t.id !== task.id);
            return { ...c, tasks: [...withoutTempOrDuplicate, task].sort((a, b) => a.order - b.order) };
          }),
        );
      } else {
        const data = await res.json().catch(() => null);
        updateColumns((cols) =>
          cols.map((c) => (c.id === columnId ? { ...c, tasks: c.tasks.filter((t) => t.id !== tempId) } : c)),
        );
        toast.error(data?.error ?? t("createTaskFailed"));
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
        toast.error(data?.error ?? t("createColumnFailed"));
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
          setDeleteItemError(data?.error ?? t("deleteTaskFailed"));
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
          setDeleteItemError(data?.error ?? t("deleteColumnFailed"));
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
    toast.error(data?.error ?? t("saveFailed"));
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
      toast.error(data?.error ?? t("createLabelFailed"));
      return;
    }
    const label: LabelT = await res.json();
    setBoard((prev) => (prev ? { ...prev, labels: [...prev.labels, label] } : prev));
    patchTask(taskId, { labelIds: [...currentLabelIds, label.id] });
  };

  const addChecklistItem = async (taskId: string, text: string) => {
    if (addingChecklistFor.has(taskId)) return;
    setAddingChecklistFor((prev) => new Set(prev).add(taskId));

    const tempId = `temp-${Math.random().toString(36).slice(2)}`;
    const tempItem = { id: tempId, text, done: false, order: 0 };
    updateColumns((cols) =>
      cols.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) => (t.id === taskId ? { ...t, checklist: [...t.checklist, tempItem] } : t)),
      })),
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        updateColumns((cols) =>
          cols.map((c) => ({
            ...c,
            tasks: c.tasks.map((t) =>
              t.id === taskId ? { ...t, checklist: t.checklist.filter((ci) => ci.id !== tempId) } : t,
            ),
          })),
        );
        toast.error(data?.error ?? t("addItemFailed"));
        return;
      }
      const item = await res.json();
      updateColumns((cols) =>
        cols.map((c) => ({
          ...c,
          tasks: c.tasks.map((t) =>
            t.id === taskId ? { ...t, checklist: t.checklist.map((ci) => (ci.id === tempId ? item : ci)) } : t,
          ),
        })),
      );
    } finally {
      setAddingChecklistFor((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
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
      toast.error(t("updateChecklistFailed"));
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
      toast.error(t("deleteChecklistFailed"));
    }
  };

  const addTaskAttachments = async (taskId: string, files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(t("fileTooBig", { fileName: file.name, maxMb: MAX_ATTACHMENT_SIZE / (1024 * 1024) }));
        continue;
      }
      const fileType = file.type || "application/octet-stream";
      const tempId = `temp-${Math.random().toString(36).slice(2)}`;
      const tempAttachment = { id: tempId, fileName: file.name, fileType, fileSize: file.size };
      updateColumns((cols) =>
        cols.map((c) => ({
          ...c,
          tasks: c.tasks.map((t) =>
            t.id === taskId ? { ...t, attachments: [...t.attachments, tempAttachment] } : t,
          ),
        })),
      );

      const removeTemp = () =>
        updateColumns((cols) =>
          cols.map((c) => ({
            ...c,
            tasks: c.tasks.map((t) =>
              t.id === taskId ? { ...t, attachments: t.attachments.filter((a) => a.id !== tempId) } : t,
            ),
          })),
        );

      try {
        const presignRes = await fetch(`/api/tasks/${taskId}/attachments/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, fileType, fileSize: file.size }),
        });
        if (!presignRes.ok) throw new Error((await presignRes.json().catch(() => null))?.error ?? t("prepareUploadFailed"));
        const { key, uploadUrl } = await presignRes.json();

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": fileType },
          body: file,
        });
        if (!putRes.ok) throw new Error(t("uploadFileFailed"));

        const createRes = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, fileName: file.name, fileType, fileSize: file.size }),
        });
        if (!createRes.ok) throw new Error((await createRes.json().catch(() => null))?.error ?? t("saveAttachmentFailed"));
        const attachment = await createRes.json();

        updateColumns((cols) =>
          cols.map((c) => ({
            ...c,
            tasks: c.tasks.map((t) =>
              t.id === taskId
                ? { ...t, attachments: t.attachments.map((a) => (a.id === tempId ? attachment : a)) }
                : t,
            ),
          })),
        );
      } catch (err) {
        removeTemp();
        toast.error(err instanceof Error ? err.message : t("uploadFailed"));
      }
    }
  };

  const deleteTaskAttachment = async (taskId: string, attachmentId: string) => {
    const task = board?.columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    const removedIndex = task?.attachments.findIndex((a) => a.id === attachmentId) ?? -1;
    const removedAttachment = removedIndex >= 0 ? task!.attachments[removedIndex] : undefined;
    updateColumns((cols) =>
      cols.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) =>
          t.id === taskId ? { ...t, attachments: t.attachments.filter((a) => a.id !== attachmentId) } : t,
        ),
      })),
    );
    const res = await fetch(`/api/task-attachments/${attachmentId}`, { method: "DELETE" });
    if (!res.ok && removedAttachment) {
      updateColumns((cols) =>
        cols.map((c) => ({
          ...c,
          tasks: c.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const attachments = [...t.attachments];
            attachments.splice(removedIndex, 0, removedAttachment);
            return { ...t, attachments };
          }),
        })),
      );
      toast.error(t("deleteAttachmentFailed"));
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
        toast.error(t("reorderFailed"));
      }
    } catch {
      setBoard((prev) => (prev ? { ...prev, columns: previousColumns } : prev));
      toast.error(t("reorderFailed"));
    }
  };

  const columns = [...board.columns].sort((a, b) => a.order - b.order);
  const editingTask = editingTaskId
    ? columns.flatMap((c) => c.tasks).find((t) => t.id === editingTaskId) ?? null
    : null;
  const memberCount = board.members.length + (board.owner ? 1 : 0);
  const showCreator = memberCount > 1;
  const boardMembers = board.owner
    ? [board.owner, ...board.members.map((m) => m.user)]
    : board.members.map((m) => m.user);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="glass relative z-10 flex flex-wrap items-center gap-3 rounded-none border-x-0 border-t-0 px-4 py-3">
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
              className="glass-field min-w-0 max-w-xs flex-1 rounded-md px-2 py-1 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:text-zinc-50"
            />
            <select
              value={editVisibility}
              onChange={(e) => setEditVisibility(e.target.value as BoardVisibility)}
              className="glass-field rounded-md px-2 py-1 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:text-zinc-50"
            >
              <option value="PERSONAL">{tf("visibilityPersonal")}</option>
              <option value="DEPARTMENT">{tf("visibilityDepartment")}</option>
              <option value="GLOBAL">{tf("visibilityGlobal")}</option>
            </select>
            {editVisibility === "DEPARTMENT" && (
              <select
                value={editDepartmentId}
                onChange={(e) => setEditDepartmentId(e.target.value)}
                disabled={departmentsLoading}
                className="glass-field rounded-md px-2 py-1 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-wait dark:text-zinc-50"
              >
                <option value="">{departmentsLoading ? tf("loadingDepartments") : tf("selectDepartment")}</option>
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
              className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground shadow-glow transition-transform hover:-translate-y-0.5 hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
            >
              {savingBoard && <Spinner size={12} />}
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => setEditingBoard(false)}
              disabled={savingBoard}
              className="glass-field rounded-md px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-300"
            >
              {tf("cancel")}
            </button>
            {boardEditError && <p className="w-full text-xs text-red-500">{boardEditError}</p>}
          </form>
        ) : (
          <>
            <h1 className="min-w-0 max-w-[50vw] truncate font-serif text-base font-semibold text-zinc-950 dark:text-zinc-50 sm:max-w-xs">
              {board.name}
            </h1>
            <VisibilityBadge visibilityType={board.visibilityType} />
            {board.access.canEdit && (
              <button
                onClick={openEditBoard}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label={t("editAria")}
              >
                <Pencil size={13} />
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <BoardActivityPanel boardId={board.id} />
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
                  aria-label={tl("deleteBoardAria")}
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
            className={`glass flex w-[85vw] max-w-72 shrink-0 flex-col rounded-xl sm:w-72 ${columnPending ? "opacity-50" : ""}`}
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
                className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-900/10 hover:text-red-500 dark:hover:bg-white/10"
                aria-label={t("deleteColumnAria")}
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
                    <div className="mb-1.5 h-0.5 rounded-full bg-accent shadow-glow" />
                  )}
                  <TaskCard
                    task={task}
                    showCreator={showCreator}
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
                <div className="h-0.5 rounded-full bg-accent shadow-glow" />
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
                placeholder={t("addTaskPlaceholder")}
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
            className="glass flex w-[85vw] max-w-72 shrink-0 flex-col gap-2 rounded-xl p-3 sm:w-72"
          >
            <input
              autoFocus
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder={t("columnNamePlaceholder")}
              className="glass-field rounded px-2 py-1 text-xs text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:text-zinc-50"
            />
            <div className="flex gap-1.5">
              <button
                type="submit"
                disabled={submittingColumn}
                className="flex items-center gap-1.5 rounded bg-accent px-2 py-1 text-xs font-medium text-accent-foreground shadow-glow transition-transform hover:-translate-y-0.5 hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
              >
                {submittingColumn && <Spinner size={11} />}
                {t("addColumn")}
              </button>
              <button
                type="button"
                onClick={() => setAddingColumn(false)}
                disabled={submittingColumn}
                className="glass-field rounded px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300"
              >
                {tf("cancel")}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingColumn(true)}
            disabled={submittingColumn}
            className="flex h-9 w-[85vw] max-w-56 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-3 text-xs font-medium text-zinc-400 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:text-zinc-600 disabled:cursor-wait disabled:opacity-70 dark:border-zinc-700 dark:hover:text-zinc-300 sm:w-56"
          >
            {submittingColumn ? <Spinner size={13} /> : <Plus size={13} />}
            {t("addColumn")}
          </button>
        )}
      </div>

      {editingTask && (
        <TaskPanel
          task={editingTask}
          boardLabels={board.labels}
          boardMembers={boardMembers}
          onClose={() => setEditingTaskId(null)}
          onUpdate={(patch) => patchTask(editingTask.id, patch)}
          onDelete={() => requestDeleteTask(editingTask)}
          onCreateLabel={(name, color) =>
            createLabel(editingTask.id, editingTask.labels.map((l) => l.id), name, color)
          }
          addingChecklistItem={addingChecklistFor.has(editingTask.id)}
          onAddChecklistItem={(text) => addChecklistItem(editingTask.id, text)}
          onToggleChecklistItem={(itemId, done) => toggleChecklistItem(editingTask.id, itemId, done)}
          onDeleteChecklistItem={(itemId) => deleteChecklistItem(editingTask.id, itemId)}
          onAddAttachments={(files) => addTaskAttachments(editingTask.id, files)}
          onDeleteAttachment={(attachmentId) => deleteTaskAttachment(editingTask.id, attachmentId)}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete
            ? pendingDelete.type === "column"
              ? t("deleteColumnTitle", { name: pendingDelete.column.name })
              : t("deleteTaskTitle", { name: pendingDelete.task.title })
            : ""
        }
        description={
          pendingDelete?.type === "column"
            ? t("deleteColumnDesc", { n: pendingDelete.column.tasks.length })
            : t("deleteTaskDesc")
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
        title={t("deleteBoardTitle", { name: board.name })}
        description={t("deleteBoardDesc", { n: board.columns.length })}
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
  showCreator,
  dragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onClick,
  onDelete,
}: {
  task: TaskT;
  showCreator: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("Boards.board");
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
      className={`glass group rounded-lg p-2.5 text-sm transition-all duration-300 ${
        pending ? "opacity-50" : "cursor-pointer hover:-translate-y-1 hover:border-accent/35 hover:shadow-glow"
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
          aria-label={t("deleteTaskAria")}
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

      {showCreator && task.createdBy && (
        <div className="mt-2 flex items-center gap-1.5">
          <Avatar
            label={task.createdBy.name ?? task.createdBy.email ?? "?"}
            image={task.createdBy.image}
            size="xs"
          />
          <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {task.createdBy.name ?? task.createdBy.email}
          </span>
        </div>
      )}

      {(task.assignee || task.dueDate || task.checklist.length > 0 || task.attachments.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
          {task.assignee && (
            <span className="flex items-center gap-1 truncate">
              <Avatar
                label={task.assignee.name ?? task.assignee.email ?? "?"}
                image={task.assignee.image}
                size="xs"
              />
              {task.assignee.name ?? task.assignee.email}
            </span>
          )}
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
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip size={11} />
              {task.attachments.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
