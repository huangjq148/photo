import { describe, expect, it } from "vitest";
import { shouldConfirmDisableChildAlbum, validateChildBirthDate } from "@/lib/albums/child-album-rules";

describe("child album rules", () => {
  it("asks for confirmation when turning off child album mode", () => {
    expect(shouldConfirmDisableChildAlbum(true, false)).toBe(true);
    expect(shouldConfirmDisableChildAlbum(false, true)).toBe(false);
    expect(shouldConfirmDisableChildAlbum(true, true)).toBe(false);
  });

  it("requires a birth date when enabling child album mode", () => {
    expect(validateChildBirthDate(true, "")).toBe("请先填写孩子生日");
    expect(validateChildBirthDate(true, "2024-01-01")).toBeNull();
    expect(validateChildBirthDate(false, "")).toBeNull();
  });
});
