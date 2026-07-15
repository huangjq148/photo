import { describe, expect, it, vi } from "vitest";
import {
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
