"use client"
/* eslint-disable @next/next/no-img-element */

import React, { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Loader2, Play, X } from "lucide-react"
import { formatDuration } from "./format"
import { useVideoControls } from "./use-video-controls"
import VideoControls from "./controls"

interface VideoViewerProps {
  src: string
  alt: string
  videoSrc: string
  duration?: number
  className?: string
  imgClassName?: string
}

export default function VideoViewer({
  src,
  alt,
  videoSrc,
  duration,
  className = "",
  imgClassName = "",
}: VideoViewerProps) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [browserFullscreen, setBrowserFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const isTouchDevice = useRef(false)

  // Detect touch device on mount
  useEffect(() => {
    isTouchDevice.current = "ontouchstart" in window
  }, [])

  const handleClose = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    setOpen(false)
  }, [])

  const controls = useVideoControls(videoRef, handleClose)

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

  const toggleBrowserFullscreen = () => {
    setBrowserFullscreen((prev) => !prev)
    resetControlsTimer()
  }

  // Auto-hide controls after inactivity
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideControlsTimer.current)
    if (isTouchDevice.current) return
    hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  // Listen for native fullscreen changes
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  // Modal lifecycle
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    resetControlsTimer()

    return () => {
      document.body.style.overflow = prev
      clearTimeout(hideControlsTimer.current)
    }
  }, [open, resetControlsTimer])

  const overlay =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label={`播放视频：${alt}`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
            onMouseMove={resetControlsTimer}
            onPointerDown={() => setShowControls(true)}
          >
            {/* Top toolbar */}
            <div
              className={`absolute left-0 right-0 top-0 z-[60] flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 py-3 transition-opacity duration-300 ${
                showControls ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <p className="truncate pr-4 text-sm font-medium text-white/90">{alt}</p>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>

            {/* Video */}
            <video
              ref={videoRef}
              src={videoSrc}
              autoPlay
              playsInline
              className={`${
                showControls ? "" : "cursor-none"
              } ${
                browserFullscreen
                  ? "fixed inset-0 z-50 h-full w-full object-contain"
                  : "max-h-full max-w-full object-contain"
              }`}
              onClick={(e) => {
                e.stopPropagation()
                controls.togglePlay()
              }}
            />

            {/* Loading spinner */}
            {controls.isLoading && !controls.hasError && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Loader2 size={48} className="animate-spin text-white/60" />
              </div>
            )}

            {/* Error overlay */}
            {controls.hasError && (
              <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-black/80">
                <p className="text-sm text-white/70">{controls.errorMessage}</p>
                <button
                  type="button"
                  onClick={controls.retry}
                  className="rounded-full bg-white/15 px-5 py-2 text-sm text-white transition hover:bg-white/25"
                >
                  重试
                </button>
              </div>
            )}

            {/* Center play button — shown when paused and not loading/error */}
            {!controls.playing && !controls.isLoading && !controls.hasError && (
              <button
                type="button"
                onClick={controls.togglePlay}
                className="absolute inset-0 z-[60] flex items-center justify-center"
                aria-label="播放"
              >
                <span className="rounded-full bg-black/50 p-4 backdrop-blur-sm transition-transform hover:scale-110">
                  <Play size={40} className="text-white" fill="white" />
                </span>
              </button>
            )}

            {/* Custom control bar */}
            <div
              className={`transition-opacity duration-300 ${
                showControls ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <VideoControls
                {...controls}
                fullscreen={fullscreen}
                browserFullscreen={browserFullscreen}
                onToggleFullscreen={toggleFullscreen}
                onToggleBrowserFullscreen={toggleBrowserFullscreen}
              />
            </div>

            {/* Bottom hint when controls hidden */}
            <div
              className={`pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-xs text-white/60 backdrop-blur-sm transition-opacity duration-500 ${
                showControls ? "opacity-0" : "opacity-100"
              }`}
            >
              移动鼠标显示控制栏 · 点击播放/暂停
            </div>

            {/* Click background to close */}
            <div className="absolute inset-0 -z-10" />
          </div>,
          document.body
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
              hover && previewLoaded ? "opacity-0" : "opacity-100"
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
                previewLoaded ? "opacity-100" : "opacity-0"
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
