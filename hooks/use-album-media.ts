"use client";

import { useEffect, useMemo, useRef, useState, startTransition } from "react";

export type AlbumMediaPage<T> = {
  items: T[];
  total: number;
  nextCursor: string | null;
};

type FetchPageArgs = {
  albumId: string;
  query: string;
  page: number;
  pageSize: number;
  signal: AbortSignal;
};

type FetchPage<T> = (args: FetchPageArgs) => Promise<AlbumMediaPage<T>>;

type LoaderState<T> = {
  items: T[];
  total: number;
  nextCursor: string | null;
  page: number;
};

export function createAlbumMediaLoader<T>({
  fetchPage,
  pageSize = 24,
}: {
  fetchPage: FetchPage<T>;
  pageSize?: number;
}) {
  let state: LoaderState<T> = {
    items: [],
    total: 0,
    nextCursor: null,
    page: 0,
  };
  let activeController: AbortController | null = null;
  let requestSeq = 0;
  let albumId = "";
  let query = "";

  function snapshot() {
    return {
      items: state.items,
      total: state.total,
      nextCursor: state.nextCursor,
      page: state.page,
    };
  }

  function abortActiveRequest() {
    activeController?.abort();
    activeController = null;
  }

  async function runRequest(nextPage: number) {
    const seq = ++requestSeq;
    abortActiveRequest();
    const controller = new AbortController();
    activeController = controller;
    const abortPromise = new Promise<never>((_, reject) => {
      if (controller.signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      controller.signal.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      );
    });

    try {
      const result = await Promise.race<AlbumMediaPage<T>>([
        fetchPage({
          albumId,
          query,
          page: nextPage,
          pageSize,
          signal: controller.signal,
        }),
        abortPromise,
      ]);

      if (seq !== requestSeq) {
        return snapshot();
      }

      state = {
        items: nextPage === 1 ? result.items : [...state.items, ...result.items],
        total: result.total,
        nextCursor: result.nextCursor,
        page: nextPage,
      };

      return snapshot();
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        return snapshot();
      }
      throw error;
    }
  }

  return {
    async reload(args: { albumId: string; query: string }) {
      albumId = args.albumId;
      query = args.query.trim();
      state = {
        items: [],
        total: 0,
        nextCursor: null,
        page: 0,
      };
      return runRequest(1);
    },
    async loadMore() {
      if (!albumId || !state.nextCursor) {
        return snapshot();
      }

      return runRequest(state.page + 1);
    },
    getState() {
      return snapshot();
    },
    dispose() {
      abortActiveRequest();
    },
  };
}

type UseAlbumMediaArgs<T> = {
  albumId: string;
  query: string;
  refreshSignal?: number;
  fetchPage: FetchPage<T>;
  pageSize?: number;
};

export function useAlbumMedia<T>({
  albumId,
  query,
  refreshSignal = 0,
  fetchPage,
  pageSize = 24,
}: UseAlbumMediaArgs<T>) {
  const loaderRef = useRef<ReturnType<typeof createAlbumMediaLoader<T>> | null>(null);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loaderRef.current) {
    loaderRef.current = createAlbumMediaLoader({ fetchPage, pageSize });
  }

  const reloadKey = useMemo(() => `${albumId}:${query}:${refreshSignal}`, [albumId, query, refreshSignal]);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError(null);
    startTransition(() => {
      void loaderRef.current
        ?.reload({ albumId, query })
        .then((snapshot) => {
          if (!mounted) {
            return;
          }
          setItems(snapshot.items);
          setTotal(snapshot.total);
          setNextCursor(snapshot.nextCursor);
          setPage(snapshot.page);
        })
        .catch((err) => {
          if (!mounted) {
            return;
          }
          setError(err instanceof Error ? err.message : "加载照片失败");
        })
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });
    });

    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  async function reload() {
    setLoading(true);
    setError(null);
    const snapshot = await loaderRef.current!.reload({ albumId, query });
    setItems(snapshot.items);
    setTotal(snapshot.total);
    setNextCursor(snapshot.nextCursor);
    setPage(snapshot.page);
    setLoading(false);
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    try {
      const snapshot = await loaderRef.current!.loadMore();
      setItems(snapshot.items);
      setTotal(snapshot.total);
      setNextCursor(snapshot.nextCursor);
      setPage(snapshot.page);
    } finally {
      setLoadingMore(false);
    }
  }

  return {
    items,
    total,
    nextCursor,
    page,
    loading,
    loadingMore,
    error,
    hasMore: nextCursor !== null,
    reload,
    loadMore,
  };
}
