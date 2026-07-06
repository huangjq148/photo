"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CurrentUser = {
  id: string;
  email: string;
  nickname: string;
  storageUsed: string;
  storageLimit: string;
};

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const response = await fetch("/api/users/me");
      if (!response.ok) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      const json = await response.json();
      if (mounted) {
        setUser(json.data);
        setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!user) {
    if (loading) {
      return (
        <div className="h-10 w-20 rounded-lg border border-[var(--border)] bg-white/[0.08]" aria-hidden="true" />
      );
    }

    return (
      <Link
        href="/login"
        className="inline-flex min-h-10 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-3.5 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--border-strong)]"
      >
        登录
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <div className="hidden text-right leading-tight sm:block">
        <p className="text-sm font-medium text-[var(--text)]">{user.nickname}</p>
        <p className="text-xs text-[var(--muted)]">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={logout}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-[var(--text)]"
      >
        退出
      </button>
    </div>
  );
}
