"use client";

import React from "react";
import type { ChangeEvent, DragEvent, ClipboardEvent } from "react";
import { useId, useRef, useState } from "react";
import { Upload } from "lucide-react";

export type UploadFileRejection = {
  file: File;
  reason: string;
};

export type UploadFileValidationResult = {
  files: File[];
  rejected: UploadFileRejection[];
};

export type UploadClipboardLike = {
  clipboardData?: {
    files?: ArrayLike<File> | null;
    items?: ArrayLike<{
      kind: string;
      getAsFile: () => File | null;
    }> | null;
  } | null;
};

type UploadDropzoneProps = {
  disabled?: boolean;
  errorMessage?: string | null;
  filesHint?: string;
  onFiles: (files: File[]) => void;
  onRejectedFiles?: (rejections: UploadFileRejection[]) => void;
};

const SUPPORTED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]);
const SUPPORTED_VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);
const SUPPORTED_INPUT_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

function getFileExtension(file: File) {
  const lowerName = file.name.toLowerCase();
  const dotIndex = lowerName.lastIndexOf(".");
  return dotIndex >= 0 ? lowerName.slice(dotIndex + 1) : "";
}

function isSupportedUploadFile(file: File) {
  if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
    return true;
  }

  const extension = getFileExtension(file);
  return SUPPORTED_IMAGE_EXTENSIONS.has(extension) || SUPPORTED_VIDEO_EXTENSIONS.has(extension);
}

function createUnsupportedReason(file: File) {
  const extension = getFileExtension(file);
  if (!file.type && !extension) {
    return `${file.name} 没有可识别的文件类型`;
  }

  return `${file.name} 不是支持的图片或视频文件`;
}

function dedupeFiles(files: readonly File[]) {
  const seen = new Set<string>();
  const deduped: File[] = [];

  for (const file of files) {
    const key = [file.name, file.size, file.lastModified, file.type].join("|");
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(file);
  }

  return deduped;
}

export function filterUploadFiles(files: readonly File[]): UploadFileValidationResult {
  const accepted: File[] = [];
  const rejected: UploadFileRejection[] = [];

  for (const file of dedupeFiles(files)) {
    if (isSupportedUploadFile(file)) {
      accepted.push(file);
    } else {
      rejected.push({
        file,
        reason: createUnsupportedReason(file),
      });
    }
  }

  return { files: accepted, rejected };
}

export function extractUploadFilesFromClipboardData(source: UploadClipboardLike) {
  const files: File[] = [];
  const clipboardData = source.clipboardData;
  if (!clipboardData) {
    return files;
  }

  if (clipboardData.files) {
    files.push(...Array.from(clipboardData.files));
  }

  if (clipboardData.items) {
    for (const item of Array.from(clipboardData.items)) {
      if (item.kind !== "file") {
        continue;
      }

      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
  }

  return dedupeFiles(files);
}

function formatAcceptedText(count: number) {
  if (count === 0) {
    return "点击选择文件";
  }

  return `已选择 ${count} 个文件`;
}

export function UploadDropzone({
  disabled = false,
  errorMessage = null,
  filesHint = "支持 JPG、PNG、WebP、GIF、MP4、WebM 和 MOV",
  onFiles,
  onRejectedFiles,
}: UploadDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [internalRejections, setInternalRejections] = useState<UploadFileRejection[]>([]);

  function handleFiles(files: readonly File[]) {
    if (disabled) {
      return;
    }

    const result = filterUploadFiles(files);
    if (result.files.length > 0) {
      onFiles(result.files);
      setSelectedCount((current) => current + result.files.length);
    }

    if (result.rejected.length > 0) {
      setInternalRejections(result.rejected);
      onRejectedFiles?.(result.rejected);
    } else {
      setInternalRejections([]);
      onRejectedFiles?.([]);
    }
  }

  function openPicker() {
    if (disabled) {
      return;
    }

    inputRef.current?.click();
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    handleFiles(Array.from(event.dataTransfer.files ?? []));
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    if (disabled) {
      return;
    }

    const pastedFiles = extractUploadFilesFromClipboardData(event);
    if (pastedFiles.length > 0) {
      event.preventDefault();
      handleFiles(pastedFiles);
    }
  }

  const rejectionList = internalRejections;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="上传文件区域"
      onClick={openPicker}
      onKeyDown={(event) => {
        if (disabled) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      }}
      onDragEnter={(event) => {
        if (!disabled) {
          event.preventDefault();
          setDragActive(true);
        }
      }}
      onDragOver={(event) => {
        if (!disabled) {
          event.preventDefault();
          setDragActive(true);
        }
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          setDragActive(false);
        }
      }}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className={`group relative cursor-pointer rounded-2xl border border-dashed px-5 py-6 transition ${
        disabled
          ? "cursor-not-allowed border-[var(--border)] bg-black/30 opacity-60"
          : dragActive
            ? "border-[var(--accent)] bg-[var(--accent)]/10"
            : "border-[var(--border)] bg-black/40 hover:border-white/30 hover:bg-black/50"
      }`}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        accept={SUPPORTED_INPUT_ACCEPT}
        disabled={disabled}
        onChange={handleInputChange}
        className="sr-only"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--accent)]">
            <Upload aria-hidden="true" size={20} />
          </div>
          <div>
            <p className="text-base font-semibold text-[var(--text)]">拖入照片或视频，或点击选择图片/视频</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {filesHint}，也可以在此窗口聚焦后直接粘贴截图。
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted-strong)]">
            {formatAcceptedText(selectedCount)}
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              openPicker();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            选择文件
          </button>
        </div>
      </div>

      {(errorMessage || rejectionList.length > 0) && (
        <div className="mt-4 space-y-3">
          {errorMessage ? (
            <p className="rounded-xl border border-[var(--danger)]/60 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
              {errorMessage}
            </p>
          ) : null}

          {rejectionList.length > 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-black/50 px-4 py-3">
              <p className="text-sm font-medium text-[var(--text)]">以下文件未加入队列</p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                {rejectionList.map((rejection) => (
                  <li key={`${rejection.file.name}-${rejection.file.size}-${rejection.file.lastModified}`}>
                    {rejection.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
