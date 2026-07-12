import Link from "next/link";
import { MapGallery } from "@/components/photos/map-gallery";

export default function MapPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="border-b border-[var(--border)] py-10 sm:py-14">
          <p className="text-sm font-medium text-[var(--film)]">Map</p>
          <h1 className="mt-3 text-5xl font-black leading-none text-[var(--text)] sm:text-7xl">
            地图视图
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            浏览带有 GPS 信息的媒体，支持缩放、聚合和单张位置隐藏控制。默认会过滤已隐藏的位置，也可以手动包含它们。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/timeline"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-strong)] px-5 text-sm font-bold text-[var(--text)]"
            >
              时间线
            </Link>
            <Link
              href="/duplicates"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-strong)] px-5 text-sm font-bold text-[var(--text)]"
            >
              重复项目
            </Link>
            <Link
              href="/albums"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black"
            >
              相册
            </Link>
          </div>
        </section>

        <MapGallery />
      </div>
    </main>
  );
}
