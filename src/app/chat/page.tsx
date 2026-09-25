import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { ChatEmpty } from "./ChatEmpty";

export default async function ChatHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Same ordering as GET /api/channels' `joined` list, so this lands on the
  // channel at the top of the sidebar.
  const first = await prisma.channel.findFirst({
    where: { isDirect: false, members: { some: { userId: user.id } } },
    orderBy: { name: "asc" },
    select: { id: true },
  });
  if (first) redirect(`/chat/${first.id}`);

  return <ChatEmpty />;
}
