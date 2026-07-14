import { DuplicateGallery } from "@/components/photos/duplicate-gallery";

export default function DuplicatesPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="border-b border-[var(--border)] py-6 sm:py-8">
          <p className="text-sm font-medium text-[var(--film)]">Duplicates</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-[var(--text)] sm:text-4xl">
            重复项目
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            按 checksum 自动识别重复的照片或视频，可选择保留并删除其余。
          </p>
        </section>

        <DuplicateGallery />
      </div>
    </main>
  );
}
