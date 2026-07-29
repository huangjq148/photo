"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HardDrive } from "lucide-react";
import type { AdminUserListItem } from "@/lib/admin/users";

function formatBytes(value: string) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(value));
}

function buildQuery(params: URLSearchParams, patch: Record<string, string | number | undefined>) {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === "") next.delete(key);
    else next.set(key, String(value));
  }
  return next.toString();
}

function initials(user: AdminUserListItem) {
  return (user.nickname.trim() || user.email).slice(0, 1).toUpperCase();
}

export function AdminUserTable({
  items,
  page,
  pageSize,
  total,
}: {
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  total: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const query = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function resetPassword(user: AdminUserListItem) {
    if (!window.confirm(`确定重置 ${user.nickname || user.email} 的密码吗？原密码会立即失效。`)) return;
    setBusyUserId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/actions`, { method: "POST" });
      if (!response.ok) {
        window.alert("操作失败，请稍后重试");
        return;
      }
      const result = (await response.json()) as { data: { temporaryPassword: string } };
      window.alert(`密码已重置，临时密码：${result.data.temporaryPassword}\n请安全地转交给用户。`);
      router.refresh();
    } finally {
      setBusyUserId(null);
    }
  }

  async function deleteUser(user: AdminUserListItem) {
    if (!window.confirm(`确定永久删除用户“${user.nickname || user.email}”吗？该用户的照片、相册和分享也会被删除，此操作不可撤销。`)) return;
    setBusyUserId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/actions`, { method: "DELETE" });
      if (!response.ok) {
        window.alert("删除失败，请稍后重试");
        return;
      }
      router.refresh();
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">People</p>
            <h2 className="mt-2 text-2xl font-black">用户管理</h2>
            <p className="mt-2 text-sm text-white/55">查看注册用户、内容贡献与存储空间使用情况。</p>
          </div>
          <form className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto] lg:items-end" method="get">
            <label className="sr-only" htmlFor="admin-user-keyword">搜索用户</label>
            <input id="admin-user-keyword" name="keyword" defaultValue={searchParams.get("keyword") ?? ""} placeholder="搜索昵称或邮箱" className="h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm outline-none placeholder:text-white/35 focus:border-white/40" />
            <select name="sortBy" defaultValue={searchParams.get("sortBy") ?? "createdAt"} className="h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm focus:border-white/40">
              <option value="createdAt">注册时间</option>
              <option value="storageUsed">已用空间</option>
              <option value="uploads">上传数量</option>
            </select>
            <select name="sortOrder" defaultValue={searchParams.get("sortOrder") ?? "desc"} className="h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm focus:border-white/40">
              <option value="desc">降序</option><option value="asc">升序</option>
            </select>
            <select name="pageSize" defaultValue={String(pageSize)} className="h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm focus:border-white/40">
              <option value="20">20 / 页</option><option value="50">50 / 页</option><option value="100">100 / 页</option>
            </select>
            <button className="h-11 rounded-2xl bg-white px-5 text-sm font-bold text-black transition hover:bg-white/85">筛选</button>
          </form>
        </div>
        <p className="mt-4 text-sm text-white/55">共 {total} 位用户，当前第 {page} / {totalPages} 页。</p>
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full divide-y divide-white/10">
            <thead className="text-left text-xs uppercase tracking-[0.25em] text-white/40"><tr>
              <th className="border-b border-white/10 bg-[#111215]/95 px-4 py-4">用户</th>
              <th className="border-b border-white/10 bg-[#111215]/95 px-4 py-4">存储空间</th>
              <th className="border-b border-white/10 bg-[#111215]/95 px-4 py-4">内容</th>
              <th className="border-b border-white/10 bg-[#111215]/95 px-4 py-4">加入时间</th>
              <th className="border-b border-white/10 bg-[#111215]/95 px-4 py-4">操作</th>
            </tr></thead>
            <tbody className="divide-y divide-white/10">
              {items.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-white/50">没有找到匹配的用户</td></tr> : items.map((user) => {
                const limit = Number(user.storageLimit);
                const used = Number(user.storageUsed);
                const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                return <tr key={user.id} className="align-top transition hover:bg-white/[0.025]">
                  <td className="px-4 py-4"><div className="flex items-center gap-3">
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-11 w-11 rounded-2xl object-cover" /> : <div aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-sm font-black text-black">{initials(user)}</div>}
                    <div><p className="font-semibold text-white">{user.nickname || "未设置昵称"}</p><p className="mt-1 text-xs text-white/45">{user.email}</p></div>
                  </div></td>
                  <td className="px-4 py-4"><div className="flex min-w-48 items-center gap-3"><HardDrive size={16} className="shrink-0 text-white/45" /><div className="w-full"><div className="flex justify-between gap-3 text-sm"><span className="text-white/80">{formatBytes(user.storageUsed)}</span><span className="text-xs text-white/40">{formatBytes(user.storageLimit)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${percent >= 90 ? "bg-rose-400" : "bg-sky-300"}`} style={{ width: `${percent}%` }} /></div></div></div></td>
                  <td className="px-4 py-4"><div className="grid gap-1 text-sm text-white/70"><span>{user.uploadCount} 张照片</span><span>{user.albumCount} 个相册 · {user.membershipCount} 个加入</span></div></td>
                  <td className="px-4 py-4 text-sm text-white/70">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => resetPassword(user)} disabled={busyUserId === user.id} className="whitespace-nowrap rounded-full border border-white/10 px-3 py-2 text-xs text-white/65 transition hover:bg-white/8 disabled:cursor-wait disabled:opacity-50">重置密码</button><button type="button" onClick={() => deleteUser(user)} disabled={busyUserId === user.id} className="whitespace-nowrap rounded-full border border-rose-300/20 px-3 py-2 text-xs text-rose-200/80 transition hover:bg-rose-400/10 disabled:cursor-wait disabled:opacity-50">删除</button></div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/70" aria-label="用户分页"><span>第 {page} 页，共 {totalPages} 页</span><div className="flex gap-2">
        <Link aria-disabled={page <= 1} className={`rounded-full border border-white/10 px-4 py-2 transition ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-white/8"}`} href={{ pathname, query: Object.fromEntries(new URLSearchParams(buildQuery(query, { page: Math.max(1, page - 1) }))) }}>上一页</Link>
        <Link aria-disabled={page >= totalPages} className={`rounded-full border border-white/10 px-4 py-2 transition ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-white/8"}`} href={{ pathname, query: Object.fromEntries(new URLSearchParams(buildQuery(query, { page: Math.min(totalPages, page + 1) }))) }}>下一页</Link>
      </div></nav>
    </div>
  );
}
