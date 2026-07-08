'use client'
/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent, SyntheticEvent, WheelEvent } from 'react'
import { createPortal } from 'react-dom'
import useEmblaCarousel from 'embla-carousel-react'
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

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false }, [])

  const initIndexRef = useRef(0)

  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startScrollLeft: number
    startScrollTop: number
    el: HTMLDivElement
  } | null>(null)

  const navigationEnabled = !!(items && items.length > 1)
  const navigableItems = navigationEnabled ? items : null

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

  // ---- Scroll embla to initial index after init ----
  useEffect(() => {
    if (!emblaApi || !open) return
    const handleInit = () => {
      if (initIndexRef.current > 0) {
        emblaApi.scrollTo(initIndexRef.current, false)
      }
    }
    emblaApi.on('init', handleInit)
    return () => { emblaApi.off('init', handleInit) }
  }, [emblaApi, open])

  // ---- Sync embla with zoom state ----
  useEffect(() => {
    if (emblaApi && open) {
      emblaApi.reInit({ watchDrag: zoom <= 1.05 })
    }
  }, [zoom, emblaApi, open])

  // ---- Track embla slide change ----
  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => {
      const idx = emblaApi.selectedScrollSnap()
      if (idx !== currentIndex) {
        setCurrentIndex(idx)
        // reset zoom when switching slides
        setZoom(1)
        setImageSize(null)
      }
    }
    emblaApi.on('select', onSelect)
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi, currentIndex])

  // ---- Keyboard ----
  useEffect(() => {
    if (!open || typeof document === 'undefined') return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); return }
      if (!navigationEnabled || !emblaApi) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); emblaApi.scrollPrev() }
      if (event.key === 'ArrowRight') { event.preventDefault(); emblaApi.scrollNext() }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, navigationEnabled, emblaApi])

  // ---- Wheel zoom ----
  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    setZoom((current) => getNextImageViewerZoom(current, event.deltaY))
  }, [])

  // ---- Image load (computes fit zoom) ----
  const handleImageLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
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
  }, [])

  // ---- Open viewer ----
  const openViewer = useCallback(() => {
    const resetState = getImageViewerResetState()
    setZoom(resetState.zoom)
    setImageSize(null)
    setIsDragging(false)
    dragRef.current = null

    let initialIdx = 0
    if (navigationEnabled && initialItemId) {
      const idx = items.findIndex((item) => item.id === initialItemId)
      if (idx >= 0) initialIdx = idx
    }
    initIndexRef.current = initialIdx
    setCurrentIndex(initialIdx)
    setOpen(true)
  }, [navigationEnabled, initialItemId, items])

  // ---- Pointer: down (pan within a zoomed image) ----
  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const el = event.currentTarget
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: el.scrollLeft,
      startScrollTop: el.scrollTop,
      el,
    }
    setIsDragging(true)
    el.setPointerCapture(event.pointerId)
  }, [])

  // ---- Pointer: move (pan) ----
  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()

    const nextScroll = getImageViewerDragScrollPosition({
      startScrollLeft: drag.startScrollLeft,
      startScrollTop: drag.startScrollTop,
      deltaX: event.clientX - drag.startX,
      deltaY: event.clientY - drag.startY,
    })
    drag.el.scrollLeft = nextScroll.scrollLeft
    drag.el.scrollTop = nextScroll.scrollTop
  }, [])

  // ---- Pointer: up / cancel ----
  const endDrag = useCallback((pointerId: number) => {
    const drag = dragRef.current
    if (drag && drag.pointerId === pointerId) {
      try { drag.el.releasePointerCapture(pointerId) } catch { /* ok */ }
    }
    dragRef.current = null
    setIsDragging(false)
  }, [])

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    endDrag(event.pointerId)
  }, [endDrag])

  const handlePointerCancel = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    endDrag(event.pointerId)
  }, [endDrag])

  // ---- Double-click: reset zoom ----
  const handleDoubleClick = useCallback(() => {
    const resetState = getImageViewerResetState()
    setZoom(resetState.zoom)
    // reset scroll in all slide containers
    if (emblaApi) {
      emblaApi.slideNodes().forEach((node) => {
        node.scrollLeft = resetState.scrollLeft
        node.scrollTop = resetState.scrollTop
      })
    }
  }, [emblaApi])

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
            {navigationEnabled && emblaApi && (
              <>
                {hasPrev && (
                  <button type="button" onClick={() => emblaApi.scrollPrev()}
                    className="absolute left-4 top-1/2 z-10 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg transition-colors hover:bg-black/80"
                    aria-label="上一张">
                    <ChevronLeft aria-hidden="true" size={24} />
                  </button>
                )}
                {hasNext && (
                  <button type="button" onClick={() => emblaApi.scrollNext()}
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

            {/* ---- Embla Carousel ---- */}
            {navigationEnabled ? (
              <div className="h-full w-full overflow-hidden" ref={emblaRef}>
                <div className="flex h-full">
                  {navigableItems!.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex h-full w-full min-w-0 flex-shrink-0 items-center justify-center overflow-auto bg-black/30 ${
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
                          src={item.previewSrc || item.src}
                          alt={item.alt}
                          onLoad={idx === currentIndex ? handleImageLoad : undefined}
                          className={`${getImageViewerImageClasses()} ${previewImageClassName}`}
                          style={idx === currentIndex && imageSize ? {
                            width: `${Math.max(1, Math.round(imageSize.width * zoom))}px`,
                            height: `${Math.max(1, Math.round(imageSize.height * zoom))}px`,
                          } : undefined}
                          draggable={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ---- Single image (no navigation) ---- */
              <div
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
            )}

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
