"use client";

import { useEffect, useMemo, useRef, useState, startTransition, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type TimerHandle = ReturnType<typeof setTimeout>;

type GalleryQueryControllerOptions = {
  onCommit: (value: string) => void;
  debounceMs?: number;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
};

export function parseGalleryQueryFromSearchParams(
  searchParams: string | URLSearchParams
): string {
  const params = typeof searchParams === "string" ? new URLSearchParams(searchParams) : searchParams;
  return params.get("q")?.trim() ?? "";
}

export function createGalleryQueryController({
  onCommit,
  debounceMs = 300,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}: GalleryQueryControllerOptions) {
  let value = "";
  let composing = false;
  let timer: TimerHandle | null = null;

  function clearTimer() {
    if (timer !== null) {
      clearTimeoutFn(timer);
      timer = null;
    }
  }

  function scheduleCommit() {
    clearTimer();
    timer = setTimeoutFn(() => {
      timer = null;
      onCommit(value.trim());
    }, debounceMs);
  }

  return {
    getValue() {
      return value;
    },
    setValue(next: string, options?: { silent?: boolean }) {
      value = next;
      if (options?.silent) {
        return;
      }

      if (composing) {
        return;
      }

      scheduleCommit();
    },
    compositionStart() {
      composing = true;
      clearTimer();
    },
    compositionEnd() {
      composing = false;
      scheduleCommit();
    },
    dispose() {
      clearTimer();
    },
  };
}

// ─── Filter/Group/Sort types ───────────────────────────────────────────

export type GallerySortBy = "uploadedAt" | "takenAt" | "fileName" | "size";
export type GallerySortOrder = "asc" | "desc";
export type GalleryMediaType = "image" | "video";
export type GalleryGroupMode = "year" | "month";

export type GalleryFilters = {
  mediaType?: GalleryMediaType;
  favoritedOnly?: boolean;
  uploaderId?: string;
  takenFrom?: string;
  takenTo?: string;
};

export type GalleryUrlState = {
  q: string;
  mediaType?: GalleryMediaType;
  favoritedOnly?: boolean;
  uploaderId?: string;
  takenFrom?: string;
  takenTo?: string;
  sortBy?: GallerySortBy;
  sortOrder?: GallerySortOrder;
  groupBy?: GalleryGroupMode;
};

const GALLERY_PARAM_KEYS = [
  "q",
  "mediaType",
  "favoritedOnly",
  "uploaderId",
  "takenFrom",
  "takenTo",
  "sortBy",
  "sortOrder",
  "groupBy",
] as const;

export function parseGalleryUrlState(searchParams: URLSearchParams): GalleryUrlState {
  const q = searchParams.get("q")?.trim() ?? "";
  const mediaType = searchParams.get("mediaType") as GalleryMediaType | null;
  const favoritedOnly = searchParams.get("favoritedOnly") === "1" ? true : undefined;
  const uploaderId = searchParams.get("uploaderId")?.trim() || undefined;
  const takenFrom = searchParams.get("takenFrom")?.trim() || undefined;
  const takenTo = searchParams.get("takenTo")?.trim() || undefined;
  const sortBy = searchParams.get("sortBy") as GallerySortBy | null;
  const sortOrder = (searchParams.get("sortOrder") as GallerySortOrder) ?? "desc";
  const groupBy = searchParams.get("groupBy") as GalleryGroupMode | null;

  return {
    q,
    mediaType: mediaType ?? undefined,
    favoritedOnly,
    uploaderId,
    takenFrom,
    takenTo,
    sortBy: sortBy ?? undefined,
    sortOrder,
    groupBy: groupBy ?? undefined,
  };
}

export function galleryUrlStateToParams(state: GalleryUrlState): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of GALLERY_PARAM_KEYS) {
    if (key === "q") {
      if (state.q) params.set("q", state.q);
      continue;
    }
    if (key === "favoritedOnly") {
      if (state.favoritedOnly) params.set("favoritedOnly", "1");
      continue;
    }
    const value = state[key as keyof Omit<GalleryUrlState, "q" | "favoritedOnly">];
    if (value) params.set(key, value as string);
  }

  return params;
}

// ─── Hook ──────────────────────────────────────────────────────────────

type UseGalleryQueryOptions = {
  initialSearch?: string;
  onCommit: (value: string) => void;
};

