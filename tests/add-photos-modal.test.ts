import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AddPhotosModal } from "@/components/albums/add-photos-modal";
import { MessageProvider } from "@/components/ui/message";

describe("AddPhotosModal", () => {
  it("renders inside the shared dialog shell", () => {
    const html = renderToStaticMarkup(
      createElement(
        MessageProvider,
        null,
        createElement(AddPhotosModal, {
          albumId: "album-1",
          onClose: () => undefined,
          onAdded: () => undefined,
        }),
      ),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("从全部照片中添加");
    expect(html).toContain("选择要添加到当前相册的照片");
  });
});
