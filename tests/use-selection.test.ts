import { describe, expect, it } from "vitest";
import { createSelectionController } from "@/hooks/use-selection";

describe("selection controller", () => {
  it("toggles ids and deduplicates batch selection", () => {
    const selection = createSelectionController();

    selection.toggle("photo-1");
    selection.selectMany(["photo-1", "photo-2", "photo-2"]);

    expect(Array.from(selection.getSelectedIds())).toEqual(["photo-1", "photo-2"]);

    selection.toggle("photo-1");
    expect(Array.from(selection.getSelectedIds())).toEqual(["photo-2"]);
  });

  it("retains only failed ids and clears everything else", () => {
    const selection = createSelectionController(["photo-1", "photo-2", "photo-3"]);

    selection.retainOnly(["photo-2", "photo-4"]);
    expect(Array.from(selection.getSelectedIds())).toEqual(["photo-2"]);

    selection.clear();
    expect(Array.from(selection.getSelectedIds())).toEqual([]);
  });
});