export function useGalleryQuery({ initialSearch = "", onCommit }: UseGalleryQueryOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(() => parseGalleryQueryFromSearchParams(searchParams) || initialSearch);
  const [isComposing, setIsComposing] = useState(false);
  const controllerRef = useRef<ReturnType<typeof createGalleryQueryController> | null>(null);

  const queryFromUrl = useMemo(() => parseGalleryQueryFromSearchParams(searchParams), [searchParams]);

  // Derived filter state from URL
  const urlState = useMemo(() => parseGalleryUrlState(searchParams), [searchParams]);

  useEffect(() => {
    setSearchValue((current) => (current === queryFromUrl ? current : queryFromUrl));
  }, [queryFromUrl]);

  useEffect(() => {
    const controller = createGalleryQueryController({
      onCommit: (value) => {
        onCommit(value);
        const current = parseGalleryUrlState(searchParams);
        current.q = value;
        const next = galleryUrlStateToParams(current);
        startTransition(() => {
          const nextHref = next.size > 0 ? `${pathname}?${next.toString()}` : pathname;
          router.replace(nextHref as never, { scroll: false });
        });
      },
    });

    controllerRef.current = controller;
    controller.setValue(queryFromUrl, { silent: true });

    return () => {
      controller.dispose();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [onCommit, pathname, queryFromUrl, router, searchParams]);

  function updateSearch(next: string) {
    setSearchValue(next);
    controllerRef.current?.setValue(next);
  }

  function clearSearch() {
    updateSearch("");
  }

  function handleCompositionStart() {
    setIsComposing(true);
    controllerRef.current?.compositionStart();
  }

  function handleCompositionEnd() {
    setIsComposing(false);
    controllerRef.current?.compositionEnd();
  }

  // ─── Update URL helpers ───────────────────────────────────────────

  const pushUrlState = useCallback(
    (patch: Partial<GalleryUrlState>) => {
      const current = parseGalleryUrlState(searchParams);
      const next = galleryUrlStateToParams({ ...current, ...patch });
      startTransition(() => {
        const nextHref = next.size > 0 ? `${pathname}?${next.toString()}` : pathname;
        router.replace(nextHref as never, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const setMediaType = useCallback(
    (mediaType?: GalleryMediaType) => pushUrlState({ mediaType }),
    [pushUrlState],
  );

  const setFavoritedOnly = useCallback(
    (favoritedOnly?: boolean) => pushUrlState({ favoritedOnly }),
    [pushUrlState],
  );

  const setUploaderId = useCallback(
    (uploaderId?: string) => pushUrlState({ uploaderId }),
    [pushUrlState],
  );

  const setTakenRange = useCallback(
    (from?: string, to?: string) => pushUrlState({ takenFrom: from, takenTo: to }),
    [pushUrlState],
  );

  const setSortBy = useCallback(
    (sortBy?: GallerySortBy) => pushUrlState({ sortBy }),
    [pushUrlState],
  );

  const setSortOrder = useCallback(
    (sortOrder?: GallerySortOrder) => pushUrlState({ sortOrder }),
    [pushUrlState],
  );

  const setGroupBy = useCallback(
    (groupBy?: GalleryGroupMode) => pushUrlState({ groupBy }),
    [pushUrlState],
  );

  const clearFilters = useCallback(() => {
    pushUrlState({
      mediaType: undefined,
      favoritedOnly: undefined,
      uploaderId: undefined,
      takenFrom: undefined,
      takenTo: undefined,
    });
  }, [pushUrlState]);

  // Count active filters (excluding q, sort, group)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (urlState.mediaType) count++;
    if (urlState.favoritedOnly) count++;
    if (urlState.uploaderId) count++;
    if (urlState.takenFrom || urlState.takenTo) count++;
    return count;
  }, [urlState]);

  return {
    searchValue,
    setSearchValue: updateSearch,
    clearSearch,
    handleCompositionStart,
    handleCompositionEnd,
    isComposing,
    // Filter/sort/group state
    urlState,
    activeFilterCount,
    setMediaType,
    setFavoritedOnly,
    setUploaderId,
    setTakenRange,
    setSortBy,
    setSortOrder,
    setGroupBy,
    clearFilters,
    pushUrlState,
  };
}
