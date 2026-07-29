import { FavoritesGallery } from "@/components/photos/favorites-gallery";

export default function FavoritesPage() {
  return (
    <main className="px-4 pb-8 pt-4 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="border-b border-[var(--border)] py-4 sm:py-8">
          <p className="text-sm font-medium text-[var(--film)]">Favorites</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-[var(--text)] sm:text-4xl">
            收藏
          </h1>
        </section>

        <FavoritesGallery />
      </div>
    </main>
  );
}
