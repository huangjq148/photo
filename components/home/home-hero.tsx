/* eslint-disable @next/next/no-img-element */

import React from "react";
import Link from "next/link";
import type { OnThisDayMemory } from "@/lib/memory/dashboard";
import { resolveDisplayName } from "@/lib/media/display-name";

type HomeHeroProps = {
  user: {
    nickname: string;
  } | null;
  memorySpotlight?: OnThisDayMemory | null;
};

function formatMemoryCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

function MemoryPreview({ memory }: { memory: OnThisDayMemory }) {
  const previewItems = memory.items.slice(0, 3);

  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.06] p-4 text-left shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/55">今天的回忆</p>
          <p className="mt-2 text-lg font-black text-white">{memory.title}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
          <p className="text-[11px] text-white/55">往年今日</p>
          <p className="text-xl font-black text-white">{formatMemoryCount(memory.items.length)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {previewItems.length > 0 ? (
          previewItems.map((photo, index) => (
            <a
              key={photo.id}
              href={photo.originalUrl}
              className={index === 0 ? "col-span-2 row-span-2 overflow-hidden rounded-2xl border border-white/10 bg-black/30" : "overflow-hidden rounded-2xl border border-white/10 bg-black/20"}
              aria-label={resolveDisplayName(photo.displayName, photo.originalName)}
            >
              <img
                src={photo.thumbnailUrl}
                alt={resolveDisplayName(photo.displayName, photo.originalName)}
                className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
              />
            </a>
          ))
        ) : (
          <div className="col-span-3 rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm leading-6 text-white/60">
            今天还没有可回看的同日照片，上传后这里会自动出现。
          </div>
        )}
      </div>

      <Link
        href="/memory"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-black transition hover:bg-white"
      >
        打开今天的回忆
      </Link>
    </div>
  );
}

export function HomeHero({ user, memorySpotlight }: HomeHeroProps) {
  const spotlight = user ? memorySpotlight ?? null : null;
  const hasMemorySpotlight = spotlight !== null;

  return (
    <section className="noir-glass-panel mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
      <div className={hasMemorySpotlight ? "grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center" : "mx-auto max-w-3xl text-center"}>
        <div className={hasMemorySpotlight ? "text-left" : ""}>
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
              <div className={hasMemorySpotlight ? "flex flex-col gap-3 sm:flex-row" : "flex flex-col gap-3 sm:flex-row sm:justify-center"}>
                <Link
                  href="/albums"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-8 text-sm font-bold text-black transition hover:bg-white"
                >
                  进入相册
                </Link>
                <Link
                  href="/memory"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg noir-glass-chip px-8 text-sm font-bold text-[var(--text)] transition hover:border-[var(--border-strong)]"
                >
                  今天的回忆
                </Link>
              </div>
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

        {spotlight ? <MemoryPreview memory={spotlight} /> : null}
      </div>
    </section>
  );
}
