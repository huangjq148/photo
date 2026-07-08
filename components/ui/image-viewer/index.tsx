'use client'
/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent, SyntheticEvent, WheelEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  getImageViewerContentClasses,
  getImageViewerImageClasses,
  getImageViewerOverlayClasses,
} from './layout'
import {
  clampImageViewerZoom,
  formatImageViewerZoomLabel,
  getImageViewerFitZoom,
  getNextImageViewerZoom,
} from './zoom'
import {
  getImageViewerDragScrollPosition,
  getImageViewerResetState,
} from './interactions'

export interface ImageViewerNavigationItem {
  id: string
  src: string
  previewSrc?: string
  alt: string
  title?: string
}

interface ImageViewerProps {
  src: string
  alt: string
  previewSrc?: string
  className?: string
  imgClassName?: string
  previewImageClassName?: string
  title?: string
  items?: ImageViewerNavigationItem[]
  initialItemId?: string
}

/** 滑动切换阈值：占屏幕宽度的比例 */
const SWIPE_COMMIT_RATIO = 0.25

export default function ImageViewer({
  src,
  alt,
  previewSrc,
  className = '',
  imgClassName = '',
  previewImageClassName = '',
  title = '原图预览',
  items,
  initialItemId,
}: ImageViewerProps) {
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hasNavigated, setHasNavigated] = useState(false)

  // Swipe carousel
  const [isSwiping, setIsSwiping] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)

  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startScrollLeft: number
    startScrollTop: number
    startTime: number
    swipeStarted: boolean
  } | null>(null)
  const committedRef = useRef(false)
  const vwRef = useRef(typeof window !== 'undefined' ? window.innerWidth : 800)

  const navigationEnabled = !!(items && items.length > 1)

  // Derive current display item
  const currentItem = navigationEnabled ? items[currentIndex] : null
  const fullScreenSrc = navigationEnabled && currentItem
    ? (currentItem.previewSrc || currentItem.src)
    : (previewSrc || src)
  const currentAlt = navigationEnabled && currentItem ? currentItem.alt : alt
  const currentTitle = navigationEnabled && currentItem
    ? (currentItem.title || currentItem.alt)
    : title

  const hasPrev = navigationEnabled && currentIndex > 0
  const hasNext = navigationEnabled && currentIndex < items.length - 1

  // Adjacent image sources
  const prevSrc = navigationEnabled && hasPrev
    ? (items[currentIndex - 1].previewSrc || items[currentIndex - 1].src)
    : null
  const nextSrc = navigationEnabled && hasNext
    ? (items[currentIndex + 1].previewSrc || items[currentIndex + 1].src)
    : null

  const canSwipe = navigationEnabled && zoom <= 1.05

  const vw = vwRef.current

  // Strip default position: -vw so the 2nd slot (current) is visible
  const stripTranslateX = -vw + swipeOffset

  // ----- Navigate (keyboard / arrow buttons) -----
  const navigateTo = useCallback((index: number) => {
    if (!navigationEnabled || index < 0 || index >= items.length) return
    setCurrentIndex(index)
    setHasNavigated(true)
    setZoom(1)
    setImageSize(null)
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0
      scrollRef.current.scrollTop = 0
    }
  }, [navigationEnabled, items])

  // Commit swipe: animate strip to target slot, then switch
  const commitSwipe = useCallback((direction: 1 | -1) => {
    if (committedRef.current) return
    committedRef.current = true
    setIsSwiping(false)
    setSwipeOffset(direction * vw)

    setTimeout(() => {
      const newIdx = direction < 0 ? currentIndex + 1 : currentIndex - 1
      navigateTo(newIdx)
      setSwipeOffset(0)
      committedRef.current = false
    }, 300)
  }, [navigateTo, currentIndex, vw])

  const snapBack = useCallback(() => {
    setIsSwiping(false)
    setSwipeOffset(0)
  }, [])

  // ----- Keyboard -----
  useEffect(() => {
    if (!open || typeof document === 'undefined') return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); return }
      if (!navigationEnabled || committedRef.current) return
      if (event.key === 'ArrowLeft' && hasPrev) { event.preventDefault(); commitSwipe(1) }
      if (event.key === 'ArrowRight' && hasNext) { event.preventDefault(); commitSwipe(-1) }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, navigationEnabled, hasPrev, hasNext, commitSwipe])

  // ----- Wheel zoom -----
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    setZoom((current) => getNextImageViewerZoom(current, event.deltaY))
  }

  // ----- Image load -----
  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget
    const nextSize = { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height }
    setImageSize(nextSize)
    if (typeof window !== 'undefined') {
      setZoom(getImageViewerFitZoom({
        imageWidth: nextSize.width, imageHeight: nextSize.height,
        viewportWidth: window.innerWidth, viewportHeight: window.innerHeight,
      }))
    } else {
      setZoom((c) => clampImageViewerZoom(c))
    }
  }

  // ----- Open -----
  const openViewer = () => {
    const resetState = getImageViewerResetState()
    setZoom(resetState.zoom)
    setImageSize(null)
    setIsDragging(false)
    setIsSwiping(false)
    setSwipeOffset(0)
    committedRef.current = false
    dragRef.current = null
    setHasNavigated(false)
    if (navigationEnabled && initialItemId) {
      const idx = items.findIndex((item) => item.id === initialItemId)
      setCurrentIndex(idx >= 0 ? idx : 0)
    } else {
      setCurrentIndex(0)
    }
    setOpen(true)
  }

  // ----- Pointer: down -----
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || committedRef.current) return
    const container = scrollRef.current
    if (!container) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: container.scrollLeft,
      startScrollTop: container.scrollTop,
      startTime: Date.now(),
      swipeStarted: false,
    }
  }

  // ----- Pointer: move -----
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    // First significant move — decide swipe vs drag
    if (!isSwiping && !isDragging && !drag.swipeStarted) {
      if (absDx > 5 && absDx > absDy && canSwipe) {
        drag.swipeStarted = true
        setIsSwiping(true)
        if (scrollRef.current) scrollRef.current.setPointerCapture(event.pointerId)
        event.preventDefault()
        setSwipeOffset(dx)
        return
      }
      if (absDx > 3 || absDy > 3) {
        setIsDragging(true)
        if (scrollRef.current) scrollRef.current.setPointerCapture(event.pointerId)
      }
    }

    if (isSwiping) {
      event.preventDefault()
      setSwipeOffset(dx)
      return
    }

    if (isDragging) {
      event.preventDefault()
      const container = scrollRef.current
      if (!container) return
      const nextScroll = getImageViewerDragScrollPosition({
        startScrollLeft: drag.startScrollLeft, startScrollTop: drag.startScrollTop,
        deltaX: dx, deltaY: dy,
      })
      container.scrollLeft = nextScroll.scrollLeft
      container.scrollTop = nextScroll.scrollTop
    }
  }

  // ----- Pointer: up -----
  const endPointer = (pointerId: number) => {
    const container = scrollRef.current
    const drag = dragRef.current
    if (container && drag && drag.pointerId === pointerId) {
      try { container.releasePointerCapture(pointerId) } catch { /* ok */ }
    }

    if (isSwiping && drag) {
      const dx = swipeOffset
      const absDx = Math.abs(dx)
      const elapsed = Date.now() - drag.startTime || 1
      const threshold = vw * SWIPE_COMMIT_RATIO

      if ((absDx > threshold || (absDx / elapsed > 0.5 && absDx > 30))) {
        if (dx > 0 && hasPrev) { commitSwipe(1); dragRef.current = null; setIsDragging(false); setIsSwiping(false); return }
        if (dx < 0 && hasNext) { commitSwipe(-1); dragRef.current = null; setIsDragging(false); setIsSwiping(false); return }
      }
      snapBack()
    }

    dragRef.current = null
    setIsDragging(false)
    setIsSwiping(false)
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    endPointer(event.pointerId)
  }

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    endPointer(event.pointerId)
  }

  // ----- Double-click reset -----
  const handleDoubleClick = () => {
    const resetState = getImageViewerResetState()
    setZoom(resetState.zoom)
    if (scrollRef.current) { scrollRef.current.scrollLeft = 0; scrollRef.current.scrollTop = 0 }
  }

  // ============================================================
  //  OVERLAY
  // ============================================================
  const overlay = open && typeof document !== 'undefined'
    ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={currentTitle}
          className={getImageViewerOverlayClasses()}
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}
        >
          <div className={getImageViewerContentClasses()}>
            {/* Prev / Next buttons */}
            {navigationEnabled && (
              <>
                {hasPrev && (
                  <button type="button" onClick={() => commitSwipe(1)}
                    className="absolute left-4 top-1/2 z-10 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg transition-colors hover:bg-black/80"
                    aria-label="上一张">
                    <ChevronLeft aria-hidden="true" size={24} />
                  </button>
                )}
                {hasNext && (
                  <button type="button" onClick={() => commitSwipe(-1)}
                    className="absolute right-4 top-1/2 z-10 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg transition-colors hover:bg-black/80"
                    aria-label="下一张">
                    <ChevronRight aria-hidden="true" size={24} />
                  </button>
                )}
              </>
            )}

            {/* Close button */}
            <button type="button" onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg transition-colors hover:bg-black/80"
              aria-label="关闭预览">
              <X aria-hidden="true" size={20} />
            </button>

            {/* ---- Strip container ---- */}
            <div className="relative h-full w-full overflow-hidden">
              <div
                className="flex h-full"
                style={{
                  width: navigationEnabled ? `${(1 + (hasPrev ? 1 : 0) + (hasNext ? 1 : 0)) * 100}vw` : '100vw',
                  transform: `translateX(${stripTranslateX}px)`,
                  transition: isSwiping ? 'none' : 'transform 300ms ease-out',
                }}
              >
                {/* Slot: previous image */}
                {hasPrev && (
                  <div className="flex h-full w-screen flex-shrink-0 items-center justify-center bg-black/30 p-8">
                    <img src={prevSrc!} alt="上一张"
                      className={getImageViewerImageClasses()} draggable={false} />
                  </div>
                )}

                {/* Slot: current image (with zoom / pan) */}
                <div
                  ref={scrollRef}
                  className={`flex h-full w-screen flex-shrink-0 items-center justify-center overflow-auto bg-black/30 shadow-2xl ${
                    isDragging ? 'cursor-grabbing' : isSwiping ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
                  style={{ touchAction: 'none' }}
                  onWheel={handleWheel}
                  onDoubleClick={handleDoubleClick}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                >
                  <div className="flex min-h-full min-w-full items-center justify-center p-8">
                    <img
                      key={navigationEnabled ? `${items[currentIndex].id}-${hasNavigated ? 'nav' : 'init'}` : 'single'}
                      src={fullScreenSrc} alt={currentAlt} onLoad={handleImageLoad}
                      className={`${getImageViewerImageClasses()} ${previewImageClassName}`}
                      style={imageSize ? {
                        width: `${Math.max(1, Math.round(imageSize.width * zoom))}px`,
                        height: `${Math.max(1, Math.round(imageSize.height * zoom))}px`,
                      } : undefined}
                      draggable={false}
                    />
                  </div>
                </div>

                {/* Slot: next image */}
                {hasNext && (
                  <div className="flex h-full w-screen flex-shrink-0 items-center justify-center bg-black/30 p-8">
                    <img src={nextSrc!} alt="下一张"
                      className={getImageViewerImageClasses()} draggable={false} />
                  </div>
                )}
              </div>
            </div>

            {/* Zoom badge */}
            <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-xs text-gray-100 shadow-lg">
              {formatImageViewerZoomLabel(zoom)}
            </div>

            {/* Info bar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-xs text-gray-100 shadow-lg">
              {navigationEnabled
                ? `${currentIndex + 1} / ${items.length} · ${currentTitle}`
                : currentTitle}
            </div>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        type="button" onClick={openViewer}
        className={`group relative block overflow-hidden ${className}`}
        aria-label={`查看图片：${alt}`}
      >
        <img src={src} alt={alt} draggable={false} className={imgClassName} />
        <span className="pointer-events-none absolute inset-0 transition-colors group-hover:bg-black/5 dark:group-hover:bg-white/5" />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm dark:bg-black/55">
            点击查看原图
          </span>
        </span>
      </button>
      {overlay}
    </>
  )
}
