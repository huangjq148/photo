"use client";

import { useEffect, useState } from "react";
import { useMessage } from "@/components/ui/message";

type AlbumInviteFormProps = {
  albumId: string;
  onRefresh: () => void;
};

export function AlbumInviteForm({ albumId, onRefresh }: AlbumInviteFormProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const message = useMessage();

  useEffect(() => {
    setError(null);
  }, [albumId]);

  async function sendInvite() {
    if (!email.trim()) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/albums/${albumId}/invites`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "邀请失败");
      setEmail("");
      message.success("邀请已发送，7 天内有效");
      onRefresh();
    } catch (err) {
      const text = err instanceof Error ? err.message : "邀请失败";
      setError(text);
      message.error(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-sm font-medium text-[var(--muted-strong)]">邀请成员</p>
        <div className="flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="输入邮箱地址"
            type="email"
            id="invite-email-input"
            className="h-11 flex-1 rounded-lg border border-[var(--border)] bg-black px-4 text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--film)]"
            onKeyDown={(e) => {
              if (e.key === "Enter") void sendInvite();
            }}
          />
          <button
            onClick={() => void sendInvite()}
            disabled={sending || !email.trim()}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "发送中..." : "发送邀请"}
          </button>
        </div>
        <p className="text-xs text-[var(--muted)]">对方无需已注册，通过邀请链接即可加入相册。</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
