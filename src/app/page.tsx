"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Plus, Search, SquareKanban, Trash2 } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { VisibilityBadge, type BoardVisibility } from "@/components/VisibilityBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type BoardAccess = { canEdit: boolean; canDelete: boolean; canManageMembers: boolean };

type Board = {
  id: string;
  name: string;
  createdAt: string;
  columnCount: number;
  taskCount: number;
  visibilityType: BoardVisibility;
  access: BoardAccess;
};

type Department = { id: string; name: string };

export default function Home() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<BoardVisibility>("PERSONAL");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadBoards = async () => {
    const res = await fetch("/api/boards");
    const data = await res.json();
    setBoards(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch("/api/boards");
      const data = await res.json();
      if (!ignore) {
        setBoards(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const openCreate = () => {
    setCreating((v) => !v);
    setCreateError(null);
    if (departments.length === 0) {
      fetch("/api/departments")
        .then((res) => res.json())
        .then((data) => setDepartments(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  };

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    if (visibility === "DEPARTMENT" && !departmentId) {
      setCreateError("Pick a department for a department board.");
      return;
    }
    setSubmitting(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          visibilityType: visibility,
          departmentId: visibility === "DEPARTMENT" ? departmentId : undefined,
        }),
      });
      if (res.ok) {
        setName("");
        setVisibility("PERSONAL");
        setDepartmentId("");
        setCreating(false);
        await loadBoards();
      } else {
        const data = await res.json().catch(() => null);
        setCreateError(data?.error ?? "Couldn't create the board.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const requestDeleteBoard = (e: React.MouseEvent, board: Board) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteError(null);
    setDeleteTarget(board);
  };

  const confirmDeleteBoard = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleting(true);
    setDeleteError(null);
    const previous = boards;
    setBoards((prev) => prev.filter((b) => b.id !== target.id));
    try {
      const res = await fetch(`/api/boards/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setBoards(previous);
        setDeleteError(data?.error ?? "Couldn't delete the board.");
        return;
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(
    () => boards.filter((b) => b.name.toLowerCase().includes(query.toLowerCase())),
    [boards, query],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-5">
        <div className="flex items-center gap-2">
          <LayoutGrid size={16} className="text-zinc-400" />
          <h1 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Boards</h1>
          <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {boards.length}
          </span>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
        >
          <Plus size={13} strokeWidth={2.5} />
          New board
        </button>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {creating && (
          <form
            onSubmit={createBoard}
            className="mb-5 flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Board name"
                className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as BoardVisibility)}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="PERSONAL">Personal</option>
                <option value="DEPARTMENT">Department</option>
                <option value="GLOBAL">Global</option>
              </select>
            </div>

            {visibility === "DEPARTMENT" && (
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              >
                <option value="">Select a department…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            {createError && <p className="text-xs text-red-500">{createError}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
              >
                {submitting && <Spinner size={13} />}
                Create
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                disabled={submitting}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="relative mb-4">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter boards…"
            className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        {loading && <p className="px-1 text-sm text-zinc-500">Loading boards…</p>}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
            <SquareKanban size={22} className="text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm text-zinc-500">
              {boards.length === 0 ? "No boards yet — create one to get started." : "No boards match your filter."}
            </p>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((board) => (
            <Link
              key={board.id}
              href={`/board/${board.id}`}
              className="group flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent dark:bg-accent/20">
                  <SquareKanban size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">{board.name}</p>
                    <VisibilityBadge visibilityType={board.visibilityType} />
                  </div>
                  <p className="text-xs text-zinc-500">
                    {board.columnCount} {board.columnCount === 1 ? "column" : "columns"} · {board.taskCount}{" "}
                    {board.taskCount === 1 ? "task" : "tasks"}
                  </p>
                </div>
              </div>
              {board.access.canDelete && (
                <button
                  onClick={(e) => requestDeleteBoard(e, board)}
                  className="rounded p-1.5 text-zinc-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-500/10"
                  aria-label="Delete board"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </Link>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget ? `Delete "${deleteTarget.name}"?` : ""}
        description={
          deleteTarget
            ? `This permanently removes ${deleteTarget.columnCount} ${
                deleteTarget.columnCount === 1 ? "column" : "columns"
              } and ${deleteTarget.taskCount} ${
                deleteTarget.taskCount === 1 ? "task" : "tasks"
              }. This can't be undone.`
            : undefined
        }
        pending={deleting}
        error={deleteError}
        onConfirm={confirmDeleteBoard}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
