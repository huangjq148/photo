'use client'
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useRef, useState } from 'react'
import type { PointerEvent, SyntheticEvent, WheelEvent } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import {
  getImageViewerContentClasses,
  getImageViewerImageClasses,
  getImageViewerOverlayClasses,
} from './layout'
import {
  clampImageViewerZoom,
  formatImageViewerZoomLabel,
  getNextImageViewerZoom,
} from './zoom'
import {
  getImageViewerDragScrollPosition,
  getImageViewerResetState,
} from './interactions'

interface ImageViewerProps {
  src: string
  alt: string
  previewSrc?: string
  className?: string
  imgClassName?: string
  previewImageClassName?: string
  title?: string
}

export default function ImageViewer({
  src,
  alt,
  previewSrc,
  className = '',
  imgClassName = '',
  previewImageClassName = '',
  title = '原图预览',
}: ImageViewerProps) {
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fullScreenSrc = previewSrc || src
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startScrollLeft: number
    startScrollTop: number
  } | null>(null)

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    setZoom((current) => getNextImageViewerZoom(current, event.deltaY))
  }

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget
    setImageSize({
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    })
    setZoom((current) => clampImageViewerZoom(current))
  }

  const openViewer = () => {
    const resetState = getImageViewerResetState()
    setZoom(resetState.zoom)
    setImageSize(null)
    setIsDragging(false)
    dragRef.current = null
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
    }
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

    const nextScroll = getImageViewerDragScrollPosition({
      startScrollLeft: drag.startScrollLeft,
      startScrollTop: drag.startScrollTop,
      deltaX: event.clientX - drag.startX,
      deltaY: event.clientY - drag.startY,
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
          aria-label={title}
          className={getImageViewerOverlayClasses()}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false)
            }
          }}
        >
          <div className={getImageViewerContentClasses()}>
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
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              <div className="flex min-h-full min-w-full items-center justify-center p-8">
                <img
                  src={fullScreenSrc}
                  alt={alt}
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
              {title}
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
