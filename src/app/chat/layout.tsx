import { auth } from "@/lib/auth";
import { ChatMobileShell } from "./ChatMobileShell";
import { ChatUserProvider } from "./ChatUserContext";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <ChatUserProvider userId={session?.user?.id ?? ""}>
      <ChatMobileShell>{children}</ChatMobileShell>
    </ChatUserProvider>
  );
}
