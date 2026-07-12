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
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,28,0.95),rgba(8,10,16,0.98))] p-4 text-left shadow-[0_32px_80px_rgba(0,0,0,0.38)] sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_30%)]" />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">TODAY'S MEMORY</p>
          <p className="mt-3 text-2xl font-black leading-tight text-white">{memory.title}</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">把今天和过去同一天的片段放在一起看，像翻开一页有温度的电影胶片。</p>
        </div>
        <div className="rounded-[1.1rem] border border-white/10 bg-black/25 px-3 py-2 text-right">
          <p className="text-[11px] text-white/50">往年今日</p>
          <p className="text-2xl font-black tracking-tight text-white">{formatMemoryCount(memory.items.length)}</p>
        </div>
      </div>

      <div className="relative mt-4 grid gap-2 sm:grid-cols-3 sm:grid-rows-2">
        {previewItems.length > 0 ? (
          previewItems.map((photo, index) => (
            <a
              key={photo.id}
              href={photo.originalUrl}
              className={
                index === 0
                  ? "group relative col-span-2 row-span-2 overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/35"
                  : "group relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/25"
              }
              aria-label={resolveDisplayName(photo.displayName, photo.originalName)}
            >
              <img
                src={photo.thumbnailUrl}
                alt={resolveDisplayName(photo.displayName, photo.originalName)}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              />
              {index === 0 ? (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3">
                  <p className="truncate text-xs font-medium uppercase tracking-[0.18em] text-white/55">HIGHLIGHT</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{resolveDisplayName(photo.displayName, photo.originalName)}</p>
                </div>
              ) : null}
            </a>
          ))
        ) : (
          <div className="col-span-3 rounded-[1.4rem] border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm leading-6 text-white/60">
            今天还没有可回看的同日照片，上传后这里会自动出现。
          </div>
        )}
      </div>

      <Link
        href="/memory"
        className="relative mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-black transition hover:bg-white sm:w-auto"
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
    <section className="noir-glass-panel relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.09),transparent_28%),radial-gradient(circle_at_right,rgba(255,255,255,0.05),transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_40%)]" />
      <div className={hasMemorySpotlight ? "grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center" : "mx-auto max-w-3xl text-center"}>
        <div className={hasMemorySpotlight ? "relative text-left" : "relative"}>
          <p className="mb-4 text-xs font-semibold tracking-[0.32em] text-[var(--film)]">
            PHOTO ARCHIVE
          </p>
          <h1 className="max-w-[9ch] text-[clamp(3.5rem,10vw,7.5rem)] font-black leading-[0.88] tracking-[-0.04em] text-[var(--text)]">
            NOIR PHOTO
          </h1>

          {user ? (
            <div className="mt-6 space-y-5">
              <p className="max-w-xl text-base leading-7 text-[var(--muted-strong)] sm:text-lg">
                你的照片不是一堆文件，而是一部会慢慢变厚的日记。今天的回忆会直接站到首页前排。
              </p>
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
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-8 text-sm font-bold text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-white/10"
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
