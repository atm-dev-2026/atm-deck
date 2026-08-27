"use client";

import { createContext, useContext } from "react";

const ChatSidebarContext = createContext<{ toggleSidebar: () => void }>({
  toggleSidebar: () => {},
});

export const ChatSidebarContextProvider = ChatSidebarContext.Provider;

export function useChatSidebar() {
  return useContext(ChatSidebarContext);
}
