import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("taken-at editor modal date time picker", () => {
  it("replaces the native datetime-local input", () => {
    const modalSource = readFileSync(
      "/Users/zyq/project/photo/components/photos/taken-at-editor-modal.tsx",
      "utf8",
    );
    const pickerSource = readFileSync(
      "/Users/zyq/project/photo/components/ui/date-time-picker.tsx",
      "utf8",
    );

    expect(modalSource).not.toContain('type="datetime-local"');
    expect(modalSource).not.toContain("type='datetime-local'");
    expect(modalSource).toContain("DateTimePicker");
    expect(pickerSource).toContain("needConfirm={false}");
    expect(pickerSource).toContain("photo-date-time-picker-popup");
    expect(
      readFileSync("/Users/zyq/project/photo/app/globals.css", "utf8"),
    ).toContain(".photo-date-time-picker-popup .rc-picker-time-panel-column > li .rc-picker-time-panel-cell-inner");
    expect(
      readFileSync("/Users/zyq/project/photo/app/globals.css", "utf8"),
    ).toContain(".photo-date-time-picker-popup .rc-picker-time-panel-column {\n  color: rgba(244, 240, 232, 0.9);\n  overflow-y: auto;");
    expect(
      readFileSync("/Users/zyq/project/photo/app/globals.css", "utf8"),
    ).toContain("overscroll-behavior: contain");
  });
});
