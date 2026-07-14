import { TrashGallery } from "@/components/photos/trash-gallery";

export default function TrashPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="border-b border-[var(--border)] py-6 sm:py-8">
          <p className="text-sm font-medium text-[var(--film)]">Trash</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-[var(--text)] sm:text-4xl">
            回收站
          </h1>
        </section>

        <TrashGallery />
      </div>
    </main>
  );
}
