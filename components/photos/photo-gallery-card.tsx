"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  CalendarClock,
  Check,
  Ellipsis,
  FolderPlus,
  Heart,
  Info,
  MapPinned,
  Share2,
  Trash2,
} from "lucide-react";
import ImageViewer, { type ImageViewerNavigationItem } from "@/components/ui/image-viewer";
import { useMessage } from "@/components/ui/message";
import { Menu } from "@/components/ui/menu";
import {
  getCodePointLength,
  getOriginalNameWithoutExtension,
  normalizeDisplayName,
  resolveDisplayName,
} from "@/lib/media/display-name";

export type PhotoGalleryCardItem = {
  id: string;
  displayName: string | null;
  originalName: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  mimeType: string;
  mediaType: string;
  duration: number | null;
  width: number;
  height: number;
  takenAt: string | null;
  uploadedAt: string;
  isFavorited: boolean;
  canEditName: boolean;
  locationHidden: boolean;
};

type PhotoGalleryCardProps = {
  albumId: string;
  photo: PhotoGalleryCardItem;
  selected: boolean;
  waterfall: boolean;
  showTakenAt: boolean;
  navigableItems?: ImageViewerNavigationItem[];
  onSelect: () => void;
  onFavorite: () => Promise<boolean> | boolean;
  onDelete: () => void;
  onShare: () => void;
  onSetCover?: () => void;
  onAddToAlbum: () => void;
  onEditTakenAt: () => void;
  onToggleLocationHidden: () => void;
  childAgeLabel?: string | null;
  onDisplayNameChange?: (photoId: string, displayName: string | null) => void;
  onRemove?: (photoId: string) => void;
};

type PhotoGalleryCardMenuItem = {
  key: string;
  label: string;
  danger?: boolean;
  className?: string;
  visible: boolean;
  onSelect: () => Promise<void> | void;
  icon: React.ReactNode;
};

const MAX_DISPLAY_NAME_LENGTH = 100;

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours().toString().padStart(2, "0");
  const minute = d.getMinutes().toString().padStart(2, "0");
  return `${month}月${day}日 ${hour}:${minute}`;
}

export function buildPhotoGalleryCardMenuItems({
  photo,
  favoriteLabel,
  onFavorite,
  onShare,
  onEditTakenAt,
  onToggleLocationHidden,
  onAddToAlbum,
  onSetCover,
  onShowInfo,
  onDelete,
  canShare = true,
  canEditTakenAt = true,
  canToggleLocationHidden = true,
  canAddToAlbum = true,
  canSetCover = true,
  canShowInfo = true,
  canDelete = true,
}: {
  photo: PhotoGalleryCardItem;
  favoriteLabel: string;
  onFavorite: () => Promise<boolean> | boolean;
  onShare: () => void;
  onEditTakenAt: () => void;
  onToggleLocationHidden: () => void;
  onAddToAlbum: () => void;
  onSetCover?: () => void;
  onShowInfo: () => void;
  onDelete: () => void;
  canShare?: boolean;
  canEditTakenAt?: boolean;
  canToggleLocationHidden?: boolean;
  canAddToAlbum?: boolean;
  canSetCover?: boolean;
  canShowInfo?: boolean;
  canDelete?: boolean;
}): PhotoGalleryCardMenuItem[] {
  return [
    {
      key: "favorite",
      label: favoriteLabel,
      visible: true,
      icon: <Heart aria-hidden="true" size={15} />,
      onSelect: async () => {
        await onFavorite();
      },
    },
    {
      key: "share",
      label: "分享",
      visible: canShare,
      icon: <Share2 aria-hidden="true" size={15} />,
      onSelect: onShare,
    },
    {
      key: "edit-taken-at",
      label: "修改拍摄时间",
      visible: canEditTakenAt,
      icon: <CalendarClock aria-hidden="true" size={15} />,
      onSelect: onEditTakenAt,
    },
    {
      key: "toggle-location-hidden",
      label: photo.locationHidden ? "显示位置" : "隐藏位置",
      visible: canToggleLocationHidden,
      icon: <MapPinned aria-hidden="true" size={15} />,
      onSelect: onToggleLocationHidden,
    },
    {
      key: "add-to-album",
      label: "添加到相册",
      visible: canAddToAlbum,
      icon: <FolderPlus aria-hidden="true" size={15} />,
      onSelect: onAddToAlbum,
    },
    {
      key: "set-cover",
      label: "设为封面",
      visible: canSetCover && typeof onSetCover === "function",
      icon: <Bookmark aria-hidden="true" size={15} />,
      className: "text-[var(--film)]",
      onSelect: () => onSetCover?.(),
    },
    {
      key: "info",
      label: "媒体信息",
      visible: canShowInfo,
      icon: <Info aria-hidden="true" size={15} />,
      onSelect: onShowInfo,
    },
    {
      key: "delete",
      label: "删除",
      visible: canDelete,
      danger: true,
      icon: <Trash2 aria-hidden="true" size={15} />,
      onSelect: onDelete,
    },
  ].filter((item) => item.visible);
}

