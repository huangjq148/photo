import { describe, expect, it, vi } from "vitest";
import { reserveStorageWithinLimit } from "@/lib/media/upload";

describe("storage reservation", () => {
  it("rejects when the conditional quota reservation no longer fits", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });

    await expect(
      reserveStorageWithinLimit(
        { user: { updateMany } },
        "user-1",
        100n,
        1_000n,
      ),
    ).rejects.toThrow("存储空间不足");

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", storage_used: { lte: 900n } },
      data: { storage_used: { increment: 100n } },
    });
  });
});
