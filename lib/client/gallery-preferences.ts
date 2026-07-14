"use client";

import type { PhotoSize } from "@/components/photos/photo-gallery-size-control";

export type GalleryLayoutMode = "grid" | "waterfall";
export type GalleryGroupMode = "none" | "month" | "year";

export type GalleryPreferences = {
  photoSize: PhotoSize;
  layoutMode: GalleryLayoutMode;
  showTakenAt: boolean;
  groupMode: GalleryGroupMode;
};

type GalleryPreferencesRecord = {
  version: 1;
  preferences: Partial<GalleryPreferences>;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const GALLERY_PREFERENCES_STORAGE_KEY = "photo:gallery-preferences:v1";

const DEFAULT_PREFERENCES: GalleryPreferences = {
  photoSize: "medium",
  layoutMode: "grid",
  showTakenAt: false,
  groupMode: "none",
};

function isPhotoSize(value: unknown): value is PhotoSize {
  return value === "small" || value === "medium" || value === "large";
}

function isGalleryLayoutMode(value: unknown): value is GalleryLayoutMode {
  return value === "grid" || value === "waterfall";
}

function isGalleryGroupMode(value: unknown): value is GalleryGroupMode {
  return value === "none" || value === "month" || value === "year";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStorage(storage?: StorageLike): StorageLike | null {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function createDefaultGalleryPreferences(): GalleryPreferences {
  return { ...DEFAULT_PREFERENCES };
}

export function normalizeGalleryPreferences(input: unknown): GalleryPreferences {
  if (!isRecord(input)) {
    return createDefaultGalleryPreferences();
  }

  const candidate = isRecord(input.preferences) ? input.preferences : input;

  return {
    photoSize: isPhotoSize(candidate.photoSize) ? candidate.photoSize : DEFAULT_PREFERENCES.photoSize,
    layoutMode: isGalleryLayoutMode(candidate.layoutMode)
      ? candidate.layoutMode
      : DEFAULT_PREFERENCES.layoutMode,
    showTakenAt:
      typeof candidate.showTakenAt === "boolean" ? candidate.showTakenAt : DEFAULT_PREFERENCES.showTakenAt,
    groupMode: isGalleryGroupMode(candidate.groupMode) ? candidate.groupMode : DEFAULT_PREFERENCES.groupMode,
  };
}

export function loadGalleryPreferences(storage?: StorageLike): GalleryPreferences {
  const targetStorage = getStorage(storage);
  if (!targetStorage) {
    return createDefaultGalleryPreferences();
  }

  const raw = targetStorage.getItem(GALLERY_PREFERENCES_STORAGE_KEY);
  if (!raw) {
    return createDefaultGalleryPreferences();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.version !== 1) {
      return createDefaultGalleryPreferences();
    }

    return normalizeGalleryPreferences(parsed.preferences);
  } catch {
    return createDefaultGalleryPreferences();
  }
}

export function saveGalleryPreferences(preferences: GalleryPreferences, storage?: StorageLike) {
  const targetStorage = getStorage(storage);
  if (!targetStorage) {
    return;
  }

  targetStorage.setItem(
    GALLERY_PREFERENCES_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      preferences: normalizeGalleryPreferences(preferences),
    } satisfies GalleryPreferencesRecord),
  );
}

export function updateGalleryPreferences(partial: Partial<GalleryPreferences>, storage?: StorageLike) {
  const next = {
    ...loadGalleryPreferences(storage),
    ...partial,
  };

  saveGalleryPreferences(next, storage);
  return next;
}
