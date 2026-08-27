"use client";

import { useState } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatSidebarContextProvider } from "./ChatSidebarContext";

export function ChatMobileShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <ChatSidebarContextProvider value={{ toggleSidebar: () => setOpen((v) => !v) }}>
      <div className="flex flex-1 min-h-0 relative">
        {open && (
          <div className="fixed inset-0 z-20 bg-black/30 md:hidden" onClick={close} />
        )}

        <div
          className={`fixed inset-y-0 left-0 z-30 w-72 max-w-[85vw] transform transition-transform duration-200 ease-out md:static md:z-auto md:w-60 md:max-w-none md:translate-x-0 md:transition-none ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <ChatSidebar onNavigate={close} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </ChatSidebarContextProvider>
  );
}
