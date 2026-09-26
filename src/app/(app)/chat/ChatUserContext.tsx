"use client";

import { createContext, useContext } from "react";

const ChatUserContext = createContext<string>("");

export function ChatUserProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  return <ChatUserContext.Provider value={userId}>{children}</ChatUserContext.Provider>;
}

export function useChatUserId() {
  return useContext(ChatUserContext);
}
