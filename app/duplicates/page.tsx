import Link from "next/link";
import { DuplicateGallery } from "@/components/photos/duplicate-gallery";

export default function DuplicatesPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="border-b border-[var(--border)] py-10 sm:py-14">
          <p className="text-sm font-medium text-[var(--film)]">Duplicates</p>
          <h1 className="mt-3 text-5xl font-black leading-none text-[var(--text)] sm:text-7xl">
            重复项目
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            按 checksum 自动识别完全重复的照片或视频，默认保留最早的一项，你可以改选后删除其余重复内容。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/timeline"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-strong)] px-5 text-sm font-bold text-[var(--text)]"
            >
              时间线
            </Link>
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
          </div>
        </section>

        <DuplicateGallery />
      </div>
    </main>
  );
}
