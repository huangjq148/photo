import { AlbumList } from "@/components/albums/album-list";

export default function AlbumsPage() {
  return (
    <main className="min-h-dvh px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <AlbumList />
      </div>
    </main>
  );
}
