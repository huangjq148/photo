"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useMessage } from "@/components/ui/message";

type MemberItem = {
  userId: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  role: string;
  canUpload: boolean;
  canDelete: boolean;
  joinedAt: string;
};

type AlbumMembersProps = {
  albumId: string;
  currentUserId: string;
  currentRole: string;
  onRefresh: () => void;
};

export function AlbumMembers({ albumId, currentUserId, currentRole, onRefresh }: AlbumMembersProps) {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const message = useMessage();
  const isOwner = currentRole === "owner";

  async function load() {
    try {
      const response = await fetch(`/api/albums/${albumId}/members`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Failed to load members");
      setMembers(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [albumId]);

  async function updatePermission(userId: string, field: "canUpload" | "canDelete", value: boolean) {
    try {
      const response = await fetch(`/api/albums/${albumId}/members`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, [field]: value }),
      });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "修改权限失败");
      }
      setMembers((current) =>
        current.map((m) => (m.userId === userId ? { ...m, [field]: value } : m))
      );
    } catch (err) {
      message.error(err instanceof Error ? err.message : "修改权限失败");
    }
  }

  async function removeMember(userId: string) {
    if (!confirm("确定要移除该成员吗？")) return;
    setRemoving(userId);
    try {
      const response = await fetch(`/api/albums/${albumId}/members`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "Failed to remove member");
      }
      message.success("成员已移除");
      onRefresh();
      await load();
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to remove member";
      setError(text);
      message.error(text);
    } finally {
      setRemoving(null);
    }
  }

  async function handleLeave() {
    if (!confirm("确定要退出此相册吗？")) return;
    setLeaving(true);
    try {
      const response = await fetch(`/api/albums/${albumId}/members/leave`, {
        method: "POST",
      });
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? "退出失败");
      }
      message.success("已退出相册");
      onRefresh();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "退出失败");
    } finally {
      setLeaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">
        加载成员...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-950/30 p-6 text-[var(--danger)]">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-[var(--film)]">
        MEMBERS / {members.length}
      </p>
      {members.map((member) => (
        <div
          key={member.userId}
          className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--text)]">{member.nickname}</p>
            <p className="text-xs text-[var(--muted)]">{member.email}</p>
            <span className="mt-1 inline-block rounded-md border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">
              {member.role === "owner" ? "拥有者" : "成员"}
            </span>
          </div>

          {isOwner && member.role !== "owner" ? (
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={member.canUpload}
                  onChange={(e) => updatePermission(member.userId, "canUpload", e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] bg-black accent-[var(--accent)]"
                />
                上传
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--muted)]">
                <input
                  type="checkbox"
                  checked={member.canDelete}
                  onChange={(e) => updatePermission(member.userId, "canDelete", e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] bg-black accent-[var(--accent)]"
                />
                删除
              </label>
              <button
                onClick={() => removeMember(member.userId)}
                disabled={removing === member.userId}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--danger)] px-4 text-sm font-bold text-black transition hover:opacity-80 disabled:opacity-50"
              >
                {removing === member.userId ? "移除中..." : "移除"}
              </button>
            </div>
          ) : null}

          {!isOwner && member.userId === currentUserId ? (
            <button
              onClick={() => { void handleLeave(); }}
              disabled={leaving}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--muted)] transition hover:border-red-400/50 hover:text-[var(--danger)] disabled:opacity-50"
            >
              <LogOut aria-hidden="true" size={15} />
              {leaving ? "退出中..." : "退出相册"}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
