/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublicAlbumShare } from "@/lib/albums/shares";

export const dynamic = "force-dynamic";

type SharePageProps = {
  params: Promise<{
    token: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "永久有效";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "有效期未知";
  return date.toLocaleString("zh-CN", { hour12: false });
}

export default async function AlbumSharePage({ params }: SharePageProps) {
  const { token } = await params;

  try {
    const share = await getPublicAlbumShare(prisma, token);

    return (
      <main className="min-h-screen bg-black px-5 py-8 text-[var(--text)] sm:px-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-5 py-4 sm:px-7">
              <p className="text-sm font-medium text-[var(--film)]">公开相册分享</p>
              <h1 className="mt-2 text-3xl font-black leading-tight text-[var(--text)] sm:text-5xl">
                {share.albumName}
              </h1>
              {share.albumDescription ? (
                <p className="mt-3 max-w-3xl text-sm text-[var(--muted)]">{share.albumDescription}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
                <span>{share.photoCount} 张照片</span>
                <span>{share.memberCount} 位成员</span>
                <span>{share.allowDownload ? "允许下载" : "仅预览"}</span>
                <span>有效期：{formatDate(share.expiresAt?.toISOString() ?? null)}</span>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:p-7 md:grid-cols-2 xl:grid-cols-3">
              {share.photos.map((photo) => {
                const thumbnailUrl = `/api/album-shares/${token}/files/${photo.id}/thumbnail`;
                const previewUrl = `/api/album-shares/${token}/files/${photo.id}/preview`;
                const originalUrl = `/api/album-shares/${token}/files/${photo.id}/original`;

                return (
                  <article
                    key={photo.id}
                    className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)]/80"
                  >
                    <a href={share.allowDownload ? originalUrl : previewUrl} className="block">
                      <div className="relative aspect-[4/3] overflow-hidden bg-black">
                        <img
                          src={thumbnailUrl}
                          alt={photo.displayName?.trim() || photo.originalName}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </a>
                    <div className="space-y-3 p-4">
                      <div>
                        <p className="truncate text-sm font-semibold text-[var(--text)]">
                          {photo.displayName?.trim() || photo.originalName}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {photo.mediaType === "video" ? "视频" : "图片"} · {photo.width} × {photo.height}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={previewUrl}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-xs font-bold text-[var(--text)]"
                        >
                          预览
                        </a>
                        {share.allowDownload ? (
                          <a
                            href={originalUrl}
                            download={photo.originalName}
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--accent)] px-3 text-xs font-bold text-black"
                          >
                            下载
                          </a>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">已关闭下载</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}
