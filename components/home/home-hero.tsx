import React from "react";
import Link from "next/link";

type HomeHeroProps = {
  user: {
    nickname: string;
  } | null;
};

export function HomeHero({ user }: HomeHeroProps) {
  return (
    <section className="noir-glass-panel mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:px-10 sm:py-14 lg:px-14 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm font-medium tracking-[0.18em] text-[var(--film)]">
          PHOTO ARCHIVE
        </p>
        <h1 className="text-5xl font-black leading-[0.92] text-[var(--text)] sm:text-7xl lg:text-8xl">
          NOIR PHOTO
        </h1>

        {user ? (
          <div className="mt-6 space-y-4">
            <p className="text-lg text-[var(--muted-strong)]">
              欢迎回来，<span className="font-bold text-[var(--text)]">{user.nickname}</span>
            </p>
            <Link
              href="/albums"
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-8 text-sm font-bold text-black transition hover:bg-white"
            >
              进入相册
            </Link>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--accent)] px-6 text-sm font-bold text-black transition hover:bg-white sm:w-auto"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg noir-glass-chip px-6 text-sm font-bold text-[var(--text)] transition hover:border-[var(--border-strong)] sm:w-auto"
            >
              注册
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
