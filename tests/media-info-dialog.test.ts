import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MediaInfoDialog } from "@/components/photos/media-info-dialog";
import type { PhotoGalleryCardItem } from "@/components/photos/photo-gallery-card";

const basePhoto: PhotoGalleryCardItem = {
  id: "photo-1",
  displayName: "海滩照片",
  originalName: "DSC_0001.jpg",
  thumbnailUrl: "/thumb.jpg",
  previewUrl: "/preview.jpg",
  originalUrl: "/original.jpg",
  mimeType: "image/jpeg",
  mediaType: "image",
  duration: null,
  width: 1920,
  height: 1080,
  size: 2_500_000,
  albumCount: 3,
  takenAt: "2024-06-15T10:30:00.000Z",
  uploadedAt: "2024-06-16T14:20:00.000Z",
  isFavorited: true,
  canEditName: true,
  locationHidden: false,
};

describe("MediaInfoDialog", () => {
  it("renders display name, original filename, dimensions, format, file size", () => {
    const html = renderToStaticMarkup(
      createElement(MediaInfoDialog, {
        open: true,
        photo: basePhoto,
        onClose: () => undefined,
      }),
    );

    expect(html).toContain("海滩照片");
    expect(html).toContain("DSC_0001.jpg");
    expect(html).toContain("1920 × 1080");
    expect(html).toContain("JPEG");
    expect(html).toMatch(/2\.?4.*MB/);
  });

  it("shows taken time and upload time", () => {
    // Dates are stored as UTC; displayed in local time
    const html = renderToStaticMarkup(
      createElement(MediaInfoDialog, {
        open: true,
        photo: basePhoto,
        onClose: () => undefined,
      }),
    );

    // Verify the date format pattern exists (local timezone dependent)
    expect(html).toMatch(/\d{4}年\d{1,2}月\d{1,2}日 \d{2}:\d{2}/);
  });

  it("shows album count", () => {
    const html = renderToStaticMarkup(
      createElement(MediaInfoDialog, {
        open: true,
        photo: basePhoto,
        albumCount: 3,
        onClose: () => undefined,
      }),
    );

    expect(html).toContain("所在相册数");
    expect(html).toContain("3");
  });

  it("shows video duration for video files", () => {
    const html = renderToStaticMarkup(
      createElement(MediaInfoDialog, {
        open: true,
        photo: { ...basePhoto, mediaType: "video", mimeType: "video/mp4", duration: 125 },
        onClose: () => undefined,
      }),
    );

    expect(html).toContain("2:05");
  });

  it("shows location hidden status when applicable", () => {
    const html = renderToStaticMarkup(
      createElement(MediaInfoDialog, {
        open: true,
        photo: { ...basePhoto, locationHidden: true },
        onClose: () => undefined,
      }),
    );

    expect(html).toContain("已隐藏");
  });

  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      createElement(MediaInfoDialog, {
        open: false,
        photo: basePhoto,
        onClose: () => undefined,
      }),
    );

    expect(html).toBe("");
  });

  it("renders with dialog role and close button", () => {
    const html = renderToStaticMarkup(
      createElement(MediaInfoDialog, {
        open: true,
        photo: basePhoto,
        onClose: () => undefined,
      }),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("关闭");
  });

  it("shows thumbnail image", () => {
    const html = renderToStaticMarkup(
      createElement(MediaInfoDialog, {
        open: true,
        photo: basePhoto,
        onClose: () => undefined,
      }),
    );

    expect(html).toContain("/thumb.jpg");
    expect(html).toContain('<img');
  });
});
