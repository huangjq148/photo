import { describe, expect, it } from "vitest";
import {
  getImageViewerDragScrollPosition,
  getImageViewerResetState,
} from "@/components/ui/image-viewer/interactions";
import { getNextImageViewerZoom, clampImageViewerZoom, getImageViewerFitZoom, formatImageViewerZoomLabel } from "@/components/ui/image-viewer/zoom";
import { isImageMedia, isVideoMedia, buildMediaViewerNavigationItems } from "@/components/photos/image-viewer-navigation";
import { getFocusableElements, getNextFocusIndex } from "@/hooks/use-focus-trap";

function createDomFixture() {
  const dom = new (require("jsdom").JSDOM)(
    `<div id="container">
      <button>Click</button>
      <a href="#link">Link</a>
      <input type="text" />
      <button disabled>Disabled</button>
      <span tabindex="-1">Hidden</span>
    </div>`,
  );
  return dom.window.document.getElementById("container")!;
}

describe("image viewer keyboard shortcuts", () => {
  it("zoom in increases scale above 1", () => {
    const zoomed = getNextImageViewerZoom(1, -50); // scroll up = zoom in
    expect(zoomed).toBeGreaterThan(1);
  });

  it("zoom out decreases scale below 1", () => {
    const zoomed = getNextImageViewerZoom(1, 50); // scroll down = zoom out
    expect(zoomed).toBeLessThan(1);
  });

  it("zoom does not exceed maximum", () => {
    const zoomed = getNextImageViewerZoom(4.9, -50);
    expect(zoomed).toBeLessThanOrEqual(5);
  });

  it("zoom does not go below minimum", () => {
    const zoomed = getNextImageViewerZoom(0.02, 50);
    expect(zoomed).toBeGreaterThanOrEqual(0.01);
  });

  it("reset state returns zoom=1 and zero scroll", () => {
    const state = getImageViewerResetState();
    expect(state.zoom).toBe(1);
    expect(state.scrollLeft).toBe(0);
    expect(state.scrollTop).toBe(0);
  });
});

describe("image viewer drag interaction", () => {
  it("scrolls opposite to drag direction", () => {
    const result = getImageViewerDragScrollPosition({
      startScrollLeft: 100,
      startScrollTop: 50,
      deltaX: 20,
      deltaY: 10,
    });

    expect(result.scrollLeft).toBe(80); // 100 - 20
    expect(result.scrollTop).toBe(40); // 50 - 10
  });

  it("supports negative drag deltas", () => {
    const result = getImageViewerDragScrollPosition({
      startScrollLeft: 0,
      startScrollTop: 0,
      deltaX: -30,
      deltaY: -15,
    });

    expect(result.scrollLeft).toBe(30);
    expect(result.scrollTop).toBe(15);
  });
});

describe("image viewer fit zoom", () => {
  it("calculates fit zoom for image larger than viewport", () => {
    const zoom = getImageViewerFitZoom({
      imageWidth: 2000,
      imageHeight: 1000,
      viewportWidth: 800,
      viewportHeight: 600,
    });

    expect(zoom).toBeLessThan(1);
    expect(zoom).toBeGreaterThan(0);
  });

  it("clamps fit zoom at 1 for images smaller than viewport", () => {
    const zoom = getImageViewerFitZoom({
      imageWidth: 400,
      imageHeight: 300,
      viewportWidth: 800,
      viewportHeight: 600,
    });

    expect(zoom).toBe(1);
  });

  it("handles invalid input gracefully", () => {
    const zoom = getImageViewerFitZoom({
      imageWidth: 0,
      imageHeight: 0,
      viewportWidth: 0,
      viewportHeight: 0,
    });

    expect(zoom).toBe(1);
  });
});

describe("image viewer focus trap", () => {
  it("finds focusable elements in a container", () => {
    const container = createDomFixture();
    const focusables = getFocusableElements(container);

    expect(focusables.length).toBe(3); // button, a, input (not disabled button or tabindex=-1)
  });

  it("getNextFocusIndex wraps forward past the last element", () => {
    expect(getNextFocusIndex(2, false, 3)).toBe(0);
  });

  it("getNextFocusIndex wraps backward before the first element", () => {
    expect(getNextFocusIndex(0, true, 3)).toBe(2);
  });

  it("getNextFocusIndex handles zero-count gracefully", () => {
    expect(getNextFocusIndex(0, false, 0)).toBe(-1);
  });
});

describe("image viewer navigation", () => {
  it("isImageMedia identifies image types", () => {
    expect(isImageMedia({ mediaType: "image", mimeType: "image/jpeg" })).toBe(true);
    expect(isImageMedia({ mediaType: "video", mimeType: "video/mp4" })).toBe(false);
    expect(isImageMedia({ mediaType: "image", mimeType: "video/mp4" })).toBe(false);
  });

  it("isVideoMedia identifies video types", () => {
    expect(isVideoMedia({ mediaType: "video", mimeType: "video/mp4" })).toBe(true);
    expect(isVideoMedia({ mediaType: "image", mimeType: "video/mp4" })).toBe(true);
    expect(isVideoMedia({ mediaType: "image", mimeType: "image/jpeg" })).toBe(false);
  });

  it("buildMediaViewerNavigationItems creates items with correct media type", () => {
    const items = buildMediaViewerNavigationItems([
      { id: "1", thumbnailUrl: "/t1", previewUrl: "/p1", originalUrl: "/o1", originalName: "a.jpg", displayName: null, mimeType: "image/jpeg", mediaType: "image" },
      { id: "2", thumbnailUrl: "/t2", previewUrl: "/p2", originalUrl: "/o2", originalName: "b.mp4", displayName: null, mimeType: "video/mp4", mediaType: "video" },
    ]);

    expect(items.length).toBe(2);
    expect(items[0].mediaType).toBe("image");
    expect(items[0].previewSrc).toBe("/p1");
    expect(items[1].mediaType).toBe("video");
    expect(items[1].videoSrc).toBe("/o2");
  });
});

describe("clampImageViewerZoom", () => {
  it("clamps values within range", () => {
    expect(clampImageViewerZoom(3)).toBe(3);
    expect(clampImageViewerZoom(10)).toBe(5);
    expect(clampImageViewerZoom(0.001)).toBe(0.01);
    expect(clampImageViewerZoom(NaN)).toBe(1);
  });
});

describe("formatImageViewerZoomLabel", () => {
  it("formats zoom as percentage", () => {
    expect(formatImageViewerZoomLabel(1)).toBe("100%");
    expect(formatImageViewerZoomLabel(2.5)).toBe("250%");
    expect(formatImageViewerZoomLabel(0.5)).toBe("50%");
  });
});
