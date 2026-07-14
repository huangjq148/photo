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
    async reload(args: { albumId: string; query: string; preserveItems?: boolean }) {
      albumId = args.albumId;
      query = args.query.trim();
      const preserveItems = args.preserveItems ?? false;
      const currentItems = preserveItems ? state.items : [];
      const currentTotal = preserveItems ? state.total : 0;
      const currentNextCursor = preserveItems ? state.nextCursor : null;
      const currentPage = preserveItems ? state.page : 0;
      state = {
        items: currentItems,
        total: currentTotal,
        nextCursor: currentNextCursor,
        page: currentPage,
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
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  if (!loaderRef.current) {
    loaderRef.current = createAlbumMediaLoader({ fetchPage, pageSize });
  }

  const reloadKey = useMemo(() => `${albumId}:${query}:${refreshSignal}`, [albumId, query, refreshSignal]);

  useEffect(() => {
    let mounted = true;

    const preserveItems = items.length > 0;
    setLoadMoreError(null);
    setError(null);
    setRefreshing(preserveItems);
    setLoading(!preserveItems);
    startTransition(() => {
      void loaderRef.current
        ?.reload({ albumId, query, preserveItems })
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
            setRefreshing(false);
          }
        });
    });

    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  async function reload() {
    const preserveItems = items.length > 0;
    setLoadMoreError(null);
    setError(null);
    setRefreshing(preserveItems);
    setLoading(!preserveItems);
    try {
      const snapshot = await loaderRef.current!.reload({ albumId, query, preserveItems });
      setItems(snapshot.items);
      setTotal(snapshot.total);
      setNextCursor(snapshot.nextCursor);
      setPage(snapshot.page);
    } catch (error) {
      setError(error instanceof Error ? error.message : "加载照片失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const snapshot = await loaderRef.current!.loadMore();
      setItems(snapshot.items);
      setTotal(snapshot.total);
      setNextCursor(snapshot.nextCursor);
      setPage(snapshot.page);
    } catch (error) {
      const text = error instanceof Error ? error.message : "加载更多失败";
      setLoadMoreError(text);
      throw error;
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
    refreshing,
    loadingMore,
    error,
    loadMoreError,
    hasMore: nextCursor !== null,
    reload,
    loadMore,
  };
}
