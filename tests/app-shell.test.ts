import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/albums",
}));

vi.mock("@/components/upload/upload-provider", () => ({
  useUpload: () => ({
    openUpload: vi.fn(),
  }),
}));

vi.mock("@/components/layout/user-menu", () => ({
  UserMenu: () => createElement("div", null, "用户菜单"),
}));

vi.mock("@/components/layout/mobile-navigation", () => ({
  MobileNavigation: () => createElement("nav", { "aria-label": "底部导航" }, "移动导航"),
}));

import { AppShell } from "@/components/layout/app-shell";

describe("AppShell", () => {
  it("renders a desktop upload launcher in the top bar", () => {
    const html = renderToStaticMarkup(createElement(AppShell, null, createElement("main", null, "内容")));

    expect(html).toContain("上传");
    expect(html).toContain("用户菜单");
    expect(html).toContain("主导航");
  });

  it("renders main nav items: 相册, 时间线, 回忆", () => {
    const html = renderToStaticMarkup(createElement(AppShell, null, createElement("main", null, "内容")));

    expect(html).toContain("相册");
    expect(html).toContain("时间线");
    expect(html).toContain("回忆");
  });

  it("renders a 更多 dropdown trigger button with aria-haspopup", () => {
    const html = renderToStaticMarkup(createElement(AppShell, null, createElement("main", null, "内容")));

    expect(html).toContain("更多");
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
  });

  it("renders mobile bottom navigation", () => {
    const html = renderToStaticMarkup(createElement(AppShell, null, createElement("main", null, "内容")));

    expect(html).toContain("移动导航");
    expect(html).toContain('aria-label="底部导航"');
  });

  it("no longer renders inline 7-item horizontal scroll navigation", () => {
    const html = renderToStaticMarkup(createElement(AppShell, null, createElement("main", null, "内容")));

    // Old style: 7 items in a horizontal scroll nav - replaced by 3 main + dropdown
    // Verify the desktop nav doesn't overflow with all 7 items inline
    expect(html).not.toContain('href="/favorites"');
    expect(html).not.toContain('href="/map"');
    expect(html).not.toContain('href="/duplicates"');
    expect(html).not.toContain('href="/trash"');
  });
});
