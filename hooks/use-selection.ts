"use client";

import { useCallback, useMemo, useState } from "react";

type SelectionController = {
  selectedIds: string[];
  getSelectedIds: () => Set<string>;
  size: number;
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  selectMany: (ids: Iterable<string>) => void;
  retainOnly: (ids: Iterable<string>) => void;
  clear: () => void;
};

function normalizeIds(ids: Iterable<string>) {
  return Array.from(new Set(Array.from(ids).filter(Boolean))).sort();
}

export function createSelectionController(initialIds: Iterable<string> = []): SelectionController {
  const selected = new Set(normalizeIds(initialIds));

  return {
    get selectedIds() {
      return normalizeIds(selected);
    },
    getSelectedIds() {
      return new Set(selected);
    },
    get size() {
      return selected.size;
    },
    has(id: string) {
      return selected.has(id);
    },
    toggle(id: string) {
      if (selected.has(id)) {
        selected.delete(id);
      } else if (id) {
        selected.add(id);
      }
    },
    selectMany(ids: Iterable<string>) {
      for (const id of ids) {
        if (id) {
          selected.add(id);
        }
      }
    },
    retainOnly(ids: Iterable<string>) {
      const allowed = new Set(ids);
      for (const id of [...selected]) {
        if (!allowed.has(id)) {
          selected.delete(id);
        }
      }
    },
    clear() {
      selected.clear();
    },
  };
}

export function useSelection(initialIds: string[] = []) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(normalizeIds(initialIds)));

  const toggle = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else if (id) {
        next.add(id);
      }
      return new Set(normalizeIds(next));
    });
  }, []);

  const selectMany = useCallback(
    (ids: Iterable<string>) => {
      setSelectedIds((current) => new Set(normalizeIds([...current, ...ids])));
    },
    [],
  );

  const retainOnly = useCallback((ids: Iterable<string>) => {
    const allowed = new Set(ids);
    setSelectedIds((current) => new Set(normalizeIds(Array.from(current).filter((id) => allowed.has(id)))));
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return useMemo(
    () => ({
      selectedIds,
      size: selectedIds.size,
      has: (id: string) => selectedIds.has(id),
      toggle,
      selectMany,
      retainOnly,
      clear,
    }),
    [clear, retainOnly, selectedIds, selectMany, toggle],
  );
}
