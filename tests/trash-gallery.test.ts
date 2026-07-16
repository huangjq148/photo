import { describe, expect, it } from "vitest";
import {
  applyTrashItemMutation,
  claimTrashItemReconciliation,
  createTrailingRefreshController,
  getTrashFailureNotice,
  runTrashItemAction,
  type TrashNotice,
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
    let notice: TrashNotice | null = { message: "已恢复 1 张照片", type: "success" };
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
        notice = getTrashFailureNotice(error, "恢复失败");
      },
      onPendingChange: (current) => {
        pendingSnapshots.push([...current.keys()]);
      },
    });

    expect(result).toBe("failure");
    expect(notice).toEqual({ message: "网络连接失败", type: "error" });
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

  it("does not let a later append overwrite an already queued full refresh", async () => {
    const controller = createTrailingRefreshController();
    const calls: string[] = [];
    let releaseFirstLoad: (() => void) | undefined;
    const firstLoadGate = new Promise<void>((resolve) => {
      releaseFirstLoad = resolve;
    });

    const firstLoad = controller.request(async () => {
      calls.push("active-append");
      await firstLoadGate;
    }, "append");
    await controller.request(async () => {
      calls.push("queued-refresh");
    }, "refresh");
    await controller.request(async () => {
      calls.push("later-append");
    }, "append");

    releaseFirstLoad?.();
    await firstLoad;

    expect(calls).toEqual(["active-append", "queued-refresh"]);
  });

  it("absorbs an append requested while a full refresh is active", async () => {
    const controller = createTrailingRefreshController();
    const calls: string[] = [];
    let releaseRefresh: (() => void) | undefined;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });

    const refresh = controller.request(async () => {
      calls.push("active-refresh-page-1");
      await refreshGate;
    }, "refresh");
    await controller.request(async () => {
      calls.push("stale-append-page-4");
    }, "append");

    releaseRefresh?.();
    await refresh;

    expect(calls).toEqual(["active-refresh-page-1"]);
  });
});

describe("claimTrashItemReconciliation", () => {
  it("allows local reconciliation only once per successful item action", () => {
    const reconciledIds = new Set<string>();

    expect(claimTrashItemReconciliation(reconciledIds, "a")).toBe(true);
    expect(claimTrashItemReconciliation(reconciledIds, "a")).toBe(false);
  });
});
