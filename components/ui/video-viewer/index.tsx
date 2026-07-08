'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Play, X } from 'lucide-react'

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
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>()

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => setHover(true), 300)
  }

  const handleMouseLeave = () => {
    clearTimeout(hoverTimer.current)
    setHover(false)
    setPreviewLoaded(false)
  }

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
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
            role="dialog"
            aria-modal="true"
            aria-label={`播放视频：${alt}`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false)
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white shadow-lg transition hover:bg-black/80"
              aria-label="关闭"
            >
              <X size={20} />
            </button>
            <video
              src={videoSrc}
              controls
              autoPlay
              className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
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
