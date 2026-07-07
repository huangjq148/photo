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
    const shareData = share as Record<string, unknown>;
    const mediaType = (shareData.mediaType as string) ?? "image";
    const playbackUrl = shareData.playbackUrl as string | null;
    const processingStatus = shareData.processingStatus as string | null;

    return (
      <main className="min-h-screen bg-black px-5 py-8 text-[var(--text)] sm:px-10">
        <div className="mx-auto max-w-6xl">
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            {mediaType === "video" && playbackUrl ? (
              <video
                controls
                playsInline
                preload="metadata"
                poster={typeof shareData.previewUrl === "string" ? shareData.previewUrl : undefined}
                className="max-h-[70vh] w-full bg-black"
              >
                <source src={playbackUrl} type="video/mp4" />
                您的浏览器不支持视频播放。
              </video>
            ) : mediaType === "video" ? (
              <div className="flex aspect-video w-full items-center justify-center bg-[#0b0b0b]">
                <p className="text-sm text-[var(--muted)]">
                  {processingStatus === "pending" || processingStatus === "processing"
                    ? "视频正在处理，暂不可播放"
                    : "视频暂不可播放"}
                </p>
              </div>
            ) : (
              <ShareImageClient
                thumbnailUrl={share.previewUrl}
                previewUrl={share.previewUrl}
                originalName={share.originalName}
              />
            )}
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
                {share.originalUrl && (
                  <a
                    href={share.originalUrl}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-black"
                  >
                    下载原图
                  </a>
                )}
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
