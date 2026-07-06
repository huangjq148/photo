import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AlbumManagementModal } from "@/components/albums/album-management-modal";

describe("AlbumManagementModal", () => {
  it("groups secondary album actions in a dialog", () => {
    const html = renderToStaticMarkup(
      createElement(AlbumManagementModal, {
        open: true,
        albumId: "album-1",
        album: {
          name: "家庭相册",
          description: "周末整理",
          isImmutable: false,
          role: "owner",
        },
        editName: "家庭相册",
        editDesc: "周末整理",
        saving: false,
        deleting: false,
        onEditNameChange: () => undefined,
        onEditDescChange: () => undefined,
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
    expect(html).toContain("成员");
    expect(html).toContain("添加成员");
    expect(html).toContain("删除相册");
  });
});
