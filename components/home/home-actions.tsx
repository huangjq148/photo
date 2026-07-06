import React from "react";
import Link from "next/link";

export function HomeActions({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (isAuthenticated) {
    return (
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/albums"
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-6 text-sm font-bold text-black transition hover:bg-white"
        >
          进入相册
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <Link
        href="/login"
        className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-6 text-sm font-bold text-black transition hover:bg-white"
      >
        登录
      </Link>
      <Link
        href="/albums"
        className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-6 text-sm font-bold text-[var(--text)] transition hover:border-white/35"
      >
        相册
      </Link>
    </div>
  );
}
