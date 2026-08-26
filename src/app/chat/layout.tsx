import { auth } from "@/lib/auth";
import { ChatSidebar } from "./ChatSidebar";
import { ChatUserProvider } from "./ChatUserContext";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <ChatUserProvider userId={session?.user?.id ?? ""}>
      <div className="flex flex-1 min-h-0">
        <ChatSidebar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </ChatUserProvider>
  );
}
