import { redirect } from "next/navigation";

export default async function SpaceAlbumDetailRedirect({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  redirect(`/albums/${albumId}`);
}
