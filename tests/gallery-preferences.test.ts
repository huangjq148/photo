import { describe, expect, it } from "vitest";
import {
  createDefaultGalleryPreferences,
  GALLERY_PREFERENCES_STORAGE_KEY,
  loadGalleryPreferences,
  saveGalleryPreferences,
  updateGalleryPreferences,
} from "@/lib/client/gallery-preferences";

function createStorage(initial?: Record<string, string>) {
  const store = new Map<string, string>(Object.entries(initial ?? {}));

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

describe("gallery preferences", () => {
  it("falls back to default preferences when storage is empty or corrupted", () => {
    const storage = createStorage();

    expect(loadGalleryPreferences(storage)).toEqual(createDefaultGalleryPreferences());

    storage.setItem(GALLERY_PREFERENCES_STORAGE_KEY, "not-json");
    expect(loadGalleryPreferences(storage)).toEqual(createDefaultGalleryPreferences());
  });

  it("persists and restores valid versioned preferences", () => {
    const storage = createStorage();
    const next = {
      photoSize: "large" as const,
      layoutMode: "waterfall" as const,
      showTakenAt: true,
      groupMode: "month" as const,
    };

    saveGalleryPreferences(next, storage);

    expect(loadGalleryPreferences(storage)).toEqual(next);
  });

  it("ignores unknown fields when reading and when merging updates", () => {
    const storage = createStorage({
      [GALLERY_PREFERENCES_STORAGE_KEY]: JSON.stringify({
        version: 1,
        preferences: {
          photoSize: "small",
          layoutMode: "grid",
          showTakenAt: true,
          groupMode: "year",
          theme: "noir",
        },
        extra: "ignored",
      }),
    });

    expect(loadGalleryPreferences(storage)).toEqual({
      photoSize: "small",
      layoutMode: "grid",
      showTakenAt: true,
      groupMode: "year",
    });

    expect(
      updateGalleryPreferences(
        {
          photoSize: "medium",
          showTakenAt: false,
        },
        storage,
      ),
    ).toEqual({
      photoSize: "medium",
      layoutMode: "grid",
      showTakenAt: false,
      groupMode: "year",
    });
  });
});
