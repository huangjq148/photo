"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, RotateCcw, X } from "lucide-react";
import { useMessage } from "@/components/ui/message";

type InviteItem = {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  createdAt: string;
  expiredAt: string;
};

type AlbumInviteListProps = {
  albumId: string;
  refreshToken: number;
  onRefresh: () => void;
};

export function AlbumInviteList({ albumId, refreshToken, onRefresh }: AlbumInviteListProps) {
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const message = useMessage();

  const loadInvites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/albums/${albumId}/invites`);
      if (res.ok) {
        const json = await res.json();
        setInvites(json.data ?? []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites, refreshToken]);

  async function copyLink(invite: InviteItem) {
    const url = `${window.location.origin}/invitations/${invite.token}`;
    try {
      await navigator.clipboard.writeText(url);
      message.success("邀请链接已复制");
    } catch {
      message.error("复制失败");
    }
  }

  async function handleRevoke(inviteId: string) {
    try {
      const res = await fetch(`/api/albums/${albumId}/invites/${inviteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "撤销失败");
      }
      message.success("邀请已撤销");
      onRefresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "撤销失败");
    }
  }

  async function handleResend(inviteId: string) {
    try {
      const res = await fetch(
        `/api/albums/${albumId}/invites/${inviteId}/resend`,
        { method: "POST" }
      );
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "重发失败");
      }
      message.success("已重新发送邀请");
      onRefresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "重发失败");
    }
  }

  function formatExpiry(expiredAt: string, status: string): string {
    if (status !== "pending") return "";
    const d = new Date(expiredAt);
    const now = Date.now();
    if (d.getTime() <= now) return "已过期";
    const hours = Math.round((d.getTime() - now) / (1000 * 60 * 60));
    if (hours < 24) return `${hours} 小时后过期`;
    const days = Math.ceil(hours / 24);
    return `${days} 天后过期`;
  }

  const pendingInvites = invites.filter((i) => i.status === "pending");

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">加载邀请列表...</p>;
  }

  if (pendingInvites.length === 0) {
    return <p className="text-sm text-[var(--muted)]">暂无待处理的邀请</p>;
  }

  return (
    <ul className="space-y-2">
      {pendingInvites.map((invite) => (
        <li
          key={invite.id}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
        >
          <span className="min-w-0 flex-1 truncate text-sm text-[var(--text)]">
            {invite.email}
          </span>
          <span className="text-xs text-[var(--muted)]">
            {formatExpiry(invite.expiredAt, invite.status)}
          </span>
          <button
            type="button"
            onClick={() => copyLink(invite)}
            className="rounded p-1 text-[var(--muted)] transition hover:text-[var(--text)]"
            aria-label="复制邀请链接"
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleResend(invite.id)}
            className="rounded p-1 text-[var(--muted)] transition hover:text-[var(--text)]"
            aria-label="重新发送邀请"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleRevoke(invite.id)}
            className="rounded p-1 text-[var(--muted)] transition hover:text-red-400"
            aria-label="撤销邀请"
          >
            <X size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}
