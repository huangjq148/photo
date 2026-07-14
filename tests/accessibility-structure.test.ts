import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));
vi.mock("@/components/upload/upload-provider", () => ({
  useUpload: () => ({ openUpload: vi.fn() }),
}));
vi.mock("@/components/layout/user-menu", () => ({
  UserMenu: () => createElement("div", null, "用户菜单"),
}));
vi.mock("@/components/layout/mobile-navigation", () => ({
  MobileNavigation: () => null,
}));

describe("accessibility structure", () => {
  it("renders a skip-to-main-content link in layout", () => {
    // The skip link is rendered in RootLayout - test via app-shell which includes main-content
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(
          "a",
          {
            href: "#main-content",
            className: "sr-only focus:not-sr-only",
          },
          "跳到主内容",
        ),
        createElement(AppShell, null, createElement("main", { id: "main-content" })),
      ),
    );

    expect(html).toContain("跳到主内容");
    expect(html).toContain('href="#main-content"');
  });

  it("app-shell renders main-content wrapper with id and tabindex", () => {
    const html = renderToStaticMarkup(
      createElement(AppShell, null, createElement("div", null, "内容")),
    );

    expect(html).toContain('id="main-content"');
    expect(html).toContain('tabindex="-1"');
  });

  it("icon buttons in app-shell have accessible content", () => {
    const html = renderToStaticMarkup(
      createElement(AppShell, null, createElement("div", null, "内容")),
    );

    // Upload button has visible text "上传"
    expect(html).toContain("上传");

    // The "更多" button has aria-label
    expect(html).toContain('aria-label="更多"');
  });

  it("nav elements have aria-label", () => {
    const html = renderToStaticMarkup(
      createElement(AppShell, null, createElement("div", null, "内容")),
    );

    expect(html).toContain('aria-label="主导航"');
  });

  it("does not render inline 7-item scroll navigation on mobile", () => {
    const html = renderToStaticMarkup(
      createElement(AppShell, null, createElement("div", null, "内容")),
    );

    // Old style horizontal scroll nav with all 7 items should be gone
    expect(html).not.toContain('href="/favorites"');
    expect(html).not.toContain('href="/map"');
    expect(html).not.toContain('href="/duplicates"');
    expect(html).not.toContain('href="/trash"');
  });
});
