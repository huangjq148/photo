"use client";

import React, { useId } from "react";
import { Modal } from "@/components/ui/modal";

type CreateAlbumModalProps = {
  open: boolean;
  name: string;
  description: string;
  creating: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCreate: () => void;
  onClose: () => void;
};

export function CreateAlbumModal({
  open,
  name,
  description,
  creating,
  onNameChange,
  onDescriptionChange,
  onCreate,
  onClose,
}: CreateAlbumModalProps) {
  const formId = useId();

  return (
    <Modal
      open={open}
      title="创建新相册"
      description="填写相册名称，描述可稍后再补充。"
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] px-5 text-sm font-bold text-[var(--text)] transition hover:bg-white/[0.08]"
          >
            取消
          </button>
          <button
            type="submit"
            form={formId}
            disabled={creating || !name.trim()}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? "创建中..." : "创建"}
          </button>
        </div>
      }
    >
      <form
        id={formId}
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate();
        }}
      >
        <label className="block">
          <span className="text-sm font-medium text-[var(--muted-strong)]">相册名称</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="例如：夏日旅行"
            className="mt-2 h-11 w-full rounded-lg border border-[var(--border)] bg-black px-4 text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--film)]"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[var(--muted-strong)]">相册描述（可选）</span>
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="记录这个相册的主题或成员说明"
            rows={3}
            className="mt-2 w-full resize-none rounded-lg border border-[var(--border)] bg-black px-4 py-3 text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--film)]"
          />
        </label>
      </form>
    </Modal>
  );
}
