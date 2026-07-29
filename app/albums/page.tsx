import { AlbumList } from "@/components/albums/album-list";

export default function AlbumsPage() {
  return (
    <main className="px-4 pb-8 pt-5 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <AlbumList />
      </div>
    </main>
  );
}
