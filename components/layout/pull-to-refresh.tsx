"use client";

import { ArrowDown, RotateCw } from "lucide-react";
import React, {
  type ReactNode,
  type TouchEvent,
  useRef,
  useState,
} from "react";

const REFRESH_THRESHOLD = 64;
const MAX_PULL_DISTANCE = 88;
const PULL_RESISTANCE = 0.42;

type PullToRefreshProps = {
  children: ReactNode;
  disabled?: boolean;
  onRefresh: () => Promise<void>;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
};

type TouchOrigin = {
  x: number;
  y: number;
};

export function getPullDistance(deltaY: number) {
  return Math.min(
    MAX_PULL_DISTANCE,
    Math.max(0, deltaY * PULL_RESISTANCE),
  );
}

export function PullToRefresh({
  children,
  disabled = false,
  onRefresh,
  scrollContainerRef,
}: PullToRefreshProps) {
  const touchOriginRef = useRef<TouchOrigin | null>(null);
  const directionLockedRef = useRef<"horizontal" | "vertical" | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const canRefresh = pullDistance >= REFRESH_THRESHOLD;

  function resetGesture() {
    touchOriginRef.current = null;
    directionLockedRef.current = null;
    setPullDistance(0);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (
      disabled ||
      refreshing ||
      event.touches.length !== 1 ||
      (scrollContainerRef.current?.scrollTop ?? 0) > 0
    ) {
      return;
    }

    const touch = event.touches[0];
    touchOriginRef.current = { x: touch.clientX, y: touch.clientY };
    directionLockedRef.current = null;
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    const origin = touchOriginRef.current;
    if (!origin || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - origin.x;
    const deltaY = touch.clientY - origin.y;

    if (
      (scrollContainerRef.current?.scrollTop ?? 0) > 0 ||
      deltaY <= 0
    ) {
      resetGesture();
      return;
    }

    if (!directionLockedRef.current && Math.max(Math.abs(deltaX), deltaY) > 8) {
      directionLockedRef.current =
        Math.abs(deltaX) > deltaY ? "horizontal" : "vertical";
    }

    if (directionLockedRef.current !== "vertical") return;

    event.preventDefault();
    setPullDistance(getPullDistance(deltaY));
  }

  async function handleTouchEnd() {
    touchOriginRef.current = null;
    directionLockedRef.current = null;

    if (!canRefresh || refreshing) {
      setPullDistance(0);
      return;
    }

    setRefreshing(true);
    setPullDistance(REFRESH_THRESHOLD);

    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }

  return (
    <div
      className="relative min-h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={resetGesture}
    >
      {(refreshing || pullDistance > 8) && (
        <div
          aria-live="polite"
          aria-atomic="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center lg:hidden"
          role="status"
          style={{
            transform: `translate3d(0, ${Math.max(8, pullDistance - 48)}px, 0)`,
          }}
        >
          <div className="noir-glass-chip flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold text-[var(--muted-strong)] shadow-xl">
            {refreshing ? (
              <RotateCw
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
                size={15}
              />
            ) : (
              <ArrowDown
                aria-hidden="true"
                size={15}
                style={{
                  transform: canRefresh ? "rotate(180deg)" : "none",
                  transition: "transform 160ms ease",
                }}
              />
            )}
            <span>
              {refreshing
                ? "正在刷新"
                : canRefresh
                  ? "松开刷新"
                  : "下拉刷新"}
            </span>
          </div>
        </div>
      )}

      <div
        className="min-h-full will-change-transform"
        style={{
          transform: `translate3d(0, ${pullDistance}px, 0)`,
          transition:
            pullDistance === 0 || refreshing
              ? "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)"
              : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
