import { describe, expect, it } from "vitest";
import { getImageViewerFitZoom } from "@/components/ui/image-viewer/zoom";

describe("getImageViewerFitZoom", () => {
  it("allows very tall images to shrink below manual zoom minimum so they fit on open", () => {
    expect(
      getImageViewerFitZoom({
        imageWidth: 3000,
        imageHeight: 12000,
        viewportWidth: 1200,
        viewportHeight: 900,
        padding: 64,
        chromeHeight: 96,
      }),
    ).toBeCloseTo(0.0563, 4);
  });
});
