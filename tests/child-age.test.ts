import { describe, expect, it } from "vitest";
import { formatChildAgeLabel } from "@/lib/media/child-age";

describe("formatChildAgeLabel", () => {
  it("formats age in years and months", () => {
    expect(
      formatChildAgeLabel("2026-07-11T00:00:00.000Z", "2024-01-11T00:00:00.000Z")
    ).toBe("2岁6个月");
  });

  it("formats age in months for infants", () => {
    expect(
      formatChildAgeLabel("2024-03-15T00:00:00.000Z", "2024-01-01T00:00:00.000Z")
    ).toBe("2个月");
  });

  it("returns null when the photo predates birth", () => {
    expect(
      formatChildAgeLabel("2024-01-01T00:00:00.000Z", "2024-02-01T00:00:00.000Z")
    ).toBeNull();
  });
});
