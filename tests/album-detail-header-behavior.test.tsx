// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlbumDetailHeader } from "@/components/albums/album-detail-header";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mountedRoots: Root[] = [];

function renderHeader(onManage = vi.fn(), onShare = vi.fn()) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  act(() => {
    root.render(
      <AlbumDetailHeader
        album={{
          name: "家庭相册",
          description: "周末整理",
          isDefault: false,
          photoCount: 18,
          memberCount: 3,
          role: "owner",
        }}
        onUploadNew={() => undefined}
        onAddFromAllPhotos={() => undefined}
        onManage={onManage}
        onShare={onShare}
      />,
    );
  });

  return { container, onManage, onShare };
}

afterEach(() => {
  act(() => {
    mountedRoots.splice(0).forEach((root) => root.unmount());
  });
  document.body.innerHTML = "";
});

describe("AlbumDetailHeader mobile action menu", () => {
  it("opens a compact mobile info popover from the icon trigger", () => {
    renderHeader();

    const trigger = document.body.querySelector(
      'button[aria-label="相册信息"]',
    ) as HTMLButtonElement;

    act(() => {
      trigger.click();
    });

    const popup = document.body.querySelector('[role="menu"]') as HTMLElement;
    expect(popup).not.toBeNull();
    expect(popup.textContent).toContain("18 张照片");
    expect(popup.textContent).toContain("3 位成员");
    expect(popup.textContent).toContain("周末整理");
  });

  it.each([
    ["管理相册", "manage"],
    ["公开分享", "share"],
  ] as const)("renders the actual %s menu item and invokes its callback", (label, action) => {
    const { container, onManage, onShare } = renderHeader();
    const trigger = container.querySelector(
      'button[aria-label="更多相册操作"]',
    ) as HTMLButtonElement;

    act(() => {
      trigger.click();
    });

    const menuItems = Array.from(document.body.querySelectorAll('[role="menuitem"]'));
    expect(menuItems.map((item) => item.textContent)).toEqual(["管理相册", "公开分享"]);

    const target = menuItems.find((item) => item.textContent === label) as HTMLButtonElement;
    act(() => {
      target.click();
    });

    expect(onManage).toHaveBeenCalledTimes(action === "manage" ? 1 : 0);
    expect(onShare).toHaveBeenCalledTimes(action === "share" ? 1 : 0);
    expect(trigger.textContent).toBe("");
  });
});
