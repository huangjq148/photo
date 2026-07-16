import { describe, expect, it } from "vitest";
import {
  applyTrashItemMutation,
  claimTrashItemReconciliation,
  createTrailingRefreshController,
  runTrashItemAction,
} from "@/components/photos/trash-gallery";

describe("applyTrashItemMutation", () => {
  it("removes a trash entry after a successful action", () => {
    expect(
      applyTrashItemMutation(
        [
          { id: "a", originalName: "a.jpg", thumbnailUrl: "/a", mimeType: "image/jpeg", mediaType: "image", uploadedAt: "2026-01-01T00:00:00.000Z", deletedAt: null },
          { id: "b", originalName: "b.jpg", thumbnailUrl: "/b", mimeType: "image/jpeg", mediaType: "image", uploadedAt: "2026-01-01T00:00:00.000Z", deletedAt: null },
        ],
        "a",
        true,
      ).map((item) => item.id),
    ).toEqual(["b"]);
  });

  it("keeps the trash entry visible after a failed action", () => {
    const items = [
      { id: "a", originalName: "a.jpg", thumbnailUrl: "/a", mimeType: "image/jpeg", mediaType: "image", uploadedAt: "2026-01-01T00:00:00.000Z", deletedAt: null },
      { id: "b", originalName: "b.jpg", thumbnailUrl: "/b", mimeType: "image/jpeg", mediaType: "image", uploadedAt: "2026-01-01T00:00:00.000Z", deletedAt: null },
    ];

    const result = applyTrashItemMutation(items, "a", false);

    expect(result).toBe(items);
    expect(result.map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("runTrashItemAction", () => {
  it("replaces a stale notice and releases pending state after a request failure", async () => {
    const pendingActions = new Map();
    const pendingSnapshots: string[][] = [];
    let notice: string | null = "已恢复 1 张照片";
    let successCount = 0;

    const result = await runTrashItemAction({
      pendingActions,
      photoId: "a",
      action: "restore",
      request: async () => {
        throw new Error("网络连接失败");
      },
      onStart: () => {
        notice = null;
      },
      onSuccess: () => {
        successCount += 1;
      },
      onFailure: (error) => {
        notice = error instanceof Error ? error.message : "恢复失败";
      },
      onPendingChange: (current) => {
        pendingSnapshots.push([...current.keys()]);
      },
    });

    expect(result).toBe("failure");
    expect(notice).toBe("网络连接失败");
    expect(successCount).toBe(0);
    expect(pendingSnapshots).toEqual([["a"], []]);
    expect(pendingActions.size).toBe(0);
  });

  it("atomically skips a second action for the same pending item", async () => {
    const pendingActions = new Map();
    let requestCount = 0;
    let releaseRequest: (() => void) | undefined;
    const requestGate = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    const options = {
      pendingActions,
      photoId: "a",
      action: "delete" as const,
      request: async () => {
        requestCount += 1;
        await requestGate;
      },
      onSuccess: () => undefined,
      onFailure: () => undefined,
      onPendingChange: () => undefined,
    };

    const firstAction = runTrashItemAction(options);
    const secondResult = await runTrashItemAction(options);

    expect(secondResult).toBe("skipped");
    expect(requestCount).toBe(1);

    releaseRequest?.();
    await expect(firstAction).resolves.toBe("success");
  });
});

describe("createTrailingRefreshController", () => {
  it("executes one queued refresh after the active load finishes", async () => {
    const controller = createTrailingRefreshController();
    const calls: string[] = [];
    let releaseFirstLoad: (() => void) | undefined;
    const firstLoadGate = new Promise<void>((resolve) => {
      releaseFirstLoad = resolve;
    });

    const firstLoad = controller.request(async () => {
      calls.push("first");
      await firstLoadGate;
    });
    await controller.request(async () => {
      calls.push("trailing");
    });

    expect(calls).toEqual(["first"]);

    releaseFirstLoad?.();
    await firstLoad;

    expect(calls).toEqual(["first", "trailing"]);
  });
});

describe("claimTrashItemReconciliation", () => {
  it("allows local reconciliation only once per successful item action", () => {
    const reconciledIds = new Set<string>();

    expect(claimTrashItemReconciliation(reconciledIds, "a")).toBe(true);
    expect(claimTrashItemReconciliation(reconciledIds, "a")).toBe(false);
  });
});
