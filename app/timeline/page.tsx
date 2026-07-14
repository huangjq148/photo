import { TimelineGallery } from "@/components/photos/timeline-gallery";

export default function TimelinePage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="border-b border-[var(--border)] py-6 sm:py-8">
          <p className="text-sm font-medium text-[var(--film)]">Timeline</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-[var(--text)] sm:text-4xl">
            时间线
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            按拍摄时间浏览你有权限访问的照片和视频。
          </p>
        </section>

        <TimelineGallery />
      </div>
    </main>
  );
}
