import { describe, expect, it } from "vitest";
import { canDismissBatchAddModal } from "@/components/albums/batch-add-photos-to-album-modal";

describe("BatchAddPhotosToAlbumModal", () => {
  it("prevents dismissal while a save is in flight", () => {
    expect(canDismissBatchAddModal("album-1")).toBe(false);
    expect(canDismissBatchAddModal(null)).toBe(true);
  });
});
