import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getMyTasks } from "@/lib/tasks";
import MyTasksClient from "./MyTasksClient";

export default async function MyTasksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tasks = await getMyTasks(user);

  return <MyTasksClient tasks={JSON.parse(JSON.stringify(tasks))} />;
}
