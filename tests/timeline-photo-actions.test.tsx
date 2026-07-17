import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  buildTimelinePhotoActionItems,
  TimelinePhotoActions,
} from "@/components/photos/timeline-gallery";

describe("TimelinePhotoActions", () => {
  it("keeps timeline actions in the same top overlay positions as album photos", () => {
    const html = renderToStaticMarkup(
      createElement(TimelinePhotoActions, {
        photoName: "family.jpg",
        selected: false,
        onToggleSelection: vi.fn(),
        onDownload: vi.fn(),
        onEditTakenAt: vi.fn(),
        onAddToAlbum: vi.fn(),
      }),
    );

    expect(html).toContain('data-timeline-photo-actions=""');
    expect(html).toContain('data-photo-select-control=""');
    expect(html).toContain("absolute left-3 top-3");
    expect(html).toContain("opacity-100");
    expect(html).toContain("[@media(hover:hover)_and_(pointer:fine)]:opacity-0");
    expect(html).toContain("noir-glass-chip");
    expect(html).toContain("h-8 w-8");
    expect(html).toContain("sm:h-11 sm:w-11");
    expect(html).toContain("absolute right-3 top-3");
    expect(html).toContain("更多操作");
    expect(html).not.toContain("absolute inset-x-3 bottom-3");

    expect(
      buildTimelinePhotoActionItems({
        downloadHref: "/download",
        onDownload: vi.fn(),
        onEditTakenAt: vi.fn(),
        onAddToAlbum: vi.fn(),
      }).map((item) => item.label),
    ).toEqual(["下载", "修改时间", "添加到相册"]);
  });
});
