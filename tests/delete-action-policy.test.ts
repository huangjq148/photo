import { describe, expect, it } from "vitest";
import { getMediaDeleteActions } from "@/lib/media/delete-actions";

describe("getMediaDeleteActions", () => {
  it("routes default albums to trash and keeps undo", () => {
    const action = getMediaDeleteActions({ surface: "album", isDefaultAlbum: true });

    expect(action.kind).toBe("moveToTrash");
    expect(action.label).toBe("移入回收站");
    expect(action.undo).toBe(true);
    expect(action.confirm).toBe(false);
  });

  it("routes normal albums to remove-from-album", () => {
    const action = getMediaDeleteActions({ surface: "album" });

    expect(action.kind).toBe("removeFromAlbum");
    expect(action.label).toBe("从相册移除");
    expect(action.undo).toBe(true);
  });

  it("routes timeline and duplicate views to trash", () => {
    expect(getMediaDeleteActions({ surface: "timeline" }).kind).toBe("moveToTrash");
    expect(getMediaDeleteActions({ surface: "duplicate" }).kind).toBe("moveToTrash");
  });

  it("requires confirmation for trash permanent delete", () => {
    const action = getMediaDeleteActions({ surface: "trash" });

    expect(action.kind).toBe("permanentDelete");
    expect(action.confirm).toBe(true);
    expect(action.undo).toBe(false);
    expect(action.label).toBe("永久删除");
  });
});
