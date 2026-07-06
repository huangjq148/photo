"use client";

import { useEffect, useState } from "react";
import { useMessage } from "@/components/ui/message";

type MemberItem = {
  userId: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
};

type AlbumMembersProps = {
  albumId: string;
  currentRole: string;
  onRefresh: () => void;
};

export function AlbumMembers({ albumId, currentRole, onRefresh }: AlbumMembersProps) {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const message = useMessage();

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
          <div>
            <p className="text-sm font-medium text-[var(--text)]">{member.nickname}</p>
            <p className="text-xs text-[var(--muted)]">{member.email}</p>
            <span className="mt-1 inline-block rounded-md border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">
              {member.role === "owner" ? "拥有者" : "成员"}
            </span>
          </div>
          {currentRole === "owner" && member.role !== "owner" ? (
            <button
              onClick={() => removeMember(member.userId)}
              disabled={removing === member.userId}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--danger)] px-4 text-sm font-bold text-black transition hover:opacity-80 disabled:opacity-50"
            >
              {removing === member.userId ? "移除中..." : "移除"}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
