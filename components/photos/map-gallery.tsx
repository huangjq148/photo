"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import ImageViewer from "@/components/ui/image-viewer";
import { useMessage } from "@/components/ui/message";
import { buildMediaViewerNavigationItems } from "@/components/photos/image-viewer-navigation";
import { resolveDisplayName } from "@/lib/media/display-name";
import { clusterMapPoints, type MapCluster, type MapMediaPoint } from "@/lib/media/map";

function formatDateLabel(isoString: string | null) {
  if (!isoString) return "未记录拍摄时间";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "未记录拍摄时间";
  return date.toLocaleString("zh-CN", { hour12: false });
}

function formatCoordinate(value: number) {
  return value.toFixed(4);
}

function getMarkerOffset(count: number) {
  if (count >= 10) return "h-14 w-14";
  if (count >= 5) return "h-12 w-12";
  return "h-10 w-10";
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function getPointDate(point: MapMediaPoint) {
  return new Date(point.takenAt ?? point.uploadedAt);
}

export function MapGallery() {
  const [points, setPoints] = useState<MapMediaPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [zoom, setZoom] = useState(1.15);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingLocationId, setSavingLocationId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [albumFilter, setAlbumFilter] = useState("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "image" | "video">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");
  const [takenFrom, setTakenFrom] = useState("");
  const [takenTo, setTakenTo] = useState("");
  const message = useMessage();

  const loadPoints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        includeHidden: String(includeHidden),
      });
      const response = await fetch(`/api/media/map?${params.toString()}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "加载地图数据失败");
      }

      const data = (json.data ?? []) as MapMediaPoint[];
      setPoints(data);
      setSelectedId((current) => {
        if (current && data.some((point) => point.id === current)) {
          return current;
        }
        return data[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载地图数据失败");
    } finally {
      setLoading(false);
    }
  }, [includeHidden]);

  useEffect(() => {
    void loadPoints();
  }, [loadPoints]);

  const albumOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const point of points) {
      map.set(point.albumId, point.albumName);
    }

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  }, [points]);

  const filteredPoints = useMemo(() => {
    const keyword = normalizeText(searchText);
    const fromTime = takenFrom ? new Date(`${takenFrom}T00:00:00`) : null;
    const toTime = takenTo ? new Date(`${takenTo}T23:59:59.999`) : null;

    return points.filter((point) => {
      if (albumFilter !== "all" && point.albumId !== albumFilter) {
        return false;
      }

      if (mediaTypeFilter !== "all" && point.mediaType !== mediaTypeFilter) {
        return false;
      }

      if (visibilityFilter === "visible" && point.locationHidden) {
        return false;
      }

      if (visibilityFilter === "hidden" && !point.locationHidden) {
        return false;
      }

      if (fromTime || toTime) {
        const date = getPointDate(point);
        if (fromTime && date < fromTime) {
          return false;
        }
        if (toTime && date > toTime) {
          return false;
        }
      }

      if (!keyword) {
        return true;
      }

      const haystack = [
        resolveDisplayName(point.displayName, point.originalName),
        point.originalName,
        point.albumName,
        formatCoordinate(point.latitude),
        formatCoordinate(point.longitude),
      ]
        .join(" ")
        .toLowerCase();

      return keyword
        .split(/\s+/)
        .filter(Boolean)
        .every((term) => haystack.includes(term));
    });
  }, [albumFilter, mediaTypeFilter, points, searchText, takenFrom, takenTo, visibilityFilter]);

  const selectedPoint = useMemo(
    () => filteredPoints.find((point) => point.id === selectedId) ?? null,
    [filteredPoints, selectedId]
  );
  const clusters = useMemo(() => clusterMapPoints(filteredPoints, zoom), [filteredPoints, zoom]);
  const selectedGroup = useMemo(() => {
    if (!selectedPoint) return null;
    return clusters.find((cluster) => cluster.items.some((item) => item.id === selectedPoint.id)) ?? null;
  }, [clusters, selectedPoint]);

  useEffect(() => {
    if (filteredPoints.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !filteredPoints.some((point) => point.id === selectedId)) {
      setSelectedId(filteredPoints[0]?.id ?? null);
    }
  }, [filteredPoints, selectedId]);

  async function toggleLocationVisibility(point: MapMediaPoint) {
    if (!point.canEditLocation) {
      message.error("你没有权限修改位置可见性");
      return;
    }

    setSavingLocationId(point.id);
    try {
      const response = await fetch(`/api/photos/${point.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationHidden: !point.locationHidden }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error ?? "保存位置可见性失败");
      }

      setPoints((current) =>
        current.map((item) =>
          item.id === point.id ? { ...item, locationHidden: !!json.data?.locationHidden } : item
        )
      );
      message.success(!point.locationHidden ? "位置已隐藏" : "位置已显示");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "保存位置可见性失败");
    } finally {
      setSavingLocationId(null);
    }
  }

  function renderCluster(cluster: MapCluster) {
    const isSelected = !!selectedPoint && cluster.items.some((item) => item.id === selectedPoint.id);
    const allHidden = cluster.items.every((item) => item.locationHidden);
    const markerSize = getMarkerOffset(cluster.count);

    return (
      <button
        key={cluster.key}
        type="button"
        onClick={() => {
          const firstItem = cluster.items[0];
          if (firstItem) {
            setSelectedId(firstItem.id);
          }
          setZoom((current) => Math.min(3.25, current + (cluster.count > 1 ? 0.35 : 0.15)));
        }}
        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border backdrop-blur-sm transition hover:scale-105 ${
          isSelected
            ? "border-[var(--accent)] bg-[var(--accent)] text-black"
            : cluster.count > 1
              ? "border-white/25 bg-white/10 text-white"
              : allHidden
                ? "border-amber-300/40 bg-amber-500/20 text-amber-100"
                : "border-cyan-300/40 bg-cyan-400/20 text-cyan-50"
        } ${markerSize}`}
        style={{
          left: `${((cluster.longitude + 180) / 360) * 100}%`,
          top: `${((90 - cluster.latitude) / 180) * 100}%`,
        }}
        aria-label={`${cluster.count} 个地点`}
      >
        <span className="flex h-full w-full items-center justify-center text-sm font-black">
          {cluster.count}
        </span>
      </button>
    );
  }

  if (loading) {
    return <div className="noir-glass-panel rounded-2xl p-6 text-[var(--muted)]">加载地图...</div>;
  }

  if (error && points.length === 0) {
    return <div className="rounded-2xl border border-red-400/30 bg-red-950/30 p-6 text-[var(--danger)]">{error}</div>;
  }

  const hasActiveFilters =
    searchText.trim() ||
    albumFilter !== "all" ||
    mediaTypeFilter !== "all" ||
    visibilityFilter !== "all" ||
    takenFrom ||
    takenTo;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
      <section className="space-y-4">
        <div className="noir-glass-panel rounded-[2rem] p-4 sm:p-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[var(--muted)]">
                  {filteredPoints.length} / {points.length} 个地点 ·{" "}
                  {includeHidden ? "包含已隐藏位置" : "已过滤隐藏位置"}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  点击标记查看细节，使用下面的筛选和搜索快速定位地点。
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)]">
                  <input
                    type="checkbox"
                    checked={includeHidden}
                    onChange={(event) => setIncludeHidden(event.target.checked)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  包含已隐藏位置
                </label>
                <button
                  type="button"
                  onClick={() => setZoom((current) => Math.min(3.25, current + 0.35))}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
                >
                  放大
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((current) => Math.max(1, current - 0.35))}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
                >
                  缩小
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1.15)}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-black"
                >
                  重置
                </button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="搜索地点、文件名、相册名或坐标"
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={albumFilter}
                  onChange={(event) => setAlbumFilter(event.target.value)}
                  className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                >
                  <option value="all">全部相册</option>
                  {albumOptions.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.name}
                    </option>
                  ))}
                </select>
                <select
                  value={mediaTypeFilter}
                  onChange={(event) => setMediaTypeFilter(event.target.value as typeof mediaTypeFilter)}
                  className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                >
                  <option value="all">全部媒体</option>
                  <option value="image">仅图片</option>
                  <option value="video">仅视频</option>
                </select>
                <select
                  value={visibilityFilter}
                  onChange={(event) => setVisibilityFilter(event.target.value as typeof visibilityFilter)}
                  className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                >
                  <option value="all">全部位置状态</option>
                  <option value="visible">仅位置可见</option>
                  <option value="hidden">仅位置隐藏</option>
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={takenFrom}
                    onChange={(event) => setTakenFrom(event.target.value)}
                    className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                  />
                  <input
                    type="date"
                    value={takenTo}
                    onChange={(event) => setTakenTo(event.target.value)}
                    className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchText("");
                  setAlbumFilter("all");
                  setMediaTypeFilter("all");
                  setVisibilityFilter("all");
                  setTakenFrom("");
                  setTakenTo("");
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
              >
                清除筛选
              </button>
              {hasActiveFilters ? <span className="text-xs text-[var(--muted)]">当前筛选已生效</span> : null}
            </div>
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[#08111f] shadow-2xl"
          style={{
            aspectRatio: "2 / 1",
            backgroundImage: [
              "linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px)",
              "linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)",
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 24%)",
              "radial-gradient(circle at 80% 30%, rgba(107,220,255,0.14), transparent 18%)",
              "radial-gradient(circle at 50% 75%, rgba(255,180,80,0.12), transparent 16%)",
            ].join(", "),
            backgroundSize: `${Math.max(22, Math.round(32 / zoom))}px ${Math.max(22, Math.round(32 / zoom))}px`,
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,17,31,0.06),rgba(8,17,31,0.5))]" />
          {filteredPoints.length > 0 ? (
            <div className="absolute inset-0">{clusters.map((cluster) => renderCluster(cluster))}</div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/70">
              <div className="max-w-md space-y-3">
                <p className="text-lg font-bold text-white">暂无匹配的地点</p>
                <p>可以切换“包含已隐藏位置”，或者清除筛选后重新查看全部地点。</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="noir-glass-panel rounded-[2rem] p-4 sm:p-5">
          <div className="space-y-2">
            <p className="text-sm text-[var(--muted)]">当前选中</p>
            <h2 className="text-lg font-bold text-[var(--text)]">
              {selectedPoint ? resolveDisplayName(selectedPoint.displayName, selectedPoint.originalName) : "未选择"}
            </h2>
            {selectedGroup ? (
              <p className="text-xs text-[var(--muted)]">
                该地点包含 {selectedGroup.count} 项媒体 · 经纬度 {formatCoordinate(selectedGroup.latitude)},{" "}
                {formatCoordinate(selectedGroup.longitude)}
              </p>
            ) : null}
          </div>
        </div>

        {selectedPoint ? (
          <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface-strong)]/80">
            <ImageViewer
              src={selectedPoint.thumbnailUrl}
              alt={resolveDisplayName(selectedPoint.displayName, selectedPoint.originalName)}
              previewSrc={
                selectedPoint.mediaType === "video"
                  ? selectedPoint.previewUrl
                  : selectedPoint.mimeType === "image/gif"
                    ? selectedPoint.originalUrl
                    : selectedPoint.previewUrl
              }
              videoSrc={selectedPoint.mediaType === "video" ? selectedPoint.originalUrl : undefined}
              mediaType={selectedPoint.mediaType === "video" ? "video" : "image"}
              items={buildMediaViewerNavigationItems([selectedPoint])}
              initialItemId={selectedPoint.id}
              className="group/img block w-full"
              imgClassName="aspect-[4/3] w-full object-cover transition duration-300 group-hover/img:scale-[1.02]"
            />
            <div className="space-y-3 p-4">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">
                  {resolveDisplayName(selectedPoint.displayName, selectedPoint.originalName)}
                </p>
                <p className="text-xs text-[var(--muted)]">{selectedPoint.albumName}</p>
              </div>

              <div className="space-y-1 text-xs text-[var(--muted)]">
                <p>
                  坐标：{formatCoordinate(selectedPoint.latitude)}, {formatCoordinate(selectedPoint.longitude)}
                </p>
                <p>拍摄/上传：{formatDateLabel(selectedPoint.takenAt ?? selectedPoint.uploadedAt)}</p>
                <p>{selectedPoint.locationHidden ? "位置已隐藏" : "位置可见"}</p>
                <p>{selectedPoint.isFavorited ? "已收藏" : "未收藏"}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`/api/photos/${selectedPoint.id}/download`}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-bold text-[var(--text)]"
                >
                  下载
                </a>
                <button
                  type="button"
                  onClick={() => void toggleLocationVisibility(selectedPoint)}
                  disabled={savingLocationId === selectedPoint.id || !selectedPoint.canEditLocation}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingLocationId === selectedPoint.id
                    ? "保存中..."
                    : selectedPoint.locationHidden
                      ? "显示位置"
                      : "隐藏位置"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="noir-glass-panel rounded-[2rem] p-6 text-sm text-[var(--muted)]">
            点击地图上的标记查看媒体信息。
          </div>
        )}

        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface-strong)]/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--text)]">地点列表</p>
            <p className="text-xs text-[var(--muted)]">按当前筛选和缩放自动聚合</p>
          </div>
          <div className="mt-4 space-y-3">
            {clusters.length > 0 ? (
              clusters.map((cluster) => {
                const first = cluster.items[0];
                if (!first) return null;

                return (
                  <button
                    key={cluster.key}
                    type="button"
                    onClick={() => setSelectedId(first.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      selectedPoint?.id === first.id
                        ? "border-[var(--accent)] bg-white/[0.06]"
                        : "border-[var(--border)] bg-black/10 hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-16 w-16 overflow-hidden rounded-xl border border-[var(--border)] bg-black/30">
                        <img
                          src={first.thumbnailUrl}
                          alt={resolveDisplayName(first.displayName, first.originalName)}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--text)]">
                          {resolveDisplayName(first.displayName, first.originalName)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{first.albumName}</p>
                        <p className="mt-2 text-xs text-[var(--muted)]">
                          {cluster.count} 项 · {formatCoordinate(cluster.latitude)}, {formatCoordinate(cluster.longitude)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-1 text-xs font-semibold ${
                          cluster.items.every((item) => item.locationHidden)
                            ? "bg-amber-500/20 text-amber-100"
                            : "bg-cyan-400/20 text-cyan-50"
                        }`}
                      >
                        {cluster.items.every((item) => item.locationHidden) ? "隐藏" : "可见"}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-[var(--border)] bg-black/10 p-4 text-sm text-[var(--muted)]">
                当前筛选下没有匹配的地点。
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
