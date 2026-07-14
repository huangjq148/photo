"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { generateId } from "@/lib/client-id";

export type MessageType = "success" | "error" | "warning" | "info";

export type MessageAction = {
  label: string;
  onSelect: () => void | Promise<void>;
};

export type MessageItem = {
  id: string;
  type: MessageType;
  content: string;
  action?: MessageAction;
  pending?: boolean;
};

export type MessageOptions = {
  type: MessageType;
  content: string;
  action?: MessageAction;
};

type MessageApi = {
  open: (options: MessageOptions) => string;
  success: (content: string, action?: MessageAction) => string;
  error: (content: string, action?: MessageAction) => string;
  warning: (content: string, action?: MessageAction) => string;
  info: (content: string, action?: MessageAction) => string;
  close: (id: string) => void;
};

const MessageContext = createContext<MessageApi | null>(null);

const DEFAULT_MESSAGE_DURATION = 2600;
const ACTION_MESSAGE_DURATION = 6000;
const MERGE_WINDOW = 1000;
const MESSAGE_LIMIT = 3;

type MessageRecord = MessageItem & {
  createdAt: number;
  expiresAt: number;
};

type MessageStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => MessageItem[];
  open: (options: MessageOptions) => string;
  close: (id: string) => void;
  triggerAction: (id: string) => boolean | Promise<boolean>;
  reset: () => void;
};

function createMessageStore(): MessageStore {
  let messages: MessageRecord[] = [];
  const listeners = new Set<() => void>();
  const timers = new Map<string, ReturnType<typeof globalThis.setTimeout>>();

  function emit() {
    listeners.forEach((listener) => listener());
  }

  function clearTimer(id: string) {
    const timer = timers.get(id);
    if (timer !== undefined) {
      globalThis.clearTimeout(timer);
      timers.delete(id);
    }
  }

  function schedule(record: MessageRecord) {
    clearTimer(record.id);
    const delay = Math.max(0, record.expiresAt - Date.now());
    const timer = globalThis.setTimeout(() => {
      close(record.id);
    }, delay);
    timers.set(record.id, timer);
  }

  function publish(nextMessages: MessageRecord[]) {
    messages = nextMessages;
    emit();
  }

  function close(id: string) {
    const exists = messages.some((message) => message.id === id);
    if (!exists) {
      return;
    }

    clearTimer(id);
    publish(messages.filter((message) => message.id !== id));
  }

  function open(options: MessageOptions) {
    const now = Date.now();
    const duration = options.action ? ACTION_MESSAGE_DURATION : DEFAULT_MESSAGE_DURATION;
    const duplicate = messages.find(
      (message) =>
        message.type === options.type &&
        message.content === options.content &&
        !message.pending &&
        now - message.createdAt < MERGE_WINDOW,
    );

    if (duplicate) {
      duplicate.createdAt = now;
      duplicate.expiresAt = now + duration;
      duplicate.action = options.action ?? duplicate.action;
      schedule(duplicate);
      emit();
      return duplicate.id;
    }

    const record: MessageRecord = {
      id: generateId(),
      type: options.type,
      content: options.content,
      action: options.action,
      pending: false,
      createdAt: now,
      expiresAt: now + duration,
    };

    const nextMessages = [...messages, record];
    while (nextMessages.length > MESSAGE_LIMIT) {
      const removed = nextMessages.shift();
      if (removed) {
        clearTimer(removed.id);
      }
    }

    publish(nextMessages);
    schedule(record);
    return record.id;
  }

  function triggerAction(id: string) {
    const current = messages.find((message) => message.id === id);
    if (!current || !current.action || current.pending) {
      return false;
    }

    current.pending = true;
    emit();

    let result: void | Promise<void>;
    try {
      result = current.action.onSelect();
    } catch (error) {
      current.pending = false;
      emit();
      throw error;
    }

    if (result && typeof (result as Promise<void>).then === "function") {
      return Promise.resolve(result)
        .then(() => {
          close(id);
          return true;
        })
        .catch((error) => {
          const latest = messages.find((message) => message.id === id);
          if (latest) {
            latest.pending = false;
            emit();
          }
          throw error;
        });
    }

    close(id);
    return true;
  }

  function getSnapshot() {
    return messages.map(({ createdAt: _createdAt, expiresAt: _expiresAt, ...message }) => ({ ...message }));
  }

  function reset() {
    timers.forEach((timer) => globalThis.clearTimeout(timer));
    timers.clear();
    messages = [];
    emit();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot,
    open,
    close,
    triggerAction,
    reset,
  };
}

const messageStore = createMessageStore();

function MessageIcon({ type }: { type: MessageType }) {
  switch (type) {
    case "success":
      return <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-300" size={18} />;
    case "warning":
      return <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-amber-300" size={18} />;
    case "info":
      return <Info aria-hidden="true" className="mt-0.5 shrink-0 text-sky-300" size={18} />;
    case "error":
      return <XCircle aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--danger)]" size={18} />;
    default:
      return null;
  }
}

export function MessageViewport({
  messages,
  onDismiss = () => undefined,
  onAction = () => undefined,
}: {
  messages: MessageItem[];
  onDismiss?: (id: string) => void;
  onAction?: (id: string) => void | Promise<void>;
}) {
  if (messages.length === 0) return null;

  return (
    <div className="fixed right-5 top-5 z-[100] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2">
      {messages.map((message) => (
        <div
          key={message.id}
          className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-sm text-[var(--text)] shadow-2xl"
          aria-atomic="true"
          aria-live={message.type === "error" ? "assertive" : "polite"}
          role={message.type === "error" ? "alert" : "status"}
        >
          <MessageIcon type={message.type} />
          <div className="min-w-0 flex-1">
            <p className="break-words leading-6">{message.content}</p>
            {message.action ? (
              <button
                type="button"
                onClick={() => void onAction(message.id)}
                disabled={message.pending}
                className="mt-2 inline-flex min-h-10 items-center rounded-full border border-[var(--border-strong)] px-3 text-xs font-semibold text-[var(--text)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {message.pending ? "正在处理" : message.action.label}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="关闭消息"
            onClick={() => onDismiss(message.id)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-transparent text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function MessageProvider({ children }: { children: React.ReactNode }) {
  const messages = useSyncExternalStore(messageStore.subscribe, messageStore.getSnapshot, messageStore.getSnapshot);

  useEffect(() => () => messageStore.reset(), []);

  const open = useCallback((options: MessageOptions) => messageStore.open(options), []);

  const api = useMemo<MessageApi>(
    () => ({
      open,
      success: (content, action) => open({ type: "success", content, action }),
      error: (content, action) => open({ type: "error", content, action }),
      warning: (content, action) => open({ type: "warning", content, action }),
      info: (content, action) => open({ type: "info", content, action }),
      close: (id) => messageStore.close(id),
    }),
    [open],
  );

  return (
    <MessageContext.Provider value={api}>
      {children}
      <MessageViewport
        messages={messages}
        onDismiss={(id) => messageStore.close(id)}
        onAction={(id) => messageStore.triggerAction(id)}
      />
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

export function createMessageControllerForTests() {
  return createMessageStore();
}
