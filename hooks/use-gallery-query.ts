"use client";

import { useEffect, useMemo, useRef, useState, startTransition } from "react";
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

  useEffect(() => {
    setSearchValue((current) => (current === queryFromUrl ? current : queryFromUrl));
  }, [queryFromUrl]);

  useEffect(() => {
    const controller = createGalleryQueryController({
      onCommit: (value) => {
        onCommit(value);
        const next = new URLSearchParams(searchParams.toString());
        if (value) {
          next.set("q", value);
        } else {
          next.delete("q");
        }
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

  return {
    searchValue,
    setSearchValue: updateSearch,
    clearSearch,
    handleCompositionStart,
    handleCompositionEnd,
    isComposing,
  };
}
