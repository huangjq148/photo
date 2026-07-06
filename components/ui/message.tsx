"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export type MessageType = "success" | "error";

export type MessageItem = {
  id: string;
  type: MessageType;
  content: string;
};

type MessageApi = {
  success: (content: string) => void;
  error: (content: string) => void;
};

const MessageContext = createContext<MessageApi | null>(null);

export function MessageViewport({ messages }: { messages: MessageItem[] }) {
  if (messages.length === 0) return null;

  return (
    <div className="fixed right-5 top-5 z-[100] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2">
      {messages.map((message) => (
        <div
          key={message.id}
          className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-sm text-[var(--text)] shadow-2xl"
          role="status"
        >
          {message.type === "success" ? (
            <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-300" size={18} />
          ) : (
            <XCircle aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--danger)]" size={18} />
          )}
          <span>{message.content}</span>
        </div>
      ))}
    </div>
  );
}

export function MessageProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<MessageItem[]>([]);

  const open = useCallback((type: MessageType, content: string) => {
    const id = crypto.randomUUID();
    setMessages((current) => [...current, { id, type, content }]);
    window.setTimeout(() => {
      setMessages((current) => current.filter((message) => message.id !== id));
    }, 2600);
  }, []);

  const api = useMemo<MessageApi>(
    () => ({
      success: (content) => open("success", content),
      error: (content) => open("error", content),
    }),
    [open],
  );

  return (
    <MessageContext.Provider value={api}>
      {children}
      <MessageViewport messages={messages} />
    </MessageContext.Provider>
  );
}

export function useMessage() {
  const api = useContext(MessageContext);
  if (!api) {
    throw new Error("useMessage must be used inside MessageProvider");
  }
  return api;
}