export function PhotoGalleryCard({
  albumId,
  photo,
  selected,
  waterfall,
  showTakenAt,
  navigableItems,
  onSelect,
  onFavorite,
  onDelete,
  onShare,
  onSetCover,
  onAddToAlbum,
  onEditTakenAt,
  onToggleLocationHidden,
  childAgeLabel,
  onDisplayNameChange,
  onRemove,
}: PhotoGalleryCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [favoriteState, setFavoriteState] = useState(photo.isFavorited);
  const [displayName, setDisplayName] = useState(photo.displayName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(photo.displayName ?? "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const message = useMessage();
  const isVideo = photo.mediaType === "video" || photo.mimeType.startsWith("video/");
  const isGif = photo.mimeType === "image/gif";
  const favoriteLabel = favoriteState ? "取消收藏" : "收藏";
  const resolvedName = resolveDisplayName(displayName, photo.originalName);
  const placeholderName = getOriginalNameWithoutExtension(photo.originalName);
  const isCustomName = !!normalizeDisplayName(displayName);
  const dateLabel =
    childAgeLabel || showTakenAt
      ? childAgeLabel
        ? showTakenAt
          ? `${childAgeLabel} · ${formatDateTime(photo.takenAt || photo.uploadedAt)}`
          : childAgeLabel
        : formatDateTime(photo.takenAt || photo.uploadedAt)
      : null;
  const menuItems = buildPhotoGalleryCardMenuItems({
    photo,
    favoriteLabel,
    onFavorite: async () => {
      const nextFavoriteState = !favoriteState;
      setFavoriteState(nextFavoriteState);

      const ok = await onFavorite();
      if (!ok) {
        setFavoriteState(!nextFavoriteState);
      }
      return ok;
    },
    onShare,
    onEditTakenAt,
    onToggleLocationHidden,
    onAddToAlbum,
    onSetCover,
    onShowInfo: () => setShowInfo(true),
    onDelete,
    canShare: typeof onShare === "function",
    canEditTakenAt: typeof onEditTakenAt === "function",
    canToggleLocationHidden: typeof onToggleLocationHidden === "function",
    canAddToAlbum: typeof onAddToAlbum === "function",
    canSetCover: typeof onSetCover === "function",
    canShowInfo: true,
    canDelete: typeof onDelete === "function",
  });

  useEffect(() => {
    setFavoriteState(photo.isFavorited);
  }, [photo.isFavorited]);

  useEffect(() => {
    if (!isEditingName) {
      setDisplayName(photo.displayName);
      setDraftName(photo.displayName ?? "");
      setNameError(null);
    }
  }, [photo.displayName, isEditingName]);

  useEffect(() => {
    if (isEditingName) {
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isEditingName]);

  function startEditing() {
    if (!photo.canEditName || isSavingName) {
      return;
    }

    setNameError(null);
    setDraftName(displayName ?? "");
    setIsEditingName(true);
  }

  function cancelEditing() {
    setIsEditingName(false);
    setIsComposing(false);
    setNameError(null);
    setDraftName(displayName ?? "");
  }

  async function commitDisplayName() {
    if (isSavingName) {
      return;
    }

    const nextValue = draftName.trim();
    const currentValue = normalizeDisplayName(displayName);

    if (nextValue === (currentValue ?? "")) {
      setIsEditingName(false);
      setNameError(null);
      setDraftName(displayName ?? "");
      return;
    }

    if (getCodePointLength(nextValue) > MAX_DISPLAY_NAME_LENGTH) {
      setNameError("名称最多 100 个字符");
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return;
    }

    setIsSavingName(true);
    setNameError(null);

    try {
      const response = await fetch(`/api/albums/${albumId}/photos/${photo.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: nextValue || null }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 403) {
          setIsEditingName(false);
          setDraftName(displayName ?? "");
          message.error("你没有权限编辑此名称");
          return;
        }

        if (response.status === 404) {
          setIsEditingName(false);
          setDraftName(displayName ?? "");
          onRemove?.(photo.id);
          message.error("该媒体已不存在");
          return;
        }

        throw new Error(json.error ?? "名称保存失败，请重试");
      }

      const updated = json.data as { displayName: string | null; originalName: string };
      setDisplayName(updated.displayName);
      onDisplayNameChange?.(photo.id, updated.displayName);
      setDraftName(updated.displayName ?? "");
      setIsEditingName(false);
      message.success(updated.displayName ? "名称已更新" : "名称已清除");
    } catch (error) {
      const text = error instanceof Error ? error.message : "名称保存失败，请重试";
      setNameError(text);
      message.error(text);
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } finally {
      setIsSavingName(false);
    }
  }

  return (
    <article
      className={`group relative mb-4 rounded-2xl noir-glass-panel transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] ${
        waterfall ? "break-inside-avoid" : ""
      }`}
    >
      <div className="overflow-hidden rounded-t-xl">
        <ImageViewer
          src={photo.thumbnailUrl}
          alt={resolvedName}
          {...(isVideo
            ? { videoSrc: photo.originalUrl, mediaType: "video" as const }
            : { previewSrc: isGif ? photo.originalUrl : photo.previewUrl })}
          items={navigableItems}
          initialItemId={photo.id}
          imgClassName="aspect-[4/3] w-full object-cover transition duration-300 group-hover/img:scale-[1.02]"
          className="group/img block w-full"
        />
      </div>

      <div className="border-t border-[var(--border)] px-4 py-3">
        {isEditingName ? (
          <div className="space-y-1.5">
            <label className="sr-only" htmlFor={`display-name-${photo.id}`}>
              编辑 {resolvedName} 的名称
            </label>
            <input
              ref={inputRef}
              id={`display-name-${photo.id}`}
              value={draftName}
              placeholder={displayName?.trim() ? "" : placeholderName}
              onChange={(event) => {
                setDraftName(event.target.value);
                if (nameError) {
                  setNameError(null);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelEditing();
                  return;
                }

                if (event.key === "Enter" && !isComposing) {
                  event.preventDefault();
                  void commitDisplayName();
                }
              }}
              onBlur={() => {
                void commitDisplayName();
              }}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              disabled={isSavingName}
              className="h-9 w-full rounded-md border border-[var(--border)] bg-black/25 px-2.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--film)] disabled:opacity-70"
            />
            {nameError ? (
              <p className="text-xs text-[var(--danger)]" role="alert">
                {nameError}
              </p>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditing}
            disabled={!photo.canEditName}
            aria-label={photo.canEditName ? `编辑 ${resolvedName} 的名称` : resolvedName}
            title={resolvedName}
            className={`min-w-0 text-left ${photo.canEditName ? "cursor-pointer" : "cursor-default"}`}
          >
            <p
              className={`text-sm font-semibold leading-5 ${
                isCustomName ? "text-[var(--text)]" : "text-[var(--muted)]"
              } max-sm:line-clamp-2 sm:truncate`}
            >
              {resolvedName}
            </p>
          </button>
        )}
        {dateLabel ? (
          <p className="mt-1 text-xs text-[var(--muted)]">{dateLabel}</p>
        ) : null}
      </div>

      {showInfo && (
        <div
          className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/92 via-black/68 to-black/26 p-4"
          onClick={() => setShowInfo(false)}
        >
          <div className="space-y-3 text-white">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.24em] text-white/48">名称</p>
              <p className="text-sm font-bold">{normalizeDisplayName(displayName) || "未命名"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.24em] text-white/48">原始文件名</p>
              <p className="text-sm font-medium text-white/84">{photo.originalName}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/70">
              <span>尺寸</span>
              <span>
                {photo.width} × {photo.height}
              </span>
              <span>格式</span>
              <span>{photo.mimeType}</span>
              {isVideo && photo.duration != null && photo.duration > 0 ? (
                <>
                  <span>时长</span>
                  <span>{formatDuration(photo.duration)}</span>
                </>
              ) : null}
              <span>上传时间</span>
              <span>{formatDateTime(photo.uploadedAt)}</span>
            </div>
          </div>
        </div>
      )}

      {photo.isFavorited && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-0 rounded-md bg-blue-500/90 px-2.5 py-1 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
          已收藏
        </div>
      )}

      {photo.locationHidden ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-0 rounded-md bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-black shadow-lg backdrop-blur-sm">
          位置已隐藏
        </div>
      ) : null}

      <div className="absolute left-3 top-3 z-20 opacity-100 transition [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:opacity-100">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSelect();
          }}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur transition ${
            selected ? "border-blue-500 bg-blue-500 text-white" : "noir-glass-chip text-[var(--text)]"
          }`}
          aria-pressed={selected}
          aria-label={`选择 ${resolvedName}`}
        >
          <Check aria-hidden="true" size={16} className={selected ? "opacity-100" : "opacity-45"} />
        </button>
      </div>

      <div className="absolute right-3 top-3 z-20 opacity-100 transition [@media(hover:hover)_and_(pointer:fine)]:pointer-events-none [@media(hover:hover)_and_(pointer:fine)]:opacity-0 group-hover:[@media(hover:hover)_and_(pointer:fine)]:pointer-events-auto group-hover:[@media(hover:hover)_and_(pointer:fine)]:opacity-100 group-focus-within:[@media(hover:hover)_and_(pointer:fine)]:pointer-events-auto group-focus-within:[@media(hover:hover)_and_(pointer:fine)]:opacity-100">
        <Menu
          label="更多操作"
          triggerContent={<Ellipsis aria-hidden="true" size={16} />}
          items={menuItems.map((item) => ({
            key: item.key,
            label: item.label,
            icon: item.icon,
            tone: item.danger ? "danger" : item.className ? "accent" : "default",
            onSelect: item.onSelect,
          }))}
        />
      </div>
    </article>
  );
}
