"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Link, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";

type ShareRecord = {
  id: string;
  token: string;
  url: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  allowDownload: boolean;
};

type AlbumShareManagerProps = {
  albumId: string;
  open: boolean;
  onClose: () => void;
};

const EXPIRY_OPTIONS = [
  { label: "永久", value: null as number | null },
  { label: "24 小时", value: 24 },
  { label: "7 天", value: 168 },
];

export function AlbumShareManager({ albumId, open, onClose }: AlbumShareManagerProps) {
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<number | null>(168);
  const [allowDownload, setAllowDownload] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadShares = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/albums/${albumId}/shares`);
      if (res.ok) {
        const json = await res.json();
        setShares(json.data ?? []);
      }
    } catch {
      // Ignore load errors for now.
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    if (open) {
      void loadShares();
    }
  }, [open, loadShares]);

  async function handleCreate() {
    setCreating(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/albums/${albumId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInHours, allowDownload }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "创建分享失败");
      }

      setFeedback("分享链接已创建");
      await loadShares();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "创建分享失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy(share: ShareRecord) {
    try {
      await navigator.clipboard.writeText(new URL(share.url, window.location.origin).toString());
      setFeedback("链接已复制到剪贴板");
    } catch {
      setFeedback("复制失败，请手动复制");
    }
  }

  async function handleRevoke(shareId: string) {
    setFeedback(null);
    try {
      const res = await fetch(`/api/albums/shares/${shareId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "撤销失败");
      }
      setFeedback("分享已撤销");
      await loadShares();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "撤销失败");
    }
  }

  function formatExpiry(expiresAt: string | null): string {
    if (!expiresAt) return "永久有效";
    const d = new Date(expiresAt);
    if (Number.isNaN(d.getTime())) return "有效期未知";
    const now = Date.now();
    if (d.getTime() <= now) return "已过期";
    const hours = Math.round((d.getTime() - now) / (1000 * 60 * 60));
    if (hours < 24) return `${hours} 小时后过期`;
    const days = Math.ceil(hours / 24);
    return `${days} 天后过期 (${d.toLocaleDateString("zh-CN")})`;
  }

  const activeShares = shares.filter((share) => !share.revokedAt);

  return (
    <Modal open={open} title="相册分享" size="lg" onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">创建新分享</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {EXPIRY_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setExpiresInHours(opt.value)}
                disabled={creating}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  expiresInHours === opt.value
                    ? "bg-[var(--accent)] text-black"
                    : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)]">
              <input
                type="checkbox"
                checked={allowDownload}
                onChange={(event) => setAllowDownload(event.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              允许下载
            </label>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} />
              {creating ? "创建中..." : "创建链接"}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">已有分享 ({activeShares.length})</h3>
          {loading ? (
            <p className="mt-2 text-sm text-[var(--muted)]">加载中...</p>
          ) : activeShares.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">暂无分享链接</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {activeShares.map((share) => (
                <li
                  key={share.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
                >
                  <Link size={14} className="shrink-0 text-[var(--muted)]" />
                  <span className="min-w-0 flex-1 truncate text-xs text-[var(--muted)]">
                    {new URL(share.url, window.location.origin).toString()}
                  </span>
                  <span className="text-[10px] text-[var(--muted)]">
                    {share.allowDownload ? "可下载" : "禁止下载"} · {formatExpiry(share.expiresAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(share)}
                    className="rounded p-1 text-[var(--muted)] transition hover:text-[var(--text)]"
                    aria-label="复制链接"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRevoke(share.id)}
                    className="rounded p-1 text-[var(--muted)] transition hover:text-red-400"
                    aria-label="撤销分享"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {feedback ? (
          <p className="text-sm text-[var(--film)]" role="alert" aria-live="polite">
            {feedback}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
