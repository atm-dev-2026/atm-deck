import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getBoardDetail } from "@/lib/boards";
import BoardClient from "./BoardClient";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const result = await getBoardDetail(boardId, user);
  if (!result.ok) notFound();

  const initialBoard = JSON.parse(JSON.stringify({ ...result.board, access: result.access }));

  // Keyed by boardId so navigating between boards remounts this client component
  // (and re-seeds its state) instead of reusing the previous board's state.
  return <BoardClient key={boardId} boardId={boardId} initialBoard={initialBoard} />;
}
