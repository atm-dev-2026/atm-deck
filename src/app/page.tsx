"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Board = {
  id: string;
  name: string;
  createdAt: string;
};

export default function Home() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const loadBoards = async () => {
    const res = await fetch("/api/boards");
    setBoards(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch("/api/boards");
      const data = await res.json();
      if (!ignore) {
        setBoards(data);
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    loadBoards();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          ATM Deck
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Boards for tracking work.
        </p>

        <form onSubmit={createBoard} className="mt-8 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New board name"
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Create board
          </button>
        </form>

        <div className="mt-10 grid gap-3">
          {loading && (
            <p className="text-sm text-zinc-500">Loading boards…</p>
          )}
          {!loading && boards.length === 0 && (
            <p className="text-sm text-zinc-500">
              No boards yet — create one above.
            </p>
          )}
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/board/${board.id}`}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-950 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-700"
            >
              {board.name}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
