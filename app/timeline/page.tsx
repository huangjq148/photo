import { TimelineGallery } from "@/components/photos/timeline-gallery";

export default function TimelinePage() {
  return (
    <main className="timeline-page px-4 pb-8 pt-4 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <section className="timeline-compact-header">
          <span className="timeline-header-index" aria-hidden="true">01</span>
          <div className="timeline-heading-lockup">
            <p>CHRONOLOGY</p>
            <h1>时间线</h1>
          </div>
          <p className="timeline-header-description">
            按拍摄时间浏览你有权限访问的照片和视频。
          </p>
        </section>

        <TimelineGallery />
      </div>
    </main>
  );
}
