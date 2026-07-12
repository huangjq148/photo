import Link from "next/link";
import { TimelineGallery } from "@/components/photos/timeline-gallery";

export default function TimelinePage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="border-b border-[var(--border)] py-10 sm:py-14">
          <p className="text-sm font-medium text-[var(--film)]">Timeline</p>
          <h1 className="mt-3 text-5xl font-black leading-none text-[var(--text)] sm:text-7xl">
            时间线
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            按拍摄或上传时间浏览你有权限访问的照片和视频，支持按日、按月、按年分组，并使用游标继续加载更早内容。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/albums"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-strong)] px-5 text-sm font-bold text-[var(--text)]"
            >
              相册
            </Link>
            <Link
              href="/favorites"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black"
            >
              收藏
            </Link>
            <Link
              href="/trash"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-strong)] px-5 text-sm font-bold text-[var(--text)]"
            >
              回收站
            </Link>
          </div>
        </section>

        <TimelineGallery />
      </div>
    </main>
  );
}
