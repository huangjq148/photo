"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { DateTimePicker } from "@/components/ui/date-time-picker";

type TakenAtEditorModalProps = {
  open: boolean;
  photoName: string;
  currentTakenAt: string | null;
  uploadedAt: string;
  onClose: () => void;
  onSave: (takenAt: string | null) => Promise<void> | void;
};

function toDateTimeLocalValue(isoString: string | null) {
  if (!isoString) return "";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromDateTimeLocalValue(value: string) {
  if (!value.trim()) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function TakenAtEditorModal({
  open,
  photoName,
  currentTakenAt,
  uploadedAt,
  onClose,
  onSave,
}: TakenAtEditorModalProps) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(toDateTimeLocalValue(currentTakenAt));
    setSaving(false);
    setError(null);
  }, [currentTakenAt, open]);

  const uploadedAtLabel = useMemo(() => {
    const date = new Date(uploadedAt);
    if (Number.isNaN(date.getTime())) return uploadedAt;
    return date.toLocaleString("zh-CN", { hour12: false });
  }, [uploadedAt]);

  async function handleSave() {
    if (saving) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(fromDateTimeLocalValue(draft));
    } catch (err) {
      setError(err instanceof Error ? err.message : "拍摄时间保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title="修改拍摄时间"
      description={photoName}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setDraft("")}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
          >
            清空
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--muted)]">
          留空会清除拍摄时间。上传时间不会被修改。
        </p>

        {error ? (
          <div className="rounded-xl border border-red-400/20 bg-red-950/20 px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--text)]">拍摄时间</span>
          <DateTimePicker
            value={draft}
            onChange={setDraft}
            className="h-12 w-full"
            placeholder="请选择日期和时间"
          />
        </label>

        <div className="rounded-2xl border border-[var(--border)] bg-black/10 p-4 text-sm text-[var(--muted)]">
          <p>当前文件：{photoName}</p>
          <p className="mt-2">上传时间：{uploadedAtLabel}</p>
        </div>
      </div>
    </Modal>
  );
}
