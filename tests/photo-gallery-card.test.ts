import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PhotoGalleryCard } from "@/components/photos/photo-gallery-card";
import { MessageProvider } from "@/components/ui/message";

describe("PhotoGalleryCard", () => {
  it("shows the photo first and moves actions behind a hover menu", () => {
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
    expect(html).toContain("group-hover:opacity-100");
    expect(html).toContain("收藏");
    expect(html).toContain("添加到相册");
    expect(html).not.toContain("1200 × 900");
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
    expect(html).toContain("取消收藏");
    expect(html).toContain("添加到相册");
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
