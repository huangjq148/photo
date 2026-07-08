import Link from "next/link";
import type { RecentPhoto } from "@/lib/home/queries";

type HomeRecentPhotosProps = {
  photos: RecentPhoto[];
};

function PhotoSkeleton() {
  return (
    <div className="aspect-square animate-pulse rounded-lg bg-[var(--surface-raised)]" />
  );
}

export function HomeRecentPhotosSkeleton() {
  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-4 h-6 w-32 animate-pulse rounded bg-[var(--surface-raised)]" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <PhotoSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function HomeRecentPhotos({ photos }: HomeRecentPhotosProps) {
  if (photos.length === 0) {
    return (
      <section className="mx-auto max-w-4xl text-center">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">最近上传</h2>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-12">
          <p className="mb-4 text-[var(--muted)]">还没有照片，开始上传吧</p>
          <Link
            href="/albums"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-6 text-sm font-bold text-black transition hover:bg-white"
          >
            上传照片
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--text)]">最近上传</h2>
        <Link
          href="/albums"
          className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
        >
          查看全部 →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {photos.map((photo) => (
          <Link
            key={photo.id}
            href={`/albums/${photo.albumId}`}
            className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] transition hover:border-[var(--border-strong)]"
          >
            <img
              src={photo.thumbnailUrl}
              alt={photo.originalName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="truncate text-xs text-white">{photo.originalName}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
