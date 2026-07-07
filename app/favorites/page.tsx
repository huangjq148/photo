import Link from "next/link";
import { FavoritesGallery } from "@/components/photos/favorites-gallery";

export default function FavoritesPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="border-b border-[var(--border)] py-10 sm:py-14">
          <p className="text-sm font-medium text-[var(--film)]">家族回忆</p>
          <h1 className="mt-3 text-5xl font-black leading-none text-[var(--text)] sm:text-7xl">
            收藏精选
          </h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/albums"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-strong)] px-5 text-sm font-bold text-[var(--text)]"
            >
              相册
            </Link>
            <Link
              href="/trash"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black"
            >
              回收站
            </Link>
          </div>
        </section>

        <FavoritesGallery />
      </div>
    </main>
  );
}
