"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { LogOut, Image, FolderTree } from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/admin/photos", label: "图片管理", icon: Image },
  { href: "/admin/files", label: "文件管理", icon: FolderTree },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function handleLogout() {
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-dvh overflow-hidden bg-[#08090c] text-[#f5f2eb]">
      <div className="flex h-dvh min-h-0">
        <aside className="hidden h-full w-72 shrink-0 flex-col border-r border-white/10 bg-white/[0.03] px-5 py-6 lg:flex">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.4em] text-white/45">Admin</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight">Photo Console</h1>
            <p className="mt-2 text-sm text-white/55">只读图片总览与受控文件清理</p>
          </div>

          <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "!bg-white !text-[#08090c]"
                      : "text-white/70 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            disabled={busy}
            className="mt-4 inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/8 disabled:opacity-50"
          >
            <LogOut size={16} />
            {busy ? "退出中..." : "退出登录"}
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-white/10 bg-white/[0.02] px-4 py-4 lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/45">Admin</p>
                <h1 className="mt-1 text-lg font-black">Photo Console</h1>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/75 disabled:opacity-50"
              >
                <LogOut size={16} />
                退出
              </button>
            </div>
            <nav className="mt-4 flex gap-2 overflow-x-auto">
              {navItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "!bg-white !text-[#08090c]"
                        : "bg-white/[0.06] text-white/75"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
