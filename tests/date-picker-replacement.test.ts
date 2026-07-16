import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const TARGET_FILES = [
  "/Users/zyq/project/photo/components/photos/map-gallery.tsx",
  "/Users/zyq/project/photo/components/photos/gallery-toolbar.tsx",
];

describe("date picker replacement", () => {
  it("removes native date inputs from gallery filters", () => {
    for (const filePath of TARGET_FILES) {
      const source = readFileSync(filePath, "utf8");
      expect(source).not.toContain('type="date"');
      expect(source).not.toContain("type='date'");
      expect(source).toContain("DatePicker");
    }
  });
});
