import { describe, expect, it, vi } from "vitest";
import { createAlbumMediaLoader } from "@/hooks/use-album-media";

describe("album media loader", () => {
  it("aborts in-flight requests when a newer reload starts", async () => {
    const abortSignals: AbortSignal[] = [];
    let requestIndex = 0;
    let resolveFirst:
      | ((value: { items: { id: string }[]; total: number; nextCursor: string | null }) => void)
      | null = null;
    let resolveSecond:
      | ((value: { items: { id: string }[]; total: number; nextCursor: string | null }) => void)
      | null = null;
    const fetchPage = vi.fn(
      (args: { signal: AbortSignal; page: number }) =>
        new Promise<{ items: { id: string }[]; total: number; nextCursor: string | null }>((resolve) => {
          abortSignals.push(args.signal);
          if (requestIndex === 0) {
            resolveFirst = resolve;
          } else {
            resolveSecond = resolve;
          }
          requestIndex += 1;
        }),
    );

    const loader = createAlbumMediaLoader({
      fetchPage,
      pageSize: 24,
    });

    const first = loader.reload({ albumId: "album-1", query: "" });
    const second = loader.reload({ albumId: "album-1", query: "海边" });

    expect(abortSignals[0]?.aborted).toBe(true);
    expect(abortSignals[1]?.aborted).toBe(false);

    expect(resolveFirst).toBeTruthy();
    expect(resolveSecond).toBeTruthy();
    const firstResolve = resolveFirst!;
    const secondResolve = resolveSecond!;

    secondResolve({ items: [{ id: "fresh" }], total: 1, nextCursor: null });
    await expect(second).resolves.toMatchObject({ items: [{ id: "fresh" }] });
    expect(loader.getState().items).toEqual([{ id: "fresh" }]);

    firstResolve({ items: [{ id: "stale" }], total: 1, nextCursor: null });
    await first;
    expect(loader.getState().items).toEqual([{ id: "fresh" }]);
  });

  it("loads more pages without losing the current list", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: "photo-1" }], total: 2, nextCursor: "cursor-1" })
      .mockResolvedValueOnce({ items: [{ id: "photo-2" }], total: 2, nextCursor: null });

    const loader = createAlbumMediaLoader({
      fetchPage,
      pageSize: 24,
    });

    const first = await loader.reload({ albumId: "album-1", query: "" });
    expect(first.items).toEqual([{ id: "photo-1" }]);

    const second = await loader.loadMore();
    expect(second.items).toEqual([{ id: "photo-1" }, { id: "photo-2" }]);
  });
});
