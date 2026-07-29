import { MapGallery } from "@/components/photos/map-gallery";

export default function MapPage() {
  return (
    <main className="map-page px-4 pb-8 pt-4 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <section className="map-compact-header">
          <span className="map-header-index" aria-hidden="true">01</span>
          <div className="map-heading-lockup">
            <p>PLACES</p>
            <h1>地图视图</h1>
          </div>
          <p className="map-header-description">
            浏览带有 GPS 位置信息的照片，支持缩放和聚合。
          </p>
        </section>

        <MapGallery />
      </div>
    </main>
  );
}
