"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type UploadStatus = "pending" | "uploading" | "success" | "failed" | "cancelled";

type UploadItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  status: UploadStatus;
  message?: string;
};

type PhotoUploadFormProps = {
  albumId: string;
  onUploaded?: () => void;
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function PhotoUploadForm({ albumId, onUploaded }: PhotoUploadFormProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const running = useRef(false);

  const pendingCount = useMemo(() => items.filter((item) => item.status === "pending").length, [items]);

  useEffect(() => {
    return () => {
      controllers.current.forEach((controller) => controller.abort());
      controllers.current.clear();
    };
  }, []);

  function enqueueFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const nextItems = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      status: "pending" as const
    }));

    setItems((current) => [...current, ...nextItems]);
    setMessage(null);
  }

  async function runQueue() {
    if (running.current) {
      return;
    }

    running.current = true;
    setBusy(true);
    setMessage(null);

    try {
      for (const item of items) {
        if (item.status !== "pending") {
          continue;
        }

        const controller = new AbortController();
        controllers.current.set(item.id, controller);

        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, status: "uploading", message: undefined }
              : entry
          )
        );

        try {
          const payload = new FormData();
          payload.append("file", item.file);

          const response = await fetch(`/api/albums/${albumId}/photos/upload`, {
            method: "POST",
            body: payload,
            signal: controller.signal
          });

          const json = await response.json();
          if (!response.ok) {
            throw new Error(json.error ?? "上传失败");
          }

          setItems((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? { ...entry, status: "success", message: "上传成功" }
                : entry
            )
          );
          setMessage(`已上传 ${item.name}`);
          onUploaded?.();
        } catch (error) {
          const cancelled = error instanceof DOMException && error.name === "AbortError";
          setItems((current) =>
            current.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: cancelled ? "cancelled" : "failed",
                    message: cancelled ? "已取消" : error instanceof Error ? error.message : "上传失败"
                  }
                : entry
            )
          );
        } finally {
          controllers.current.delete(item.id);
        }
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runQueue();
  }

  function cancelUpload(id: string) {
    controllers.current.get(id)?.abort();
  }

  function retryUpload(id: string) {
    setItems((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, status: "pending", message: undefined } : entry
      )
    );
    queueMicrotask(() => {
      void runQueue();
    });
  }

  function removeItem(id: string) {
    controllers.current.get(id)?.abort();
    setItems((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <div className="space-y-2">
        <label htmlFor="photo-file" className="text-sm font-medium text-[var(--muted-strong)]">
          选择图片
        </label>
        <input
          id="photo-file"
          name="file"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(event: ChangeEvent<HTMLInputElement>) => enqueueFiles(event.target.files)}
          className="block w-full rounded-lg border border-[var(--border)] bg-black px-4 py-3 text-sm text-[var(--muted-strong)] file:mr-4 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-bold file:text-black"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy || pendingCount === 0}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "上传中..." : `上传 ${pendingCount || ""}`.trim()}
        </button>
        <p className="text-sm text-[var(--muted)]">多选 / 取消 / 重试</p>
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-black p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text)]">{item.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {formatBytes(item.size)} · {item.status}
                  {item.message ? ` · ${item.message}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.status === "uploading" ? (
                  <button
                    type="button"
                    onClick={() => cancelUpload(item.id)}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
                  >
                    取消
                  </button>
                ) : null}
                {item.status === "failed" || item.status === "cancelled" ? (
                  <button
                    type="button"
                    onClick={() => retryUpload(item.id)}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
                  >
                    重试
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--danger)] px-4 text-sm font-bold text-black"
                >
                  移除
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {message ? (
        <p className="text-sm text-[var(--muted-strong)]" aria-live="polite">
          {message}
        </p>
      ) : null}
    </form>
  );
}
