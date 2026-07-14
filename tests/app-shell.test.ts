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

import { AppShell } from "@/components/layout/app-shell";

describe("AppShell", () => {
  it("renders a desktop upload launcher in the top bar", () => {
    const html = renderToStaticMarkup(createElement(AppShell, null, createElement("main", null, "内容")));

    expect(html).toContain("上传");
    expect(html).toContain("用户菜单");
    expect(html).toContain("主导航");
  });
});
