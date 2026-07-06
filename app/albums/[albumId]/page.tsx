import { AlbumDetail } from "@/components/albums/album-detail";

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  return (
    <main className="min-h-dvh px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <AlbumDetail albumId={albumId} />
      </div>
    </main>
  );
}
