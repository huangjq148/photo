// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AlbumManagementModal } from "@/components/albums/album-management-modal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AlbumManagementModal", () => {
  it("groups secondary album actions in a dialog", () => {
    const html = renderToStaticMarkup(
      createElement(AlbumManagementModal, {
        open: true,
        albumId: "album-1",
        currentUserId: "user-1",
        album: {
          name: "家庭相册",
          description: "周末整理",
          isImmutable: false,
          role: "owner",
          isChildAlbum: true,
          childBirthDate: "2024-01-01",
        },
        editName: "家庭相册",
        editDesc: "周末整理",
        editIsChildAlbum: true,
        editChildBirthDate: "2024-01-01",
        saving: false,
        deleting: false,
        formError: "保存失败，请稍后重试",
        showTakenAt: true,
        onToggleTakenAt: () => undefined,
        photoSize: "medium",
        onPhotoSizeChange: () => undefined,
        onEditNameChange: () => undefined,
        onEditDescChange: () => undefined,
        onEditIsChildAlbumChange: () => undefined,
        onEditChildBirthDateChange: () => undefined,
        onSave: () => undefined,
        onDelete: () => undefined,
        onRefresh: () => undefined,
        onClose: () => undefined,
      }),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("管理相册");
    expect(html).toContain("编辑资料");
    expect(html).toContain("上传照片");
    expect(html).toContain("成员管理");
    expect(html).toContain("删除相册");
    expect(html).toContain("保存失败，请稍后重试");
    expect(html).toContain("显示时间");
    expect(html).toContain("图片尺寸");
    expect(html).toContain("孩子相册");
    expect(html).toContain("孩子生日");
    expect(html).toContain("<form");
    expect(html).toContain('type="submit"');
  });

  it("shows save errors without hiding the current form state", () => {
    const html = renderToStaticMarkup(
      createElement(AlbumManagementModal, {
        open: true,
        albumId: "album-1",
        currentUserId: "user-1",
        album: {
          name: "家庭相册",
          description: "周末整理",
          isImmutable: false,
          role: "owner",
          isChildAlbum: true,
          childBirthDate: "2024-01-01",
        },
        editName: "家庭相册",
        editDesc: "周末整理",
        editIsChildAlbum: true,
        editChildBirthDate: "2024-01-01",
        saving: false,
        deleting: false,
        formError: "保存失败，请重试",
        showTakenAt: true,
        onToggleTakenAt: () => undefined,
        photoSize: "medium",
        onPhotoSizeChange: () => undefined,
        onEditNameChange: () => undefined,
        onEditDescChange: () => undefined,
        onEditIsChildAlbumChange: () => undefined,
        onEditChildBirthDateChange: () => undefined,
        onSave: () => undefined,
        onDelete: () => undefined,
        onRefresh: () => undefined,
        onClose: () => undefined,
      }),
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("保存失败，请重试");
    expect(html).toContain("家庭相册");
    expect(html).toContain("周末整理");
    expect(html).toContain("保存资料");
  });

  it("renders one details form and submits it exactly once", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onSave = vi.fn();

    act(() => {
      root.render(
        createElement(AlbumManagementModal, {
          open: true,
          albumId: "album-1",
          currentUserId: "user-1",
          album: {
            name: "家庭相册",
            description: "周末整理",
            isImmutable: false,
            role: "owner",
            isChildAlbum: false,
            childBirthDate: null,
          },
          editName: "家庭相册",
          editDesc: "周末整理",
          editIsChildAlbum: false,
          editChildBirthDate: "",
          saving: false,
          deleting: false,
          formError: null,
          showTakenAt: true,
          onToggleTakenAt: () => undefined,
          photoSize: "medium",
          onPhotoSizeChange: () => undefined,
          onEditNameChange: () => undefined,
          onEditDescChange: () => undefined,
          onEditIsChildAlbumChange: () => undefined,
          onEditChildBirthDateChange: () => undefined,
          onSave,
          onDelete: () => undefined,
          onRefresh: () => undefined,
          onClose: () => undefined,
        }),
      );
    });

    const forms = container.querySelectorAll("form");
    expect(forms).toHaveLength(1);

    act(() => {
      forms[0]?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(onSave).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    container.remove();
  });
});
