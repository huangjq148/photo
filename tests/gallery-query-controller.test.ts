import { describe, expect, it, vi } from "vitest";
import {
  createGalleryQueryController,
  parseGalleryQueryFromSearchParams,
} from "@/hooks/use-gallery-query";

describe("gallery query controller", () => {
  it("restores q from the url", () => {
    expect(parseGalleryQueryFromSearchParams(new URLSearchParams("q=旅行"))).toBe("旅行");
    expect(parseGalleryQueryFromSearchParams(new URLSearchParams("q=   "))).toBe("");
    expect(parseGalleryQueryFromSearchParams(new URLSearchParams(""))).toBe("");
  });

  it("debounces input before committing query changes", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    const controller = createGalleryQueryController({ onCommit, debounceMs: 300 });

    controller.setValue("夏天");
    expect(onCommit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(onCommit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledWith("夏天");
    vi.useRealTimers();
  });

  it("does not commit while composing until composition ends", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    const controller = createGalleryQueryController({ onCommit, debounceMs: 300 });

    controller.compositionStart();
    controller.setValue("输入中");
    vi.advanceTimersByTime(500);
    expect(onCommit).not.toHaveBeenCalled();

    controller.compositionEnd();
    vi.advanceTimersByTime(300);
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledWith("输入中");
    vi.useRealTimers();
  });
});
