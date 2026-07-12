/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { OnThisDayMemory } from "@/lib/memory/dashboard";
import { resolveDisplayName } from "@/lib/media/display-name";

type HomeMemorySpotlightProps = {
  onThisDay: OnThisDayMemory;
};

function MemoryThumb({ photo, className }: { photo: OnThisDayMemory["items"][number]; className?: string }) {
  return (
    <a
      href={photo.originalUrl}
      className={className ?? "block overflow-hidden rounded-2xl border border-white/10 bg-black/20"}
      aria-label={resolveDisplayName(photo.displayName, photo.originalName)}
    >
      <img
        src={photo.thumbnailUrl}
        alt={resolveDisplayName(photo.displayName, photo.originalName)}
        className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
      />
    </a>
  );
}

export function HomeMemorySpotlight({ onThisDay }: HomeMemorySpotlightProps) {
  const previewItems = onThisDay.items.slice(0, 3);
  const hasItems = previewItems.length > 0;

  return (
    <section className="mx-auto max-w-5xl">
      <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(16,22,34,0.96),rgba(32,18,45,0.9))]">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:p-7">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                今天的回忆
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
                {onThisDay.title}
              </span>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-black leading-none text-white sm:text-4xl">
                一眼看到今天曾发生过什么。
              </h2>
              <p className="max-w-xl text-sm leading-6 text-white/72 sm:text-base">
                把往年今日的照片直接放到首页，用户打开应用就能先看见今天的回忆，再顺手进入完整回忆页。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs text-white/55">往年今日</p>
                <p className="mt-1 text-2xl font-black text-white">{onThisDay.items.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs text-white/55">入口</p>
                <p className="mt-1 text-sm font-semibold text-white/90">回忆页</p>
              </div>
              <Link
                href="/memory"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black transition hover:bg-white"
              >
                查看今天的回忆
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {hasItems ? (
              <>
                <MemoryThumb
                  photo={previewItems[0]}
                  className="group relative aspect-[4/5] overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/30 sm:col-span-2 lg:col-span-1 xl:col-span-1"
                />
                {previewItems.slice(1).map((photo) => (
                  <MemoryThumb key={photo.id} photo={photo} className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/20 aspect-[4/5] sm:aspect-square lg:aspect-[4/5]" />
                ))}
                {previewItems.length === 1 ? (
                  <div className="hidden rounded-[1.4rem] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-white/55 sm:flex sm:items-center sm:justify-center lg:hidden xl:flex">
                    还有更多今天的回忆等你打开
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex min-h-[16rem] items-center justify-center rounded-[1.8rem] border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm leading-6 text-white/60">
                今天还没有可回看的同日照片。
                <br />
                上传更多照片后，这里会自动出现“今天的回忆”。
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
