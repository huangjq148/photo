import Link from "next/link";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { getCurrentUserFromCookieStore } from "@/lib/auth/current-user";
import { getMemoryDashboard } from "@/lib/memory/dashboard";
import { resolveDisplayName } from "@/lib/media/display-name";
import { buildMediaViewerNavigationItems } from "@/components/photos/image-viewer-navigation";
import { MemoryImageViewer } from "@/components/memory/memory-image-viewer";

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
      <main className="memory-page px-4 pb-8 pt-4 sm:px-8 sm:py-8 lg:px-10">
        <div className="mx-auto max-w-5xl rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface)] p-5 text-center sm:rounded-[1.5rem] sm:p-6">
          <p className="text-sm font-medium text-[var(--film)]">回忆</p>
          <h1 className="mt-2 text-2xl font-black text-[var(--text)] sm:text-3xl">登录后查看你的回忆</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">登录后查看往年今日、成长月报和年度精选。</p>
          <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
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
  const onThisDayNavigation = buildMediaViewerNavigationItems(dashboard.onThisDay.items);

  return (
    <main className="memory-page px-4 pb-8 pt-4 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        <section className="memory-compact-header">
          <div className="memory-header-main">
            <span className="memory-header-index" aria-hidden="true">01</span>
            <div className="memory-heading-lockup">
              <p>MEMORY ARCHIVE</p>
              <h1>回忆</h1>
            </div>
            <p className="memory-header-tagline">把照片从资料库里，重新变成故事。</p>
          </div>

          <div className="memory-stat-row">
            <div>
              <strong>{totalMemoryItems}</strong>
              <span>回忆照片</span>
            </div>
            <div>
              <strong>{dashboard.onThisDay.items.length}</strong>
              <span>往年今日</span>
            </div>
            <div>
              <strong>{dashboard.childReports.length}</strong>
              <span>成长月报</span>
            </div>
            <div>
              <strong>{dashboard.annualHighlights.length}</strong>
              <span>年度精选</span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <MemorySectionTitle
            title={dashboard.onThisDay.title}
            subtitle="回顾历史上今天的照片。"
          />

          {dashboard.onThisDay.items.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {dashboard.onThisDay.items.map((photo) => (
                <article key={photo.id} className="overflow-hidden rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-strong)]/80">
                  <MemoryImageViewer
                    photo={photo}
                    navigationItems={onThisDayNavigation}
                    className="aspect-[4/3] w-full bg-black"
                    imgClassName="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
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
            subtitle="按相册汇总孩子本月的成长瞬间。"
          />

          {dashboard.childReports.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {dashboard.childReports.map((report) => {
                const reportNavigation = buildMediaViewerNavigationItems(report.items);

                return (
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

                  <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
                    {report.items.slice(0, 6).map((photo) => (
                      <MemoryImageViewer
                        key={photo.id}
                        photo={photo}
                        navigationItems={reportNavigation}
                        className="aspect-square w-full rounded-xl border border-[var(--border)] bg-black/20"
                        imgClassName="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ))}
                  </div>
                  </article>
                );
              })}
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
            subtitle="按年份整理最值得回看的照片。"
          />

          {dashboard.annualHighlights.length > 0 ? (
            <div className="space-y-5">
              {dashboard.annualHighlights.map((highlight) => {
                const highlightNavigation = buildMediaViewerNavigationItems(highlight.items);

                return (
                  <section key={highlight.year} className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--surface-strong)]/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-[var(--text)]">{highlight.year} 年</h3>
                    <span className="text-xs text-[var(--muted)]">{highlight.items.length} 张候选精选</span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {highlight.items.map((photo) => (
                      <article key={photo.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black/10">
                        <MemoryImageViewer
                          photo={photo}
                          navigationItems={highlightNavigation}
                          className="aspect-[4/3] w-full bg-black"
                          imgClassName="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
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
                );
              })}
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
