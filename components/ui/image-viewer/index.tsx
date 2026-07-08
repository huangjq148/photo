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
  /** 用于导航切换的同组照片列表（提供后启用左右切换） */
  items?: ImageViewerNavigationItem[]
  /** 当前照片在 items 中的 id，用于定位初始索引 */
  initialItemId?: string
}

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

  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startScrollLeft: number
    startScrollTop: number
    startTime: number
  } | null>(null)
  const swipeDeltaRef = useRef<{ dx: number; dy: number; time: number } | null>(null)

  const navigationEnabled = items && items.length > 1

  // derive display item from nav state or props
  const currentItem = navigationEnabled
    ? items[currentIndex]
    : null
  const fullScreenSrc = navigationEnabled && currentItem
    ? (currentItem.previewSrc || currentItem.src)
    : (previewSrc || src)
  const currentAlt = navigationEnabled && currentItem ? currentItem.alt : alt
  const currentTitle = navigationEnabled && currentItem
    ? (currentItem.title || currentItem.alt)
    : title

  const hasPrev = navigationEnabled && currentIndex > 0
  const hasNext = navigationEnabled && currentIndex < items.length - 1

  const navigateTo = useCallback((index: number) => {
    if (!navigationEnabled || index < 0 || index >= items.length) return
    setCurrentIndex(index)
    setHasNavigated(true)
    // reset zoom & scroll for new image
    setZoom(1)
    setImageSize(null)
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0
      scrollRef.current.scrollTop = 0
    }
  }, [navigationEnabled, items])

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }

      // Arrow navigation when viewer is open and items provided
      if (navigationEnabled) {
        if (event.key === 'ArrowLeft' && hasPrev) {
          event.preventDefault()
          navigateTo(currentIndex - 1)
          return
        }
        if (event.key === 'ArrowRight' && hasNext) {
          event.preventDefault()
          navigateTo(currentIndex + 1)
          return
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, navigationEnabled, hasPrev, hasNext, currentIndex, navigateTo])

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    setZoom((current) => getNextImageViewerZoom(current, event.deltaY))
  }

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget
    const nextSize = {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    }
    setImageSize(nextSize)

    if (typeof window !== 'undefined') {
      const fitZoom = getImageViewerFitZoom({
        imageWidth: nextSize.width,
        imageHeight: nextSize.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      })
      setZoom(fitZoom)
      return
    }

    setZoom((current) => clampImageViewerZoom(current))
  }

  const openViewer = () => {
    const resetState = getImageViewerResetState()
    setZoom(resetState.zoom)
    setImageSize(null)
    setIsDragging(false)
    dragRef.current = null
    swipeDeltaRef.current = null
    setHasNavigated(false)

    // find initial index from items
    if (navigationEnabled && initialItemId) {
      const idx = items.findIndex((item) => item.id === initialItemId)
      setCurrentIndex(idx >= 0 ? idx : 0)
    } else {
      setCurrentIndex(0)
    }

    setOpen(true)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }

    const container = scrollRef.current
    if (!container) {
      return
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: container.scrollLeft,
      startScrollTop: container.scrollTop,
      startTime: Date.now(),
    }
    swipeDeltaRef.current = null
    setIsDragging(true)
    container.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const container = scrollRef.current

    if (!drag || !container || drag.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY

    // track accumulated swipe delta for swipe detection
    swipeDeltaRef.current = {
      dx,
      dy,
      time: Date.now() - drag.startTime,
    }

    const nextScroll = getImageViewerDragScrollPosition({
      startScrollLeft: drag.startScrollLeft,
      startScrollTop: drag.startScrollTop,
      deltaX: dx,
      deltaY: dy,
    })

    container.scrollLeft = nextScroll.scrollLeft
    container.scrollTop = nextScroll.scrollTop
  }

  const endDragging = (pointerId?: number) => {
    const container = scrollRef.current
    const drag = dragRef.current

    if (container && drag && (pointerId === undefined || drag.pointerId === pointerId)) {
      try {
        container.releasePointerCapture(drag.pointerId)
      } catch {
        // Ignore capture release errors when the pointer is already gone.
      }
    }

    dragRef.current = null
    setIsDragging(false)
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return
    }

    // detect swipe for navigation
    if (navigationEnabled) {
      const swipe = swipeDeltaRef.current
      if (swipe) {
        const absDx = Math.abs(swipe.dx)
        const absDy = Math.abs(swipe.dy)
        const velocity = swipe.time > 0 ? absDx / swipe.time : 0

        // swipe: primarily horizontal, fast enough, and enough distance
        if (absDx > absDy && absDx > 40 && (velocity > 0.3 || absDx > 120)) {
          if (swipe.dx < 0 && hasNext) {
            navigateTo(currentIndex + 1)
            endDragging(event.pointerId)
            return
          }
          if (swipe.dx > 0 && hasPrev) {
            navigateTo(currentIndex - 1)
            endDragging(event.pointerId)
            return
          }
        }
      }
    }

    endDragging(event.pointerId)
  }

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return
    }

    endDragging(event.pointerId)
  }

  const handleDoubleClick = () => {
    const resetState = getImageViewerResetState()
    setZoom(resetState.zoom)
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = resetState.scrollLeft
      scrollRef.current.scrollTop = resetState.scrollTop
    }
  }

  const overlay = open && typeof document !== 'undefined'
    ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={currentTitle}
          className={getImageViewerOverlayClasses()}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false)
            }
          }}
        >
          <div className={getImageViewerContentClasses()}>
            {/* Prev / Next navigation arrows */}
            {navigationEnabled && (
              <>
                {hasPrev && (
                  <button
                    type="button"
                    onClick={() => navigateTo(currentIndex - 1)}
                    className="absolute left-4 top-1/2 z-10 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg transition-colors hover:bg-black/80"
                    aria-label="上一张"
                  >
                    <ChevronLeft aria-hidden="true" size={24} />
                  </button>
                )}
                {hasNext && (
                  <button
                    type="button"
                    onClick={() => navigateTo(currentIndex + 1)}
                    className="absolute right-4 top-1/2 z-10 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg transition-colors hover:bg-black/80"
                    aria-label="下一张"
                  >
                    <ChevronRight aria-hidden="true" size={24} />
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg transition-colors hover:bg-black/80"
              aria-label="关闭预览"
            >
              <X aria-hidden="true" size={20} />
            </button>

            <div
              ref={scrollRef}
              className={`flex h-full w-full items-center justify-center overflow-auto bg-black/30 shadow-2xl ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
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
                  src={fullScreenSrc}
                  alt={currentAlt}
                  onLoad={handleImageLoad}
                  className={`${getImageViewerImageClasses()} ${previewImageClassName}`}
                  style={
                    imageSize
                      ? {
                          width: `${Math.max(1, Math.round(imageSize.width * zoom))}px`,
                          height: `${Math.max(1, Math.round(imageSize.height * zoom))}px`,
                        }
                      : undefined
                  }
                  draggable={false}
                />
              </div>
            </div>

            <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-xs text-gray-100 shadow-lg">
              {formatImageViewerZoomLabel(zoom)}
            </div>

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
        type="button"
        onClick={openViewer}
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
