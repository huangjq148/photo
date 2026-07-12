/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { getCurrentUserFromCookieStore } from "@/lib/auth/current-user";
import { getMemoryDashboard } from "@/lib/memory/dashboard";
import { resolveDisplayName } from "@/lib/media/display-name";

function formatDateLabel(isoString: string | null) {
  if (!isoString) return "未记录拍摄时间";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "未记录拍摄时间";
  return date.toLocaleString("zh-CN", { hour12: false });
}

function MemorySectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-[var(--film)]">回忆</p>
        <h2 className="mt-2 text-2xl font-black text-[var(--text)] sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{subtitle}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export default async function MemoryPage() {
  const user = await getCurrentUserFromCookieStore(await cookies());

  if (!user) {
    return (
      <main className="min-h-dvh px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-sm font-medium text-[var(--film)]">回忆</p>
          <h1 className="mt-3 text-4xl font-black text-[var(--text)]">登录后查看你的回忆</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">往年今日、儿童成长月报和年度精选都需要登录后访问。</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/timeline" className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black">
              去时间线
            </Link>
            <Link href="/albums" className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--border-strong)] px-5 text-sm font-bold text-[var(--text)]">
              去相册
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const dashboard = await getMemoryDashboard(prisma, user.id);
  const totalMemoryItems =
    dashboard.onThisDay.items.length +
    dashboard.childReports.reduce((sum, report) => sum + report.items.length, 0) +
    dashboard.annualHighlights.reduce((sum, highlight) => sum + highlight.items.length, 0);

  return (
    <main className="min-h-dvh px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(12,18,30,0.92),rgba(22,12,36,0.84))] px-5 py-8 sm:px-8 sm:py-10">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-4">
              <p className="text-sm font-medium text-[var(--film)]">回忆中心</p>
              <h1 className="max-w-3xl text-4xl font-black leading-none text-white sm:text-6xl">
                把照片从资料库里，重新变成故事。
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/72 sm:text-base">
                这里会把你能访问的照片重新编排成“往年今日”“儿童成长月报”和“年度精选”，让整理过的相册慢慢长出时间的层次。
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/timeline" className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black">
                  打开时间线
                </Link>
                <Link href="/albums" className="inline-flex h-11 items-center justify-center rounded-lg border border-white/20 px-5 text-sm font-bold text-white">
                  查看相册
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">回忆照片</p>
                <p className="mt-2 text-3xl font-black text-white">{totalMemoryItems}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">往年今日</p>
                <p className="mt-2 text-3xl font-black text-white">{dashboard.onThisDay.items.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">成长月报</p>
                <p className="mt-2 text-3xl font-black text-white">{dashboard.childReports.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">年度精选</p>
                <p className="mt-2 text-3xl font-black text-white">{dashboard.annualHighlights.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <MemorySectionTitle
            title={dashboard.onThisDay.title}
            subtitle="把今天和过去同一天发生的照片并排放在一起，方便你快速找回那些年份的同一天。"
            action={
              <Link href="/timeline" className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]">
                去时间线查看
              </Link>
            }
          />

          {dashboard.onThisDay.items.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {dashboard.onThisDay.items.map((photo) => (
                <article key={photo.id} className="overflow-hidden rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-strong)]/80">
                  <a href={photo.originalUrl} className="block">
                    <div className="aspect-[4/3] overflow-hidden bg-black">
                      <img src={photo.thumbnailUrl} alt={resolveDisplayName(photo.displayName, photo.originalName)} className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]" />
                    </div>
                  </a>
                  <div className="space-y-2 p-4">
                    <p className="truncate text-sm font-semibold text-[var(--text)]">
                      {resolveDisplayName(photo.displayName, photo.originalName)}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{photo.albumName}</p>
                    <p className="text-xs text-[var(--muted)]">{formatDateLabel(photo.takenAt ?? photo.uploadedAt)}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-strong)]/70 p-6 text-sm text-[var(--muted)]">
              今天还没有历史照片可以回顾。
            </div>
          )}
        </section>

        <section className="space-y-4">
          <MemorySectionTitle
            title="儿童成长月报"
            subtitle="把孩子相册里本月新增的照片汇总起来，按相册分组展示最近的成长瞬间。"
            action={<Link href="/albums" className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]">管理相册</Link>}
          />

          {dashboard.childReports.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {dashboard.childReports.map((report) => (
                <article key={report.albumId} className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-strong)]/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">{report.albumName}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {report.monthLabel} · {report.childAgeLabel ?? "年龄信息待补充"}
                      </p>
                    </div>
                    <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]">
                      {report.photoCount} 张
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {report.items.slice(0, 6).map((photo) => (
                      <a key={photo.id} href={photo.originalUrl} className="block overflow-hidden rounded-xl border border-[var(--border)] bg-black/20">
                        <img src={photo.thumbnailUrl} alt={resolveDisplayName(photo.displayName, photo.originalName)} className="aspect-square w-full object-cover" />
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-strong)]/70 p-6 text-sm text-[var(--muted)]">
              暂时没有孩子相册可生成月报。
            </div>
          )}
        </section>

        <section className="space-y-4">
          <MemorySectionTitle
            title="年度精选"
            subtitle="按年份整理你今年最值得回看的照片。这里先用当前年份的高频回看候选做一个精选集。"
            action={<Link href="/favorites" className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]">查看收藏</Link>}
          />

          {dashboard.annualHighlights.length > 0 ? (
            <div className="space-y-5">
              {dashboard.annualHighlights.map((highlight) => (
                <section key={highlight.year} className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-strong)]/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-[var(--text)]">{highlight.year} 年</h3>
                    <span className="text-xs text-[var(--muted)]">{highlight.items.length} 张候选精选</span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {highlight.items.map((photo) => (
                      <article key={photo.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black/10">
                        <a href={photo.originalUrl} className="block">
                          <div className="aspect-[4/3] overflow-hidden bg-black">
                            <img src={photo.thumbnailUrl} alt={resolveDisplayName(photo.displayName, photo.originalName)} className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]" />
                          </div>
                        </a>
                        <div className="space-y-1 p-3">
                          <p className="truncate text-sm font-semibold text-[var(--text)]">
                            {resolveDisplayName(photo.displayName, photo.originalName)}
                          </p>
                          <p className="text-xs text-[var(--muted)]">{photo.albumName}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-strong)]/70 p-6 text-sm text-[var(--muted)]">
              暂时没有可展示的年度精选。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
