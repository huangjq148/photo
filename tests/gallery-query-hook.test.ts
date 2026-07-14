import { describe, expect, it } from "vitest";
import {
  parseGalleryUrlState,
  galleryUrlStateToParams,
  parseGalleryQueryFromSearchParams,
  createGalleryQueryController,
  type GalleryUrlState,
} from "@/hooks/use-gallery-query";

describe("gallery url state", () => {
  it("parses empty params to default state", () => {
    const params = new URLSearchParams();
    const state = parseGalleryUrlState(params);

    expect(state.q).toBe("");
    expect(state.mediaType).toBeUndefined();
    expect(state.favoritedOnly).toBeUndefined();
    expect(state.uploaderId).toBeUndefined();
    expect(state.takenFrom).toBeUndefined();
    expect(state.takenTo).toBeUndefined();
    expect(state.sortBy).toBeUndefined();
    expect(state.sortOrder).toBe("desc");
    expect(state.groupBy).toBeUndefined();
  });

  it("parses all filter params from URL", () => {
    const params = new URLSearchParams();
    params.set("q", "旅行");
    params.set("mediaType", "image");
    params.set("favoritedOnly", "1");
    params.set("uploaderId", "user-1");
    params.set("takenFrom", "2024-01-01");
    params.set("takenTo", "2024-12-31");
    params.set("sortBy", "takenAt");
    params.set("sortOrder", "asc");
    params.set("groupBy", "month");

    const state = parseGalleryUrlState(params);

    expect(state.q).toBe("旅行");
    expect(state.mediaType).toBe("image");
    expect(state.favoritedOnly).toBe(true);
    expect(state.uploaderId).toBe("user-1");
    expect(state.takenFrom).toBe("2024-01-01");
    expect(state.takenTo).toBe("2024-12-31");
    expect(state.sortBy).toBe("takenAt");
    expect(state.sortOrder).toBe("asc");
    expect(state.groupBy).toBe("month");
  });

  it("round-trips state through params serialization", () => {
    const original: GalleryUrlState = {
      q: "test",
      mediaType: "video",
      favoritedOnly: true,
      uploaderId: "user-2",
      takenFrom: "2023-06-01",
      takenTo: "2023-12-01",
      sortBy: "fileName",
      sortOrder: "asc",
      groupBy: "year",
    };

    const params = galleryUrlStateToParams(original);
    const parsed = parseGalleryUrlState(params);

    expect(parsed).toEqual(original);
  });

  it("omits falsy values from serialized params", () => {
    const state: GalleryUrlState = {
      q: "",
      mediaType: undefined,
      favoritedOnly: undefined,
      uploaderId: undefined,
      takenFrom: undefined,
      takenTo: undefined,
      sortBy: undefined,
      sortOrder: "desc",
      groupBy: undefined,
    };

    const params = galleryUrlStateToParams(state);
    // Only sortOrder=desc by default should remain? Actually sortOrder is always set.
    // Default state should produce minimal params
    expect(params.get("q")).toBeNull();
    expect(params.get("mediaType")).toBeNull();
  });

  it("counts active filters correctly via parse (favoritedOnly=1)", () => {
    const params = new URLSearchParams();
    params.set("favoritedOnly", "1");
    params.set("mediaType", "image");

    const state = parseGalleryUrlState(params);
    let count = 0;
    if (state.mediaType) count++;
    if (state.favoritedOnly) count++;
    if (state.uploaderId) count++;
    if (state.takenFrom || state.takenTo) count++;

    expect(count).toBe(2);
  });

  it("search query parsing extracts q param", () => {
    expect(parseGalleryQueryFromSearchParams("q=hello")).toBe("hello");
    expect(parseGalleryQueryFromSearchParams("q=hello%20world")).toBe("hello world");
    expect(parseGalleryQueryFromSearchParams("")).toBe("");
  });
});

describe("gallery query controller", () => {
  it("debounces value commits", () => new Promise<void>((done) => {
    const commits: string[] = [];

    const controller = createGalleryQueryController({
      onCommit: (value) => commits.push(value),
      debounceMs: 50,
      setTimeoutFn: (fn, ms) => setTimeout(fn, ms),
      clearTimeoutFn: clearTimeout,
    });

    controller.setValue("a");
    controller.setValue("ab");
    controller.setValue("abc");

    setTimeout(() => {
      controller.dispose();
      expect(commits).toEqual(["abc"]);
      done();
    }, 100);
  }));

  it("does not commit while composing", () => new Promise<void>((done) => {
    const commits: string[] = [];

    const controller = createGalleryQueryController({
      onCommit: (value) => commits.push(value),
      debounceMs: 30,
      setTimeoutFn: (fn, ms) => setTimeout(fn, ms),
      clearTimeoutFn: clearTimeout,
    });

    controller.compositionStart();
    controller.setValue("nihao");
    controller.setValue("你好");

    setTimeout(() => {
      // Should not have committed during composition
      expect(commits).toEqual([]);
      controller.compositionEnd();

      setTimeout(() => {
        controller.dispose();
        expect(commits).toEqual(["你好"]);
        done();
      }, 50);
    }, 50);
  }));

  it("silent mode does not trigger commit", () => new Promise<void>((done) => {
    const commits: string[] = [];

    const controller = createGalleryQueryController({
      onCommit: (value) => commits.push(value),
      debounceMs: 30,
      setTimeoutFn: (fn, ms) => setTimeout(fn, ms),
      clearTimeoutFn: clearTimeout,
    });

    controller.setValue("hidden", { silent: true });

    setTimeout(() => {
      controller.dispose();
      expect(commits).toEqual([]);
      done();
    }, 80);
  }));
});
