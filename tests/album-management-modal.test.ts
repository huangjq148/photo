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
    expect(html).toContain("显示时间");
    expect(html).toContain("图片尺寸");
    expect(html).toContain("孩子相册");
    expect(html).toContain("孩子生日");
  });
});
