import { describe, expect, it, vi } from "vitest";
import {
  createUploadQueueController,
  uploadQueueReducer,
  type UploadQueueState,
} from "@/lib/client/upload-queue";
import type { UploadRequestResult } from "@/lib/client/upload-request";

function createFile(name: string, content = "x", lastModified = 1) {
  return new File([content], name, { type: "image/png", lastModified });
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createInitialState(): UploadQueueState {
  return {
    items: [],
    activeCount: 0,
    completedCount: 0,
    queuedCount: 0,
  };
}

function createDraft(file: File, previewUrl: string, id = `draft-${file.name}`) {
  return {
    id,
    albumId: "album-1",
    file,
    fileKey: [file.name, file.size, file.lastModified, file.type].join("|"),
    name: file.name,
    size: file.size,
    type: file.type,
    previewUrl,
    status: "queued" as const,
    progress: { loaded: 0, total: 0 },
  };
}

function createStoredItem(name: string, status: "queued" | "uploading" | "success" | "failed" | "cancelled") {
  const file = createFile(name);
  return {
    id: `${name}-id`,
    ...createDraft(file, `blob:${name}`),
    status,
  };
}

describe("uploadQueueReducer", () => {
  it("deduplicates files and advances queue status", () => {
    const file = createFile("photo-a.png");
    const duplicate = createFile("photo-a.png");

    let state = uploadQueueReducer(createInitialState(), {
      type: "enqueue",
      items: [createDraft(file, "blob:photo-a"), createDraft(duplicate, "blob:photo-a-duplicate")],
    });

    expect(state.items).toHaveLength(1);
    expect(state.items[0]?.status).toBe("queued");
    expect(state.items[0]?.previewUrl).toBe("blob:photo-a");

    state = uploadQueueReducer(state, { type: "start", itemIds: [state.items[0]!.id] });
    expect(state.items[0]?.status).toBe("uploading");

    state = uploadQueueReducer(state, {
      type: "progress",
      itemId: state.items[0]!.id,
      loaded: 25,
      total: 100,
    });
    expect(state.items[0]).toMatchObject({ progress: { loaded: 25, total: 100 } });

    state = uploadQueueReducer(state, {
      type: "success",
      itemId: state.items[0]!.id,
      result: { id: "media-1" },
    });
    expect(state.items[0]?.status).toBe("success");
    expect(state.items[0]?.result).toEqual({ id: "media-1" });

    state = uploadQueueReducer(state, { type: "cancel", itemId: state.items[0]!.id });
    expect(state.items[0]?.status).toBe("cancelled");

    state = uploadQueueReducer(state, { type: "retry", itemId: state.items[0]!.id });
    expect(state.items[0]?.status).toBe("queued");
    expect(state.items[0]?.progress).toEqual({ loaded: 0, total: 0 });

    const mixedState: UploadQueueState = {
      ...createInitialState(),
      items: [
        createStoredItem("queued.png", "queued"),
        createStoredItem("uploading.png", "uploading"),
        createStoredItem("success.png", "success"),
        createStoredItem("failed.png", "failed"),
        createStoredItem("cancelled.png", "cancelled"),
      ],
    };

    const cancelledAll = uploadQueueReducer(mixedState, { type: "cancel-all" });
    expect(cancelledAll.items.map((item) => [item.name, item.status])).toEqual([
      ["queued.png", "cancelled"],
      ["uploading.png", "cancelled"],
      ["success.png", "success"],
      ["failed.png", "failed"],
      ["cancelled.png", "cancelled"],
    ]);
  });
});

describe("createUploadQueueController", () => {
  it("runs at most three uploads, backfills freed slots, and calls batch completion once", async () => {
    const calls: Array<{ itemId: string; fileName: string }> = [];
    const deferreds = new Map<string, ReturnType<typeof createDeferred<UploadRequestResult>>>();
    const onBatchComplete = vi.fn();

    const controller = createUploadQueueController({
      albumId: "album-1",
      maxConcurrency: 3,
      createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
      revokeObjectURL: vi.fn(),
      requestUpload: ({ file, signal, onProgress, itemId }) => {
        calls.push({ itemId, fileName: file.name });
        const deferred = createDeferred<UploadRequestResult>();
        deferreds.set(itemId, deferred);
        signal?.addEventListener("abort", () => {
          deferred.resolve({ kind: "cancelled" });
        });
        onProgress?.({ loaded: 4, total: 10 });
        return deferred.promise;
      },
      onBatchComplete,
    });

    controller.enqueueFiles([
      createFile("one.png"),
      createFile("two.png"),
      createFile("three.png"),
      createFile("four.png"),
      createFile("five.png"),
      createFile("one.png"),
    ]);

    expect(controller.getState().items.map((item) => item.status)).toEqual([
      "uploading",
      "uploading",
      "uploading",
      "queued",
      "queued",
    ]);
    expect(calls.map((call) => call.fileName)).toEqual(["one.png", "two.png", "three.png"]);
    expect(controller.getState().activeCount).toBe(3);

    deferreds.get(controller.getState().items[0]!.id)!.resolve({
      kind: "success",
      status: 201,
      data: { id: "one" },
    });

    await vi.waitFor(() => {
      expect(controller.getState().items[3]?.status).toBe("uploading");
    });

    expect(calls.map((call) => call.fileName)).toEqual(["one.png", "two.png", "three.png", "four.png"]);

    deferreds.get(controller.getState().items[1]!.id)!.resolve({
      kind: "success",
      status: 201,
      data: { id: "two" },
    });
    deferreds.get(controller.getState().items[2]!.id)!.resolve({
      kind: "success",
      status: 201,
      data: { id: "three" },
    });

    await vi.waitFor(() => {
      expect(controller.getState().items[4]?.status).toBe("uploading");
    });

    deferreds.get(controller.getState().items[3]!.id)!.resolve({
      kind: "success",
      status: 201,
      data: { id: "four" },
    });
    deferreds.get(controller.getState().items[4]!.id)!.resolve({
      kind: "success",
      status: 201,
      data: { id: "five" },
    });

    await vi.waitFor(() => {
      expect(controller.getState().completedCount).toBe(5);
    });

    expect(onBatchComplete).toHaveBeenCalledTimes(1);
  });

  it("revokes local preview urls when the queue is disposed", () => {
    const revokeObjectURL = vi.fn();
    const controller = createUploadQueueController({
      albumId: "album-1",
      createObjectURL: (file) => `blob:${file.name}`,
      revokeObjectURL,
      requestUpload: () =>
        Promise.resolve({
          kind: "success",
          status: 201,
          data: { ok: true },
        }),
    });

    controller.enqueueFiles([
      createFile("a.png"),
      createFile("b.png"),
    ]);

    expect(revokeObjectURL).not.toHaveBeenCalled();
    controller.dispose();

    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:a.png");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:b.png");
  });
});
