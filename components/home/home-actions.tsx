import React from "react";
import Link from "next/link";

export function HomeActions({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (isAuthenticated) {
    return (
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/memories"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--accent)] px-6 text-sm font-bold text-black transition hover:bg-white sm:w-auto"
        >
          进入家庭回忆
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <Link
        href="/login"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--accent)] px-6 text-sm font-bold text-black transition hover:bg-white sm:w-auto"
      >
        登录
      </Link>
      <Link
        href="/memories"
        className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-6 text-sm font-bold text-[var(--text)] transition hover:border-white/35 sm:w-auto"
      >
        家庭回忆
      </Link>
    </div>
  );
}
