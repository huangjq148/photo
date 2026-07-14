import { MapGallery } from "@/components/photos/map-gallery";

export default function MapPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="border-b border-[var(--border)] py-6 sm:py-8">
          <p className="text-sm font-medium text-[var(--film)]">Map</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-[var(--text)] sm:text-4xl">
            地图视图
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            浏览带有 GPS 位置信息的照片，支持缩放和聚合。
          </p>
        </section>

        <MapGallery />
      </div>
    </main>
  );
}
