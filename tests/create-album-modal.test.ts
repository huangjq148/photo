import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CreateAlbumModal } from "@/components/albums/create-album-modal";

describe("CreateAlbumModal", () => {
  it("renders the create album form inside a dialog", () => {
    const html = renderToStaticMarkup(
      createElement(CreateAlbumModal, {
        open: true,
        name: "",
        description: "",
        creating: false,
        onNameChange: () => undefined,
        onDescriptionChange: () => undefined,
        onCreate: () => undefined,
        onClose: () => undefined,
      }),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("创建新相册");
    expect(html).toContain("相册名称");
    expect(html).toContain("相册描述（可选）");
    expect(html).toContain("创建");
  });
});
