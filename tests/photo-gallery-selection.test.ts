import { describe, expect, it, vi } from "vitest";
import { retainOnlyFailedSelection } from "@/components/photos/photo-gallery";

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
});
