import { AlbumDetail } from "@/components/albums/album-detail";

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  return (
    <main className="album-detail-page px-4 pb-10 pt-4 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <AlbumDetail albumId={albumId} />
      </div>
    </main>
  );
}
