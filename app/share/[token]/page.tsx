import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublicPhotoShare } from "@/lib/photos/shares";
import { ShareImageClient } from "@/components/share/share-image-client";

export const dynamic = "force-dynamic";

type SharePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  try {
    const share = await getPublicPhotoShare(prisma, token);

    // Use token-based public file URLs for anonymous access
    const thumbnailUrl = `/api/shares/${token}/files/thumbnail`;
    const previewUrl = `/api/shares/${token}/files/preview`;
    const originalUrl = `/api/shares/${token}/files/original`;

    return (
      <main className="min-h-screen bg-black px-5 py-8 text-[var(--text)] sm:px-10">
        <div className="mx-auto max-w-6xl">
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <ShareImageClient
              thumbnailUrl={thumbnailUrl}
              previewUrl={previewUrl}
              originalUrl={originalUrl}
              originalName={share.originalName}
              mimeType={share.mimeType}
              mediaType={share.mediaType}
              duration={share.duration}
            />
            <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-sm font-medium text-[var(--film)]">
                  {share.albumName}
                </p>
                <h1 className="mt-2 text-3xl font-black leading-tight text-[var(--text)] sm:text-5xl">
                  {share.originalName}
                </h1>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {share.width} × {share.height}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={originalUrl}
                  download={share.originalName}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black"
                >
                  下载原图
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}
