"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  dueDate: string | null;
  order: number;
  columnId: string;
};

type Column = {
  id: string;
  name: string;
  order: number;
  tasks: Task[];
};

type Board = {
  id: string;
  name: string;
  columns: Column[];
};

export default function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = use(params);
  const [board, setBoard] = useState<Board | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({});
  const [newColumnName, setNewColumnName] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const loadBoard = async () => {
    const res = await fetch(`/api/boards/${boardId}`);
    if (res.ok) setBoard(await res.json());
  };

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

  const addTask = async (columnId: string) => {
    const title = newTaskTitle[columnId]?.trim();
    if (!title) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId, title }),
    });
    setNewTaskTitle((prev) => ({ ...prev, [columnId]: "" }));
    loadBoard();
  };

  const addColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    await fetch("/api/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId, name: newColumnName }),
    });
    setNewColumnName("");
    loadBoard();
  };

  const moveTask = async (task: Task, direction: -1 | 1) => {
    if (!board) return;
    const columns = [...board.columns].sort((a, b) => a.order - b.order);
    const currentIndex = columns.findIndex((c) => c.id === task.columnId);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId: columns[targetIndex].id }),
    });
    loadBoard();
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    loadBoard();
  };

  const deleteColumn = async (columnId: string) => {
    if (!confirm("Delete this column? This removes all its tasks.")) return;
    await fetch(`/api/columns/${columnId}`, { method: "DELETE" });
    loadBoard();
  };

  const saveTask = async (
    taskId: string,
    updates: {
      title: string;
      description: string;
      assignee: string;
      dueDate: string;
    },
  ) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: updates.title,
        description: updates.description || null,
        assignee: updates.assignee || null,
        dueDate: updates.dueDate || null,
      }),
    });
    setEditingTask(null);
    loadBoard();
  };

  if (!board) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 dark:bg-black">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  const columns = [...board.columns].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Boards
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {board.name}
        </h1>

        <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex w-72 shrink-0 flex-col rounded-lg bg-zinc-100 p-3 dark:bg-zinc-900"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {column.name}
                </h2>
                <button
                  onClick={() => deleteColumn(column.id)}
                  className="text-xs text-zinc-400 hover:text-red-500"
                  aria-label="Delete column"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {column.tasks
                  .sort((a, b) => a.order - b.order)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="rounded-md border border-zinc-200 bg-white p-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => setEditingTask(task)}
                          className="text-left text-zinc-950 hover:underline dark:text-zinc-50"
                        >
                          {task.title}
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-xs text-zinc-400 hover:text-red-500"
                          aria-label="Delete task"
                        >
                          ✕
                        </button>
                      </div>
                      {(task.assignee || task.dueDate) && (
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {task.assignee && <span>👤 {task.assignee}</span>}
                          {task.dueDate && (
                            <span>
                              📅{" "}
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => moveTask(task, -1)}
                          className="rounded border border-zinc-200 px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => moveTask(task, 1)}
                          className="rounded border border-zinc-200 px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addTask(column.id);
                }}
                className="mt-3 flex gap-1"
              >
                <input
                  value={newTaskTitle[column.id] ?? ""}
                  onChange={(e) =>
                    setNewTaskTitle((prev) => ({
                      ...prev,
                      [column.id]: e.target.value,
                    }))
                  }
                  placeholder="Add a task"
                  className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <button
                  type="submit"
                  className="rounded bg-zinc-950 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  Add
                </button>
              </form>
            </div>
          ))}

          <form
            onSubmit={addColumn}
            className="flex w-72 shrink-0 flex-col gap-2 rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-700"
          >
            <input
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="New column name"
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <button
              type="submit"
              className="rounded bg-zinc-950 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Add column
            </button>
          </form>
        </div>
      </main>

      {editingTask && (
        <TaskEditor
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={saveTask}
        />
      )}
    </div>
  );
}

function TaskEditor({
  task,
  onClose,
  onSave,
}: {
  task: Task;
  onClose: () => void;
  onSave: (
    taskId: string,
    updates: {
      title: string;
      description: string;
      assignee: string;
      dueDate: string;
    },
  ) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [assignee, setAssignee] = useState(task.assignee ?? "");
  const [dueDate, setDueDate] = useState(
    task.dueDate ? task.dueDate.slice(0, 10) : "",
  );

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave(task.id, { title, description, assignee, dueDate });
        }}
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg dark:bg-zinc-900"
      >
        <label className="text-xs font-medium text-zinc-500">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />

        <label className="mt-3 block text-xs font-medium text-zinc-500">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />

        <div className="mt-3 flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-zinc-500">
              Assignee
            </label>
            <input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-zinc-500">
              Due date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-zinc-950 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
