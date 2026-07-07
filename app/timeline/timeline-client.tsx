"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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

export function TimelineClient() {
  const [allItems, setAllItems] = useState<MediaCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Fetch all media without pagination limits for year navigation
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch a large page to get year navigation
      const res = await fetch("/api/media?page=1&pageSize=200");
      if (!res.ok) throw new Error("Failed to fetch");
      const json: StreamResponse = await res.json();
      setAllItems(json.data.items);
      setTotal(json.data.total);
      setHasMore(json.data.total > 200);
    } catch (error) {
      console.error("Failed to fetch timeline:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Extract available years
  const years = useMemo(() => {
    const yearSet = new Set<number>();
    for (const item of allItems) {
      const date = item.takenAt ? new Date(item.takenAt) : new Date(item.uploadedAt);
      yearSet.add(date.getFullYear());
    }
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [allItems]);

  // Filter items by selected year
  const filteredItems = useMemo(() => {
    if (selectedYear === null) return allItems;
    return allItems.filter((item) => {
      const date = item.takenAt ? new Date(item.takenAt) : new Date(item.uploadedAt);
      return date.getFullYear() === selectedYear;
    });
  }, [allItems, selectedYear]);

  // Group filtered items by month
  const groups = useMemo(() => {
    const groupMap = new Map<string, MediaCardItem[]>();
    for (const item of filteredItems) {
      const date = item.takenAt ? new Date(item.takenAt) : new Date(item.uploadedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(item);
    }

    return Array.from(groupMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => {
        const [year, month] = key.split("-");
        return { label: `${year} 年 ${parseInt(month)} 月`, items };
      });
  }, [filteredItems]);

  const loadMore = useCallback(async () => {
    const nextPage = page + 1;
    setLoading(true);
    try {
      const res = await fetch(`/api/media?page=${nextPage}&pageSize=200`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json: StreamResponse = await res.json();
      setAllItems((prev) => [...prev, ...json.data.items]);
      setHasMore((nextPage * 200) < json.data.total);
      setPage(nextPage);
    } catch (error) {
      console.error("Failed to load more:", error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  if (loading && allItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Year navigation */}
      {years.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedYear(null)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              selectedYear === null
                ? "bg-[var(--accent)] text-black"
                : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            全部
          </button>
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => setSelectedYear(year)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                selectedYear === year
                  ? "bg-[var(--accent)] text-black"
                  : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filteredItems.length === 0 && !loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[var(--muted)]">
            {selectedYear ? `${selectedYear} 年暂无回忆` : "暂无回忆"}
          </p>
        </div>
      ) : (
        <MediaGrid
          groups={groups}
          loading={loading}
          emptyMessage={selectedYear ? `${selectedYear} 年暂无回忆` : "暂无回忆"}
          onLoadMore={hasMore ? loadMore : undefined}
          hasMore={hasMore}
        />
      )}
    </div>
  );
}
