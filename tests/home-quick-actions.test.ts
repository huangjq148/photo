import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeQuickActions } from "@/components/home/home-quick-actions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/upload/upload-provider", () => ({
  useUpload: () => ({
    openUpload: vi.fn(),
  }),
}));

describe("HomeQuickActions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("opens upload instead of navigating away from the home page", () => {
    const html = renderToStaticMarkup(createElement(HomeQuickActions));

    expect(html).toContain("上传照片");
    expect(html).toContain("新建相册");
    expect(html).not.toContain('href="/albums"');
  });
});
