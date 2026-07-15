import { describe, expect, it, vi } from "vitest";
import {
  canMutateSelection,
  resolveBatchSelectionAfterResult,
  resolveGalleryPanelOpenState,
  resolveSelectionModeAfterQueryChange,
  retainOnlyFailedSelection,
  shouldExitSelectionMode,
} from "@/components/photos/photo-gallery";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => undefined }),
  usePathname: () => "/albums/album-1",
  useSearchParams: () => new URLSearchParams(),
}));

describe("photo gallery batch selection", () => {
  it("blocks selection mutations while a batch action is in flight", () => {
    expect(canMutateSelection(true)).toBe(false);
    expect(canMutateSelection(false)).toBe(true);
  });

  it("keeps only failed ids selected after a partial batch result", () => {
    expect(
      retainOnlyFailedSelection(["photo-1", "photo-2", "photo-3"], {
        succeededIds: ["photo-1", "photo-3"],
        failed: [{ id: "photo-2", code: "FORBIDDEN", message: "无权访问" }],
      }),
    ).toEqual(["photo-2"]);
  });

  it("exits selection mode after a fully successful batch", () => {
    expect(shouldExitSelectionMode({ selectedCount: 0, failedCount: 0 })).toBe(true);
  });

  it("keeps selection mode after a partial batch failure", () => {
    expect(shouldExitSelectionMode({ selectedCount: 2, failedCount: 1 })).toBe(false);
  });

  it("exits selection mode when no selected ids remain after a failed batch", () => {
    expect(shouldExitSelectionMode({ selectedCount: 0, failedCount: 1 })).toBe(true);
  });

  it("exits selection mode after a full batch success", () => {
    expect(
      resolveBatchSelectionAfterResult(["photo-1", "photo-2"], {
        succeededIds: ["photo-1", "photo-2"],
        failed: [],
      }),
    ).toEqual({ retainedIds: [], exitSelectionMode: true });
  });

  it("retains failed selected ids and keeps selection mode after a partial result", () => {
    expect(
      resolveBatchSelectionAfterResult(["photo-1", "photo-2"], {
        succeededIds: ["photo-1"],
        failed: [{ id: "photo-2", message: "失败" }],
      }),
    ).toEqual({ retainedIds: ["photo-2"], exitSelectionMode: false });
  });

  it("exits selection mode when failures contain no selected ids", () => {
    expect(
      resolveBatchSelectionAfterResult(["photo-1"], {
        succeededIds: [],
        failed: [{ id: "other-photo", message: "失败" }],
      }),
    ).toEqual({ retainedIds: [], exitSelectionMode: true });
  });
});

describe("photo gallery panel visibility", () => {
  it("toggles filters without applying a query transition", () => {
    expect(resolveGalleryPanelOpenState(false, "toggleFilters")).toBe(true);
    expect(resolveGalleryPanelOpenState(true, "toggleFilters")).toBe(false);
  });

  it("opens the panel deterministically for sort and group actions", () => {
    expect(resolveGalleryPanelOpenState(false, "showSort")).toBe(true);
    expect(resolveGalleryPanelOpenState(true, "showSort")).toBe(true);
    expect(resolveGalleryPanelOpenState(false, "showGroup")).toBe(true);
    expect(resolveGalleryPanelOpenState(true, "showGroup")).toBe(true);
  });
});

describe("photo gallery query changes", () => {
  it("does not exit when selection mode is inactive", () => {
    expect(
      resolveSelectionModeAfterQueryChange({
        selectionMode: false,
        selectedCount: 2,
        confirmed: false,
      }),
    ).toEqual({ proceed: true, exitSelectionMode: false });
  });

  it("exits an empty explicit selection mode without confirmation", () => {
    expect(
      resolveSelectionModeAfterQueryChange({
        selectionMode: true,
        selectedCount: 0,
        confirmed: false,
      }),
    ).toEqual({ proceed: true, exitSelectionMode: true });
  });

  it("preserves a populated selection when confirmation is declined", () => {
    expect(
      resolveSelectionModeAfterQueryChange({
        selectionMode: true,
        selectedCount: 2,
        confirmed: false,
      }),
    ).toEqual({ proceed: false, exitSelectionMode: false });
  });

  it("clears and exits a populated selection after confirmation", () => {
    expect(
      resolveSelectionModeAfterQueryChange({
        selectionMode: true,
        selectedCount: 2,
        confirmed: true,
      }),
    ).toEqual({ proceed: true, exitSelectionMode: true });
  });
});
