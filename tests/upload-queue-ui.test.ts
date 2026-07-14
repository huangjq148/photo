import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UploadQueue, summarizeUploadQueue } from "@/components/upload/upload-queue";

function createItem(id: string, status: "queued" | "uploading" | "success" | "failed" | "cancelled", progress = 0.5) {
  return {
    id,
    albumId: "album-1",
    file: new File(["x"], `${id}.png`, { type: "image/png" }),
    fileKey: `${id}|1|1|image/png`,
    name: `${id}.png`,
    size: 1024,
    type: "image/png",
    previewUrl: `blob:${id}`,
    status,
    progress: { loaded: progress * 100, total: 100 },
    result: null,
    error: null,
  } as const;
}

describe("summarizeUploadQueue", () => {
  it("tracks total progress and failed counts", () => {
    const summary = summarizeUploadQueue([
      createItem("a", "uploading", 0.25),
      createItem("b", "failed", 1),
      createItem("c", "success", 1),
    ]);

    expect(summary.totalCount).toBe(3);
    expect(summary.uploadingCount).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.progressLabel).toContain("34%");
  });
});

describe("UploadQueue", () => {
  it("renders chinese queue statuses and retry-all action", () => {
    const html = renderToStaticMarkup(
      createElement(UploadQueue, {
        items: [createItem("a", "uploading", 0.25), createItem("b", "failed")],
        onRetryItem: () => undefined,
        onRetryAllFailed: () => undefined,
        onRemoveItem: () => undefined,
        onCancelItem: () => undefined,
      }),
    );

    expect(html).toContain("上传中");
    expect(html).toContain("失败");
    expect(html).toContain("重试全部失败");
    expect(html).toContain("a.png");
    expect(html).toContain("b.png");
  });
});
