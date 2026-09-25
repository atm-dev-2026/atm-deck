import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getBoardsForUser } from "@/lib/boards";
import HomeClient from "./HomeClient";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const boards = await getBoardsForUser(user);

  return <HomeClient initialBoards={JSON.parse(JSON.stringify(boards))} />;
}
