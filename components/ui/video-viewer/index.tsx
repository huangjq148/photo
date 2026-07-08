'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize, Minimize, Play, X } from 'lucide-react'

interface VideoViewerProps {
  src: string
  alt: string
  videoSrc: string
  duration?: number
  className?: string
  imgClassName?: string
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideoViewer({
  src,
  alt,
  videoSrc,
  duration,
  className = '',
  imgClassName = '',
}: VideoViewerProps) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => setHover(true), 300)
  }

  const handleMouseLeave = () => {
    clearTimeout(hoverTimer.current)
    setHover(false)
    setPreviewLoaded(false)
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => {})
    }
  }

  // Listen for native fullscreen changes
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        } else {
          setOpen(false)
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const overlay =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label={`播放视频：${alt}`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          >
            {/* Top toolbar */}
            <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
              <p className="truncate pr-4 text-sm font-medium text-white/90">{alt}</p>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
                  aria-label={fullscreen ? '退出全屏' : '全屏'}
                >
                  {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
                  aria-label="关闭"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Video */}
            <video
              src={videoSrc}
              controls
              autoPlay
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Click background to close */}
            <div
              className="absolute inset-0 -z-10 cursor-pointer"
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {})
                }
                setOpen(false)
              }}
            />
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`group relative block overflow-hidden ${className}`}
        aria-label={`播放视频：${alt}`}
      >
        <div className="relative">
          <img
            src={src}
            alt={alt}
            draggable={false}
            className={`${imgClassName} transition-opacity duration-200 ${
              hover && previewLoaded ? 'opacity-0' : 'opacity-100'
            }`}
          />
          {hover && (
            <video
              src={videoSrc}
              muted
              autoPlay
              loop
              playsInline
              onCanPlay={() => setPreviewLoaded(true)}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
                previewLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/60 p-3 backdrop-blur-sm transition-transform group-hover:scale-110">
              <Play size={24} className="text-white" fill="white" />
            </span>
          </span>
        </div>

        {duration != null && duration > 0 ? (
          <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white/90 backdrop-blur-sm">
            {formatDuration(duration)}
          </span>
        ) : null}
      </button>
      {overlay}
    </>
  )
}
