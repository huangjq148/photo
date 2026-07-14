import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UploadDropzone, filterUploadFiles } from "@/components/upload/upload-dropzone";

describe("filterUploadFiles", () => {
  it("accepts supported images and videos and rejects unsupported files", () => {
    const file = new File(["x"], "photo.png", { type: "image/png" });
    const badFile = new File(["x"], "notes.txt", { type: "text/plain" });

    const result = filterUploadFiles([file, badFile]);

    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.name).toBe("photo.png");
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.reason).toContain("notes.txt");
  });
});

describe("UploadDropzone", () => {
  it("renders the primary drop target and helper text", () => {
    const html = renderToStaticMarkup(
      createElement(UploadDropzone, {
        disabled: false,
        errorMessage: "格式不支持",
        onFiles: () => undefined,
      }),
    );

    expect(html).toContain("拖入照片或视频，或点击选择图片/视频");
    expect(html).toContain("支持 JPG、PNG、WebP、GIF、MP4、WebM 和 MOV");
    expect(html).toContain("格式不支持");
    expect(html).toContain("选择文件");
  });
});
