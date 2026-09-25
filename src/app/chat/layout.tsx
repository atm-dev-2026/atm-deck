import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { ChatMobileShell } from "./ChatMobileShell";
import { ChatUserProvider } from "./ChatUserContext";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <ChatUserProvider userId={user.id}>
      <ChatMobileShell>{children}</ChatMobileShell>
    </ChatUserProvider>
  );
}
