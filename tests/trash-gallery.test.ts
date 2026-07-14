import { describe, expect, it } from "vitest";
import { applyTrashItemMutation } from "@/components/photos/trash-gallery";

describe("applyTrashItemMutation", () => {
  it("removes a trash entry after a successful action", () => {
    expect(
      applyTrashItemMutation(
        [
          { id: "a", originalName: "a.jpg", thumbnailUrl: "/a", mimeType: "image/jpeg", mediaType: "image", uploadedAt: "2026-01-01T00:00:00.000Z", deletedAt: null },
          { id: "b", originalName: "b.jpg", thumbnailUrl: "/b", mimeType: "image/jpeg", mediaType: "image", uploadedAt: "2026-01-01T00:00:00.000Z", deletedAt: null },
        ],
        "a",
        true,
      ).map((item) => item.id),
    ).toEqual(["b"]);
  });

  it("keeps the trash entry visible after a failed action", () => {
    expect(
      applyTrashItemMutation(
        [
          { id: "a", originalName: "a.jpg", thumbnailUrl: "/a", mimeType: "image/jpeg", mediaType: "image", uploadedAt: "2026-01-01T00:00:00.000Z", deletedAt: null },
          { id: "b", originalName: "b.jpg", thumbnailUrl: "/b", mimeType: "image/jpeg", mediaType: "image", uploadedAt: "2026-01-01T00:00:00.000Z", deletedAt: null },
        ],
        "a",
        false,
      ).map((item) => item.id),
    ).toEqual(["a", "b"]);
  });
});
