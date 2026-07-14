import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  buildPhotoGalleryCardMenuItems,
  PhotoGalleryCard,
} from "@/components/photos/photo-gallery-card";
import { Menu } from "@/components/ui/menu";
import { MessageProvider } from "@/components/ui/message";
import { getMediaDeleteActions } from "@/lib/photos/delete-actions";

describe("PhotoGalleryCard", () => {
  it("keeps photo actions visible on touch and exposes a click-triggered menu", () => {
    const html = renderToStaticMarkup(
      createElement(
        MessageProvider,
        null,
        createElement(PhotoGalleryCard, {
          albumId: "album-1",
          photo: {
            id: "photo-1",
            displayName: null,
            originalName: "family.jpg",
            thumbnailUrl: "/thumb.jpg",
            previewUrl: "/preview.jpg",
            originalUrl: "/api/files/originals/test.jpg",
            mimeType: "image/jpeg",
            mediaType: "image",
            duration: null,
            width: 1200,
            height: 900,
            takenAt: "2026-01-01T00:00:00.000Z",
            uploadedAt: "2026-01-01T00:00:00.000Z",
            isFavorited: false,
            canEditName: true,
            locationHidden: false,
          },
          selected: false,
          waterfall: false,
          showTakenAt: false,
          onSelect: () => undefined,
          onFavorite: () => true,
          onDelete: () => undefined,
          onShare: () => undefined,
          onSetCover: () => undefined,
          onAddToAlbum: () => undefined,
          onEditTakenAt: () => undefined,
          onToggleLocationHidden: () => undefined,
        }),
      ),
    );

    expect(html).toContain("<img");
    expect(html).toContain("family");
    expect(html).not.toContain("family.jpg");
    expect(html).toContain("更多操作");
    expect(html).toContain("[@media(hover:hover)_and_(pointer:fine)]:opacity-0");
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("h-11 w-11");
    expect(html).toContain("更多操作");
    expect(html).not.toContain("1200 × 900");
  });

  it("renders a selection-first body when selection mode is active", () => {
    const html = renderToStaticMarkup(
      createElement(
        MessageProvider,
        null,
        createElement(PhotoGalleryCard, {
          albumId: "album-1",
          photo: {
            id: "photo-select",
            displayName: null,
            originalName: "select.jpg",
            thumbnailUrl: "/thumb-select.jpg",
            previewUrl: "/preview-select.jpg",
            originalUrl: "/api/files/originals/select.jpg",
            mimeType: "image/jpeg",
            mediaType: "image",
            duration: null,
            width: 1200,
            height: 900,
            takenAt: null,
            uploadedAt: "2026-01-01T00:00:00.000Z",
            isFavorited: false,
            canEditName: false,
            locationHidden: false,
          },
          selected: false,
          selectionMode: true,
          waterfall: false,
          showTakenAt: false,
          onSelect: () => undefined,
          onFavorite: () => true,
          onDelete: () => undefined,
          onShare: () => undefined,
          onSetCover: () => undefined,
          onAddToAlbum: () => undefined,
          onEditTakenAt: () => undefined,
          onToggleLocationHidden: () => undefined,
        }),
      ),
    );

    expect(html).toContain("点击选择");
    expect(html).not.toContain("点击查看原图");
    expect(html).toContain('role="button"');
  });

  it("renders the menu panel with menu semantics when open", () => {
    const html = renderToStaticMarkup(
      createElement(Menu, {
        label: "更多操作",
        triggerContent: "⋯",
        open: true,
        onOpenChange: () => undefined,
        items: [
          {
            key: "favorite",
            label: "收藏",
            icon: createElement("span", { "aria-hidden": true }, "★"),
            onSelect: () => undefined,
          },
          {
            key: "delete",
            label: "删除",
            icon: createElement("span", { "aria-hidden": true }, "×"),
            tone: "danger",
            onSelect: () => undefined,
          },
        ],
      }),
    );

    expect(html).toContain('role="menu"');
    expect(html).toContain('role="menuitem"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("收藏");
    expect(html).toContain("删除");
    expect(html).toContain("min-h-11");
  });

  it("filters menu items when permissions are unavailable", () => {
    const items = buildPhotoGalleryCardMenuItems({
      photo: {
        id: "photo-1",
        displayName: null,
        originalName: "family.jpg",
        thumbnailUrl: "/thumb.jpg",
        previewUrl: "/preview.jpg",
        originalUrl: "/api/files/originals/test.jpg",
        mimeType: "image/jpeg",
        mediaType: "image",
        duration: null,
        width: 1200,
        height: 900,
        takenAt: null,
        uploadedAt: "2026-01-01T00:00:00.000Z",
        isFavorited: false,
        canEditName: true,
        locationHidden: false,
      },
      favoriteLabel: "收藏",
      onFavorite: () => true,
      onShare: () => undefined,
      onEditTakenAt: () => undefined,
      onToggleLocationHidden: () => undefined,
      onAddToAlbum: () => undefined,
      onSetCover: () => undefined,
      onShowInfo: () => undefined,
      onDelete: () => undefined,
      canSetCover: false,
    });

    expect(items.map((item) => item.label)).not.toContain("设为封面");
    expect(items.map((item) => item.label)).toContain("收藏");
    expect(items.map((item) => item.label)).toContain("删除");
  });

  it("renders shared delete actions when the strategy returns multiple choices", () => {
    const items = buildPhotoGalleryCardMenuItems({
      photo: {
        id: "photo-delete",
        displayName: null,
        originalName: "family.jpg",
        thumbnailUrl: "/thumb.jpg",
        previewUrl: "/preview.jpg",
        originalUrl: "/api/files/originals/test.jpg",
        mimeType: "image/jpeg",
        mediaType: "image",
        duration: null,
        width: 1200,
        height: 900,
        takenAt: null,
        uploadedAt: "2026-01-01T00:00:00.000Z",
        isFavorited: false,
        canEditName: true,
        locationHidden: false,
      },
      favoriteLabel: "收藏",
      onFavorite: () => true,
      onShare: () => undefined,
      onEditTakenAt: () => undefined,
      onToggleLocationHidden: () => undefined,
      onAddToAlbum: () => undefined,
      onSetCover: () => undefined,
      onShowInfo: () => undefined,
      deleteActions: getMediaDeleteActions({
        scope: "album",
        albumIsDefault: false,
        isOwnMedia: true,
      }),
      onDeleteAction: () => undefined,
    });

    expect(items.map((item) => item.label)).toContain("移出相册");
    expect(items.map((item) => item.label)).toContain("移入回收站");
    expect(items.map((item) => item.label)).not.toContain("删除");
  });

  it("renders the selection control in blue when selected", () => {
    const html = renderToStaticMarkup(
      createElement(
        MessageProvider,
        null,
        createElement(PhotoGalleryCard, {
          albumId: "album-1",
          photo: {
            id: "photo-selected",
            displayName: null,
            originalName: "selected.jpg",
            thumbnailUrl: "/thumb-selected.jpg",
            previewUrl: "/preview-selected.jpg",
            originalUrl: "/api/files/originals/selected.jpg",
            mimeType: "image/jpeg",
            mediaType: "image",
            duration: null,
            width: 1600,
            height: 900,
            takenAt: null,
            uploadedAt: "2026-01-01T00:00:00.000Z",
            isFavorited: false,
            canEditName: false,
            locationHidden: false,
          },
          selected: true,
          waterfall: false,
          showTakenAt: false,
          onSelect: () => true,
          onFavorite: () => true,
          onDelete: () => undefined,
          onShare: () => undefined,
          onSetCover: () => undefined,
          onAddToAlbum: () => undefined,
          onEditTakenAt: () => undefined,
          onToggleLocationHidden: () => undefined,
        }),
      ),
    );

    expect(html).toContain("border-blue-500");
    expect(html).toContain("bg-blue-500");
    expect(html).toContain("text-white");
    expect(html).toContain("selected");
  });

  it("switches the media preview area into selection mode", () => {
    const html = renderToStaticMarkup(
      createElement(
        MessageProvider,
        null,
        createElement(PhotoGalleryCard, {
          albumId: "album-1",
          photo: {
            id: "photo-select",
            displayName: null,
            originalName: "select.jpg",
            thumbnailUrl: "/thumb-select.jpg",
            previewUrl: "/preview-select.jpg",
            originalUrl: "/api/files/originals/select.jpg",
            mimeType: "image/jpeg",
            mediaType: "image",
            duration: null,
            width: 1200,
            height: 900,
            takenAt: null,
            uploadedAt: "2026-01-01T00:00:00.000Z",
            isFavorited: false,
            canEditName: false,
            locationHidden: false,
          },
          selected: false,
          selectionMode: true,
          waterfall: false,
          showTakenAt: false,
          onSelect: () => true,
          onFavorite: () => true,
          onDelete: () => undefined,
          onShare: () => undefined,
          onSetCover: () => undefined,
          onAddToAlbum: () => undefined,
          onEditTakenAt: () => undefined,
          onToggleLocationHidden: () => undefined,
        }),
      ),
    );

    expect(html).toContain("点击选择");
    expect(html).toContain('aria-label="选择 select"');
  });

  it("shows a favorite badge in the bottom right when favorited", () => {
    const html = renderToStaticMarkup(
      createElement(
        MessageProvider,
        null,
        createElement(PhotoGalleryCard, {
          albumId: "album-1",
          photo: {
            id: "photo-fav",
            displayName: null,
            originalName: "favorite.jpg",
            thumbnailUrl: "/thumb-favorite.jpg",
            previewUrl: "/preview-favorite.jpg",
            originalUrl: "/api/files/originals/favorite.jpg",
            mimeType: "image/jpeg",
            mediaType: "image",
            duration: null,
            width: 1200,
            height: 800,
            takenAt: null,
            uploadedAt: "2026-01-01T00:00:00.000Z",
            isFavorited: true,
            canEditName: false,
            locationHidden: false,
          },
          selected: false,
          waterfall: false,
          showTakenAt: false,
          onSelect: () => true,
          onFavorite: () => true,
          onDelete: () => undefined,
          onShare: () => undefined,
          onSetCover: () => undefined,
          onAddToAlbum: () => undefined,
          onEditTakenAt: () => undefined,
          onToggleLocationHidden: () => undefined,
        }),
      ),
    );

    expect(html).toContain("已收藏");
    expect(html).toContain("bottom-3 right-3");
    expect(html).toContain("bg-blue-500/90");
  });

  it("uses the shared media preview trigger for videos", () => {
    const html = renderToStaticMarkup(
      createElement(
        MessageProvider,
        null,
        createElement(PhotoGalleryCard, {
          albumId: "album-1",
          photo: {
            id: "video-1",
            displayName: null,
            originalName: "clip.mp4",
            thumbnailUrl: "/thumb-video.jpg",
            previewUrl: "/preview-video.jpg",
            originalUrl: "/api/files/originals/clip.mp4",
            mimeType: "video/mp4",
            mediaType: "video",
            duration: 12,
            width: 1920,
            height: 1080,
            takenAt: null,
            uploadedAt: "2026-01-01T00:00:00.000Z",
            isFavorited: true,
            canEditName: false,
            locationHidden: false,
          },
          selected: false,
          waterfall: false,
          showTakenAt: false,
          navigableItems: [
            {
              id: "video-1",
              mediaType: "video",
              src: "/thumb-video.jpg",
              videoSrc: "/api/files/originals/clip.mp4",
              alt: "clip.mp4",
              title: "clip.mp4",
            },
          ],
          onSelect: () => undefined,
          onFavorite: () => true,
          onDelete: () => undefined,
          onShare: () => undefined,
          onSetCover: () => undefined,
          onAddToAlbum: () => undefined,
          onEditTakenAt: () => undefined,
          onToggleLocationHidden: () => undefined,
        }),
      ),
    );

    expect(html).toContain("点击播放视频");
    expect(html).toContain("/thumb-video.jpg");
    expect(html).toContain("更多操作");
    expect(html).not.toContain("<video");
  });

  it("shows child age when a birth date is provided", () => {
    const html = renderToStaticMarkup(
      createElement(
        MessageProvider,
        null,
        createElement(PhotoGalleryCard, {
          albumId: "album-child",
          photo: {
            id: "child-photo",
            displayName: null,
            originalName: "child.jpg",
            thumbnailUrl: "/thumb-child.jpg",
            previewUrl: "/preview-child.jpg",
            originalUrl: "/api/files/originals/child.jpg",
            mimeType: "image/jpeg",
            mediaType: "image",
            duration: null,
            width: 1200,
            height: 900,
            takenAt: "2026-03-15T00:00:00.000Z",
            uploadedAt: "2026-03-15T00:00:00.000Z",
            isFavorited: false,
            canEditName: false,
            locationHidden: false,
          },
          selected: false,
          waterfall: false,
          showTakenAt: false,
          childAgeLabel: "1岁2个月",
          onSelect: () => undefined,
          onFavorite: () => true,
          onDelete: () => undefined,
          onShare: () => undefined,
          onSetCover: () => undefined,
          onAddToAlbum: () => undefined,
          onEditTakenAt: () => undefined,
          onToggleLocationHidden: () => undefined,
        }),
      ),
    );

    expect(html).toContain("1岁2个月");
  });
});
