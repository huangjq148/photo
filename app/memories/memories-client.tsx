"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MediaGrid } from "@/components/media/media-grid";
import type { MediaCardItem } from "@/components/media/media-card";

type StreamResponse = {
  data: {
    items: MediaCardItem[];
    groups: Array<{ label: string; items: MediaCardItem[] }>;
    page: number;
    pageSize: number;
    total: number;
  };
};

export function MemoriesClient() {
  const [groups, setGroups] = useState<Array<{ label: string; items: MediaCardItem[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchMedia = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/media?page=${pageNum}&pageSize=24`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json: StreamResponse = await res.json();

      if (pageNum === 1) {
        setGroups(json.data.groups);
      } else {
        setGroups((prev) => {
          const merged = new Map<string, MediaCardItem[]>();
          // Add existing groups
          for (const g of prev) {
            merged.set(g.label, [...g.items]);
          }
          // Merge new groups
          for (const g of json.data.groups) {
            if (merged.has(g.label)) {
              merged.set(g.label, [...merged.get(g.label)!, ...g.items]);
            } else {
              merged.set(g.label, [...g.items]);
            }
          }
          return Array.from(merged.entries()).map(([label, items]) => ({ label, items }));
        });
      }

      setHasMore(json.data.page * json.data.pageSize < json.data.total);
    } catch (error) {
      console.error("Failed to fetch memories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia(page);
  }, [page, fetchMedia]);

  const loadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  return (
    <MediaGrid
      groups={groups}
      loading={loading}
      emptyMessage="还没有任何回忆，去相册上传吧"
      onLoadMore={hasMore ? loadMore : undefined}
      hasMore={hasMore}
    />
  );
}
