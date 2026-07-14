import { describe, expect, it } from "vitest";
import { getMediaDeleteActions } from "@/lib/photos/delete-actions";

describe("getMediaDeleteActions", () => {
  it("returns trash only for the default album", () => {
    expect(
      getMediaDeleteActions({
        scope: "album",
        albumIsDefault: true,
        isOwnMedia: true,
      }).map((action) => ({
        kind: action.kind,
        label: action.label,
        requiresConfirmation: action.requiresConfirmation,
      })),
    ).toEqual([
      {
        kind: "moveToTrash",
        label: "移入回收站",
        requiresConfirmation: false,
      },
    ]);
  });

  it("lets own media in a normal album be removed or trashed", () => {
    expect(
      getMediaDeleteActions({
        scope: "album",
        albumIsDefault: false,
        isOwnMedia: true,
      }).map((action) => ({
        kind: action.kind,
        label: action.label,
        requiresConfirmation: action.requiresConfirmation,
      })),
    ).toEqual([
      {
        kind: "removeFromAlbum",
        label: "移出相册",
        requiresConfirmation: false,
      },
      {
        kind: "moveToTrash",
        label: "移入回收站",
        requiresConfirmation: false,
      },
    ]);
  });

  it("limits other users' media in a normal album to removal only", () => {
    expect(
      getMediaDeleteActions({
        scope: "album",
        albumIsDefault: false,
        isOwnMedia: false,
      }).map((action) => ({
        kind: action.kind,
        label: action.label,
        requiresConfirmation: action.requiresConfirmation,
      })),
    ).toEqual([
      {
        kind: "removeFromAlbum",
        label: "移出相册",
        requiresConfirmation: false,
      },
    ]);
  });

  it("requires confirmation for permanent delete in the trash", () => {
    expect(
      getMediaDeleteActions({
        scope: "trash",
        albumIsDefault: false,
        isOwnMedia: true,
      }).map((action) => ({
        kind: action.kind,
        label: action.label,
        requiresConfirmation: action.requiresConfirmation,
      })),
    ).toEqual([
      {
        kind: "restoreFromTrash",
        label: "恢复",
        requiresConfirmation: false,
      },
      {
        kind: "permanentDelete",
        label: "永久删除",
        requiresConfirmation: true,
      },
    ]);
  });
});
