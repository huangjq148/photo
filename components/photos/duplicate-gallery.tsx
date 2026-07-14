"use client";

import { useEffect, useMemo, useState } from "react";
import ImageViewer from "@/components/ui/image-viewer";
import { useMessage } from "@/components/ui/message";
import { buildMediaViewerNavigationItems } from "@/components/photos/image-viewer-navigation";
import { resolveDisplayName } from "@/lib/media/display-name";
import { getMediaDeleteActions } from "@/lib/media/delete-actions";
import type { DuplicateGroup } from "@/lib/media/duplicates";
import { PhotoGallerySizeControl, type PhotoSize } from "@/components/photos/photo-gallery-size-control";
import { GalleryGrid } from "@/components/photos/gallery-grid";
import { loadGalleryPreferences, updateGalleryPreferences } from "@/lib/client/gallery-preferences";

function formatBytes(bytes: string) {
  const value = Number(bytes);
  if (!Number.isFinite(value)) return bytes;
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let unit = units[0];
  for (let i = 1; i < units.length && size >= 1024; i += 1) {
    size /= 1024;
    unit = units[i];
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${unit}`;
}

function formatMoment(dateStr: string | null) {
  if (!dateStr) return "未记录拍摄时间";
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

type DuplicateSelection = Record<string, string>;

export function DuplicateGallery() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<DuplicateSelection>({});
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const message = useMessage();
  const deleteAction = useMemo(() => getMediaDeleteActions({ surface: "duplicate" }), []);
  const [photoSize, setPhotoSize] = useState<PhotoSize>(() => loadGalleryPreferences().photoSize);

  useEffect(() => {
    updateGalleryPreferences({ photoSize });
  }, [photoSize]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/media/duplicates", { cache: "no-store" });
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error ?? "加载重复项失败");
        }

        const data = (json.data ?? []) as DuplicateGroup[];
        if (active) {
          setGroups(data);
          setSelection((current) => {
            const next: DuplicateSelection = {};
            for (const group of data) {
              next[group.checksum] = current[group.checksum] ?? group.suggestedKeeperId;
            }
            return next;
          });
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "加载重复项失败");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [refreshToken]);

  const duplicateCount = useMemo(
    () => groups.reduce((sum, group) => sum + group.items.length, 0),
    [groups]
  );

  async function deleteDuplicates(group: DuplicateGroup) {
    const keeperId = selection[group.checksum] ?? group.suggestedKeeperId;
    const targets = group.items.filter((item) => item.id !== keeperId);
    if (targets.length === 0) {
      return;
    }

    setSavingGroup(group.checksum);
    try {
      const results = await Promise.all(
        targets.map(async (item) => {
          if (!item.canDelete) {
            throw new Error(`你没有权限删除「${resolveDisplayName(item.displayName, item.originalName)}」`);
          }

          const response = await fetch(`/api/photos/${item.id}`, { method: "DELETE" });
          if (!response.ok) {
            const json = await response.json().catch(() => ({}));
            throw new Error(json.error ?? `删除「${item.originalName}」失败`);
          }
          return item.id;
        })
      );

      message.success(deleteAction.successMessage, {
        label: "撤销",
        onSelect: async () => {
          await Promise.all(
            results.map(async (photoId) => {
              const response = await fetch(`/api/photos/${photoId}/restore`, { method: "POST" });
              const json = await response.json().catch(() => ({}));
              if (!response.ok) {
                throw new Error(json.error ?? "撤销失败");
              }
            }),
          );
          setRefreshToken((current) => current + 1);
        },
      });
      setRefreshToken((current) => current + 1);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除重复媒体失败");
    } finally {
      setSavingGroup(null);
    }
  }

  if (loading) {
    return <div className="noir-glass-panel rounded-2xl p-6 text-[var(--muted)]">加载重复项...</div>;
  }

  if (error && groups.length === 0) {
    return <div className="rounded-2xl border border-red-400/30 bg-red-950/30 p-6 text-[var(--danger)]">{error}</div>;
  }

  if (groups.length === 0) {
    return <div className="noir-glass-panel rounded-2xl p-6 text-[var(--muted)]">暂时没有发现重复媒体</div>;
  }

  return (
    <div className="space-y-5">
      <div className="noir-glass-panel rounded-[2rem] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm text-[var(--muted)]">
              检测到 {groups.length} 组重复媒体，共 {duplicateCount} 项
            </p>
            <PhotoGallerySizeControl value={photoSize} onChange={setPhotoSize} compact />
          </div>
          <p className="text-xs text-[var(--muted)]">
            默认优先保留最早的文件，可自行改选后删除其余重复项。
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {groups.map((group) => {
          const keeperId = selection[group.checksum] ?? group.suggestedKeeperId;
          const keeper = group.items.find((item) => item.id === keeperId) ?? group.items[0];
          const keeperName = keeper ? resolveDisplayName(keeper.displayName, keeper.originalName) : "保留项";
          const saveBytes = keeper ? BigInt(group.totalSizeBytes) - BigInt(keeper.sizeBytes) : 0n;

          return (
            <section
              key={group.checksum}
              className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface-strong)]/80"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] p-4 sm:p-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-[var(--text)]">{group.items.length} 项重复媒体</h2>
                  <p className="text-xs text-[var(--muted)]">
                    可释放约 {formatBytes(saveBytes.toString())} · 总计 {formatBytes(group.totalSizeBytes)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteDuplicates(group)}
                  disabled={savingGroup === group.checksum}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--danger)] px-4 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {deleteAction.label}
                </button>
              </div>

              <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <GalleryGrid photoSize={photoSize}>
                  {group.items.map((item) => {
                    const resolvedName = resolveDisplayName(item.displayName, item.originalName);
                    const selected = keeperId === item.id;

                    return (
                      <label
                        key={item.id}
                        className={`cursor-pointer overflow-hidden rounded-2xl border transition ${
                          selected
                            ? "border-[var(--accent)] bg-white/[0.05]"
                            : "border-[var(--border)] bg-black/10 hover:border-[var(--border-strong)]"
                        }`}
                      >
                        <div className="relative">
                          <input
                            type="radio"
                            name={`keeper-${group.checksum}`}
                            checked={selected}
                            onChange={() =>
                              setSelection((current) => ({
                                ...current,
                                [group.checksum]: item.id,
                              }))
                            }
                            className="sr-only"
                          />
                          <ImageViewer
                            src={item.thumbnailUrl}
                            alt={resolvedName}
                            previewSrc={item.mediaType === "video" ? item.previewUrl : item.mimeType === "image/gif" ? item.originalUrl : item.previewUrl}
                            videoSrc={item.mediaType === "video" ? item.originalUrl : undefined}
                            mediaType={item.mediaType === "video" ? "video" : "image"}
                            items={buildMediaViewerNavigationItems(group.items)}
                            initialItemId={item.id}
                            className="group/img block w-full"
                            imgClassName="aspect-[4/3] w-full object-cover transition duration-300 group-hover/img:scale-[1.02]"
                          />
                          <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                            <span className="align-middle">保留</span>
                          </div>
                        </div>

                        <div className="space-y-2 p-4">
                          <div>
                            <h3 className="truncate text-sm font-semibold text-[var(--text)]">{resolvedName}</h3>
                            <p className="truncate text-xs text-[var(--muted)]">{item.albumName}</p>
                          </div>
                          <div className="space-y-1 text-xs text-[var(--muted)]">
                            <p>拍摄/上传：{formatMoment(item.takenAt ?? item.uploadedAt)}</p>
                            <p>大小：{formatBytes(item.sizeBytes)} · {item.width} × {item.height}</p>
                            <p>{item.canDelete ? "可删除" : "无删除权限"}</p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </GalleryGrid>

                <aside className="rounded-2xl border border-[var(--border)] bg-black/10 p-4">
                  <p className="text-sm font-semibold text-[var(--text)]">当前保留项</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{keeperName}</p>
                  <div className="mt-4 space-y-2 text-xs text-[var(--muted)]">
                    <p>checksum: {group.checksum.slice(0, 12)}...</p>
                    <p>总大小：{formatBytes(group.totalSizeBytes)}</p>
                    <p>删除其余后预计可释放：{formatBytes(saveBytes.toString())}</p>
                    <p>{keeper?.canDelete ? "保留项可被当前用户操作" : "保留项本身无删除权限"}</p>
                  </div>
                </aside>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
