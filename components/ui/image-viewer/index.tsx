'use client'
/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent, SyntheticEvent, WheelEvent } from 'react'
import { createPortal } from 'react-dom'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react'
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
import { getFocusableElements, handleModalKeyDown } from '@/hooks/use-focus-trap'

export interface ImageViewerNavigationItem {
  id: string
  mediaType?: 'image' | 'video'
  src: string
  previewSrc?: string
  videoSrc?: string
  alt: string
  title?: string
}

interface ImageViewerProps {
  src: string
  alt: string
  previewSrc?: string
  videoSrc?: string
  mediaType?: 'image' | 'video'
  className?: string
  imgClassName?: string
  previewImageClassName?: string
  title?: string
  items?: ImageViewerNavigationItem[]
  initialItemId?: string
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

export default function ImageViewer({
  src,
  alt,
  previewSrc,
  videoSrc,
  mediaType = 'image',
  className = '',
  imgClassName = '',
  previewImageClassName = '',
  title = '原图预览',
  items,
  initialItemId,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: ImageViewerProps) {
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [emblaStartIndex, setEmblaStartIndex] = useState(0)

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, startIndex: emblaStartIndex }, [])

  const initIndexRef = useRef(0)
  const imageSizeCacheRef = useRef<Map<string, { width: number; height: number }>>(new Map())
  const overlayRef = useRef<HTMLDivElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)
  const videoRefsRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  const loadMoreTriggeredRef = useRef(false)

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
  const currentMediaType = currentItem?.mediaType || mediaType
  const fullScreenSrc = navigationEnabled && currentItem
    ? (currentItem.previewSrc || currentItem.src)
    : (previewSrc || src)
  const fullScreenVideoSrc = navigationEnabled && currentItem
    ? (currentItem.videoSrc || currentItem.previewSrc || currentItem.src)
    : (videoSrc || previewSrc || src)
  const currentAlt = navigationEnabled && currentItem ? currentItem.alt : alt
  const currentTitle = navigationEnabled && currentItem
    ? (currentItem.title || currentItem.alt)
    : title

  const hasPrev = navigationEnabled && currentIndex > 0
  const hasNext = navigationEnabled && currentIndex < items.length - 1
  const isCurrentVideo = currentMediaType === 'video'

  const getFitZoomForSize = useCallback((size: { width: number; height: number }) => {
    if (typeof window === 'undefined') return clampImageViewerZoom(1)
    return getImageViewerFitZoom({
      imageWidth: size.width,
      imageHeight: size.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    })
  }, [])

  // ---- Scroll embla to initial index after open ----
  useEffect(() => {
    if (!emblaApi || !open) return
    const raf = requestAnimationFrame(() => {
      emblaApi.scrollTo(initIndexRef.current, true)
    })
    return () => cancelAnimationFrame(raf)
  }, [emblaApi, open])

  // ---- Focus trap & scroll lock (restore focus on close) ----
  useEffect(() => {
    if (!open || !overlayRef.current) return

    previousActiveElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    window.requestAnimationFrame(() => {
      overlayRef.current?.focus()
    })

    return () => {
      document.body.style.overflow = previousOverflow
      window.requestAnimationFrame(() => {
        previousActiveElementRef.current?.focus()
        previousActiveElementRef.current = null
      })
    }
  }, [open])

  // ---- Sync embla with zoom state ----
  useEffect(() => {
    if (emblaApi && open) {
      emblaApi.reInit({ watchDrag: zoom <= 1.05 })
    }
  }, [zoom, emblaApi, open])

  // ---- Track embla slide change ----
  useEffect(() => {
    if (!emblaApi || !navigableItems) return
    const onSelect = () => {
      const idx = emblaApi.selectedScrollSnap()
      if (idx !== currentIndex) {
        setCurrentIndex(idx)
        const nextItem = navigableItems[idx]
        if (nextItem.mediaType === 'video') {
          setZoom(getImageViewerResetState().zoom)
          setImageSize(null)
        } else {
          const cached = imageSizeCacheRef.current.get(nextItem.id)
          if (cached) {
            setImageSize(cached)
            setZoom(getFitZoomForSize(cached))
          } else {
            setZoom(getImageViewerResetState().zoom)
            setImageSize(null)
          }
        }
        const slideNode = emblaApi.slideNodes()[idx]
        if (slideNode) { slideNode.scrollLeft = 0; slideNode.scrollTop = 0 }
      }
    }
    emblaApi.on('select', onSelect)
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi, currentIndex, getFitZoomForSize, navigableItems])

  // ---- Pause video when navigating away ----
  useEffect(() => {
    if (!navigableItems || !open) return
    videoRefsRef.current.forEach((videoEl, id) => {
      if (id !== navigableItems[currentIndex]?.id) {
        videoEl.pause()
      }
    })
  }, [currentIndex, open, navigableItems])

  // ---- Load more when approaching last item ----
  useEffect(() => {
    if (!open || !hasMore || loadingMore || !onLoadMore || !navigableItems) return
    if (currentIndex >= navigableItems.length - 2 && !loadMoreTriggeredRef.current) {
      loadMoreTriggeredRef.current = true
      onLoadMore()
    }
    if (currentIndex < navigableItems.length - 3) {
      loadMoreTriggeredRef.current = false
    }
  }, [currentIndex, open, hasMore, loadingMore, onLoadMore, navigableItems])

  // ---- Keyboard (focus trap + zoom shortcuts + nav) ----
  useEffect(() => {
    if (!open || typeof document === 'undefined') return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Focus trap: Tab cycling within overlay
      if (event.key === 'Tab') {
        event.preventDefault()
        const focusables = getFocusableElements(overlayRef.current)
        const currentFocus = document.activeElement as HTMLElement | null
        const currentIndexVal = currentFocus ? focusables.indexOf(currentFocus) : -1
        const nextIndex = handleModalKeyDown(
          { key: 'Tab', shiftKey: event.shiftKey, preventDefault: () => {} } as React.KeyboardEvent,
          focusables,
          currentIndexVal,
          () => setOpen(false),
          overlayRef.current,
        )
        if (nextIndex >= 0 && focusables[nextIndex]) {
          focusables[nextIndex].focus()
        }
        return
      }

      if (event.key === 'Escape') { setOpen(false); return }

      // Zoom shortcuts (+ / - / 0)
      if (!isCurrentVideo) {
        if (event.key === '+' || event.key === '=') {
          event.preventDefault()
          setZoom((current) => clampImageViewerZoom(current * 1.25))
          return
        }
        if (event.key === '-') {
          event.preventDefault()
          setZoom((current) => clampImageViewerZoom(current / 1.25))
          return
        }
        if (event.key === '0') {
          event.preventDefault()
          const resetState = getImageViewerResetState()
          setZoom(imageSize ? getFitZoomForSize(imageSize) : resetState.zoom)
          if (emblaApi) {
            emblaApi.slideNodes().forEach((node) => {
              node.scrollLeft = resetState.scrollLeft
              node.scrollTop = resetState.scrollTop
            })
          }
          return
        }
      }

      // Arrow navigation
      if (!navigationEnabled || !emblaApi) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); emblaApi.scrollPrev() }
      if (event.key === 'ArrowRight') { event.preventDefault(); emblaApi.scrollNext() }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, navigationEnabled, emblaApi, isCurrentVideo, imageSize, getFitZoomForSize])

  // ---- Wheel zoom (only when not video and zoomed) ----
  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    setZoom((current) => getNextImageViewerZoom(current, event.deltaY))
  }, [])

  // ---- Image load (computes fit zoom & caches size) ----
  const handleImageLoad = useCallback((itemId: string, active = true) => (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget
    const nextSize = { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height }
    imageSizeCacheRef.current.set(itemId, nextSize)
    if (!active) return
    setImageSize(nextSize)
    setZoom(getFitZoomForSize(nextSize))
  }, [getFitZoomForSize])

  // ---- Open viewer ----
  const openViewer = useCallback(() => {
    const resetState = getImageViewerResetState()
    setZoom(resetState.zoom)
    setImageSize(null)
    setIsDragging(false)
    imageSizeCacheRef.current.clear()
    dragRef.current = null
    loadMoreTriggeredRef.current = false

    let initialIdx = 0
    if (navigationEnabled && initialItemId) {
      const idx = items.findIndex((item) => item.id === initialItemId)
      if (idx >= 0) initialIdx = idx
    }
    initIndexRef.current = initialIdx
    setEmblaStartIndex(initialIdx)
    setCurrentIndex(initialIdx)
    setOpen(true)
  }, [navigationEnabled, initialItemId, items])

  // ---- Pointer: down (pan within a zoomed image) ----
  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || zoom <= 1.05) return
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
  }, [zoom])

  // ---- Pointer: move (pan when zoomed) ----
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
    if (isCurrentVideo) return
    setZoom(imageSize ? getFitZoomForSize(imageSize) : resetState.zoom)
    if (emblaApi) {
      emblaApi.slideNodes().forEach((node) => {
        node.scrollLeft = resetState.scrollLeft
        node.scrollTop = resetState.scrollTop
      })
    }
  }, [emblaApi, getFitZoomForSize, imageSize, isCurrentVideo])

  // Video ref callback
  const setVideoRef = useCallback((id: string) => (el: HTMLVideoElement | null) => {
    if (el) {
      videoRefsRef.current.set(id, el)
    } else {
      videoRefsRef.current.delete(id)
    }
  }, [])

  // ============================================================
  //  OVERLAY
  // ============================================================
  const overlay = open && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label={currentTitle}
          tabIndex={-1}
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

                {/* Load more indicator */}
                {loadingMore && (
                  <div className="absolute right-4 top-1/2 z-10 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg">
                    <Loader2 aria-hidden="true" size={24} className="animate-spin" />
                  </div>
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
                    item.mediaType === 'video' ? (
                      <div
                        key={item.id}
                        className="flex h-full w-full min-w-0 flex-shrink-0 items-center justify-center overflow-hidden bg-black/30"
                      >
                        <div className="flex h-full w-full items-center justify-center p-8">
                          <video
                            ref={setVideoRef(item.id)}
                            src={item.videoSrc || item.previewSrc || item.src}
                            poster={item.src}
                            controls
                            playsInline
                            preload="metadata"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                    <div
                      key={item.id}
                      className={`flex h-full w-full min-w-0 flex-shrink-0 items-center justify-center overflow-auto bg-black/30 ${
                        isDragging ? 'cursor-grabbing' : zoom > 1.05 ? 'cursor-grab' : ''
                      }`}
                      style={{ touchAction: zoom > 1.05 ? 'none' : 'pan-y pinch-zoom' }}
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
                          onLoad={handleImageLoad(item.id, idx === currentIndex)}
                          className={
                            idx === currentIndex
                              ? `${getImageViewerImageClasses()} ${previewImageClassName}`
                              : `max-h-full max-w-full object-contain ${previewImageClassName}`
                          }
                          style={idx === currentIndex && imageSize ? {
                            width: `${Math.max(1, Math.round(imageSize.width * zoom))}px`,
                            height: `${Math.max(1, Math.round(imageSize.height * zoom))}px`,
                          } : undefined}
                          draggable={false}
                        />
                      </div>
                    </div>
                    )
                  ))}
                </div>
              </div>
            ) : (
              /* ---- Single media item (no navigation) ---- */
              <div
                className={`flex h-full w-full items-center justify-center ${isCurrentVideo ? 'overflow-hidden' : 'overflow-auto'} bg-black/30 shadow-2xl ${
                  isDragging ? 'cursor-grabbing' : zoom > 1.05 ? 'cursor-grab' : ''
                }`}
                style={{ touchAction: isCurrentVideo ? 'auto' : zoom > 1.05 ? 'none' : 'pan-y pinch-zoom' }}
                onWheel={isCurrentVideo ? undefined : handleWheel}
                onDoubleClick={isCurrentVideo ? undefined : handleDoubleClick}
                onPointerDown={isCurrentVideo ? undefined : handlePointerDown}
                onPointerMove={isCurrentVideo ? undefined : handlePointerMove}
                onPointerUp={isCurrentVideo ? undefined : handlePointerUp}
                onPointerCancel={isCurrentVideo ? undefined : handlePointerCancel}
              >
                <div className="flex min-h-full min-w-full items-center justify-center p-8">
                  {isCurrentVideo ? (
                    <video
                      src={fullScreenVideoSrc}
                      poster={src}
                      controls
                      playsInline
                      preload="metadata"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <img
                      src={fullScreenSrc} alt={currentAlt}
                      onLoad={handleImageLoad('_single')}
                      className={`${getImageViewerImageClasses()} ${previewImageClassName}`}
                      style={imageSize ? {
                        width: `${Math.max(1, Math.round(imageSize.width * zoom))}px`,
                        height: `${Math.max(1, Math.round(imageSize.height * zoom))}px`,
                      } : undefined}
                      draggable={false}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Zoom badge */}
            {!isCurrentVideo && (
              <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-xs text-gray-100 shadow-lg">
                {formatImageViewerZoomLabel(zoom)}
              </div>
            )}

            {/* Keyboard hint */}
            {!isCurrentVideo && (
              <div className="absolute left-4 top-16 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] text-gray-400">
                +/-/0 缩放&nbsp;&nbsp;←→ 切换
              </div>
            )}

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
            {mediaType === 'video' ? '点击播放视频' : '点击查看原图'}
          </span>
        </span>
      </button>
      {overlay}
    </>
  )
}
