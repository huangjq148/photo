import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";

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
        <>
          <div className="inline-flex h-[50px] w-20 items-center justify-center rounded-xl border border-[var(--border)] bg-white/[0.08] p-1 lg:hidden" aria-hidden="true" />
          <div className="hidden h-10 w-20 rounded-lg border border-[var(--border)] bg-white/[0.08] lg:block" aria-hidden="true" />
        </>
      );
    }

    return (
      <>
        <Link
          href="/login"
          className="inline-flex h-[50px] items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 text-sm font-medium text-[var(--text)] transition hover:border-[var(--border-strong)] lg:hidden"
        >
          <span className="inline-flex h-[40px] items-center rounded-lg bg-[var(--surface-strong)] px-3.5">
            登录
          </span>
        </Link>
        <Link
          href="/login"
          className="hidden min-h-10 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-3.5 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--border-strong)] lg:inline-flex"
        >
          登录
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="inline-flex h-[50px] items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 lg:hidden">
        <button
          type="button"
          onClick={logout}
          className="inline-flex h-[40px] items-center rounded-lg bg-[var(--surface-strong)] px-3.5 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
        >
          退出
        </button>
      </div>
      <div className="hidden items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 lg:flex">
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-sm font-medium text-[var(--text)]">{user.nickname}</p>
          <p className="text-xs text-[var(--muted)]">{user.email}</p>
        </div>
        <Link
          href="/account/security"
          className="rounded-md px-3 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-[var(--text)] inline-flex items-center gap-1"
        >
          <Shield size={14} />
          安全
        </Link>
        <button
          type="button"
          onClick={logout}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:bg-white/[0.08] hover:text-[var(--text)]"
        >
          退出
        </button>
      </div>
    </>
  );
}
