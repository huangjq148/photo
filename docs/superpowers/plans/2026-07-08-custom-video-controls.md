# Custom Video Controls — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser-native `<video controls>` in `VideoViewer` modal with a fully custom control bar (play/pause, seek with buffer, volume, speed, PiP, keyboard shortcuts, loading/error states).

**Architecture:** Extract time formatting into `format.ts`, video DOM logic into `use-video-controls.ts` hook, control bar UI into `controls.tsx`, then wire them into the existing `index.tsx` modal — removing `controls` attribute and replacing it with the new components.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, lucide-react, Vitest + React Testing Library

---

### Task 1: Create format.ts — time formatting utility

**Files:**
- Create: `components/ui/video-viewer/format.ts`

- [ ] **Step 1: Write format.ts**

```ts
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return ""
  return formatTime(seconds)
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/video-viewer/format.ts
git commit -m "feat: add video time formatting utility"
```

---

### Task 2: Create use-video-controls.ts — video DOM API hook

**Files:**
- Create: `components/ui/video-viewer/use-video-controls.ts`

- [ ] **Step 1: Write use-video-controls.ts**

```ts
"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface VideoControlsState {
  playing: boolean
  currentTime: number
  duration: number
  buffered: number // 0–100 percentage
  volume: number
  muted: boolean
  speed: number
  isPiP: boolean
  isLoading: boolean
  hasError: boolean
  errorMessage: string
}

export interface VideoControlsActions {
  togglePlay: () => void
  seek: (time: number) => void
  seekPercent: (percent: number) => void
  setVolume: (vol: number) => void
  toggleMute: () => void
  setSpeed: (speed: number) => void
  togglePiP: () => void
  retry: () => void
}

export function useVideoControls(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onClose: () => void
): VideoControlsState & VideoControlsActions {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeedState] = useState(1)
  const [isPiP, setIsPiP] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const speedRef = useRef(1)
  const volumeRef = useRef(1)

  const getVideo = useCallback(() => videoRef.current, [videoRef])

  // --- Event listeners ---
  useEffect(() => {
    const video = getVideo()
    if (!video) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => setPlaying(false)

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      // Update buffered
      if (video.buffered.length > 0) {
        const end = video.buffered.end(video.buffered.length - 1)
        if (video.duration > 0) {
          setBuffered((end / video.duration) * 100)
        }
      }
    }

    const onLoadedMetadata = () => {
      setDuration(video.duration)
      setIsLoading(false)
    }

    const onWaiting = () => setIsLoading(true)
    const onCanPlay = () => setIsLoading(false)

    const onVolumeChange = () => {
      setVolumeState(video.volume)
      setMuted(video.muted)
    }

    const onRateChange = () => setSpeedState(video.playbackRate)

    const onError = () => {
      const err = video.error
      setHasError(true)
      setIsLoading(false)
      if (err) {
        switch (err.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            setErrorMessage("视频加载已中止")
            break
          case MediaError.MEDIA_ERR_NETWORK:
            setErrorMessage("网络错误，无法加载视频")
            break
          case MediaError.MEDIA_ERR_DECODE:
            setErrorMessage("视频解码失败")
            break
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            setErrorMessage("不支持的视频格式")
            break
          default:
            setErrorMessage("视频播放出错")
        }
      }
    }

    const onEnterPiP = () => setIsPiP(true)
    const onLeavePiP = () => setIsPiP(false)

    video.addEventListener("play", onPlay)
    video.addEventListener("pause", onPause)
    video.addEventListener("ended", onEnded)
    video.addEventListener("timeupdate", onTimeUpdate)
    video.addEventListener("loadedmetadata", onLoadedMetadata)
    video.addEventListener("waiting", onWaiting)
    video.addEventListener("canplay", onCanPlay)
    video.addEventListener("volumechange", onVolumeChange)
    video.addEventListener("ratechange", onRateChange)
    video.addEventListener("error", onError)
    video.addEventListener("enterpictureinpicture", onEnterPiP)
    video.addEventListener("leavepictureinpicture", onLeavePiP)

    return () => {
      video.removeEventListener("play", onPlay)
      video.removeEventListener("pause", onPause)
      video.removeEventListener("ended", onEnded)
      video.removeEventListener("timeupdate", onTimeUpdate)
      video.removeEventListener("loadedmetadata", onLoadedMetadata)
      video.removeEventListener("waiting", onWaiting)
      video.removeEventListener("canplay", onCanPlay)
      video.removeEventListener("volumechange", onVolumeChange)
      video.removeEventListener("ratechange", onRateChange)
      video.removeEventListener("error", onError)
      video.removeEventListener("enterpictureinpicture", onEnterPiP)
      video.removeEventListener("leavepictureinpicture", onLeavePiP)
    }
  }, [getVideo])

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = getVideo()
      if (!video) return

      // Don't capture if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault()
          if (video.paused) video.play().catch(() => {})
          else video.pause()
          break
        case "ArrowLeft":
          e.preventDefault()
          video.currentTime = Math.max(0, video.currentTime - 5)
          break
        case "ArrowRight":
          e.preventDefault()
          video.currentTime = Math.min(video.duration, video.currentTime + 5)
          break
        case "ArrowUp":
          e.preventDefault()
          video.volume = Math.min(1, video.volume + 0.05)
          break
        case "ArrowDown":
          e.preventDefault()
          video.volume = Math.max(0, video.volume - 0.05)
          break
        case "m":
          video.muted = !video.muted
          break
        case "f":
          e.preventDefault()
          // handled by parent's toggleFullscreen
          break
        case ">":
          e.preventDefault()
          video.playbackRate = Math.min(2, video.playbackRate + 0.25)
          break
        case "<":
          e.preventDefault()
          video.playbackRate = Math.max(0.25, video.playbackRate - 0.25)
          break
        case "i":
          e.preventDefault()
          if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => {})
          } else {
            video.requestPictureInPicture().catch(() => {})
          }
          break
        case "Escape":
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {})
          } else {
            onClose()
          }
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [getVideo, onClose])

  // --- Actions ---
  const togglePlay = useCallback(() => {
    const video = getVideo()
    if (!video) return
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }, [getVideo])

  const seek = useCallback((time: number) => {
    const video = getVideo()
    if (!video) return
    video.currentTime = time
  }, [getVideo])

  const seekPercent = useCallback((percent: number) => {
    const video = getVideo()
    if (!video || !video.duration) return
    video.currentTime = (percent / 100) * video.duration
  }, [getVideo])

  const setVolume = useCallback((vol: number) => {
    const video = getVideo()
    if (!video) return
    video.volume = vol
    video.muted = vol === 0
    volumeRef.current = vol
  }, [getVideo])

  const toggleMute = useCallback(() => {
    const video = getVideo()
    if (!video) return
    video.muted = !video.muted
  }, [getVideo])

  const setSpeed = useCallback((s: number) => {
    const video = getVideo()
    if (!video) return
    video.playbackRate = s
    speedRef.current = s
  }, [getVideo])

  const togglePiP = useCallback(async () => {
    const video = getVideo()
    if (!video) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await video.requestPictureInPicture()
      }
    } catch {
      // PiP not supported
    }
  }, [getVideo])

  const retry = useCallback(() => {
    const video = getVideo()
    if (!video) return
    setHasError(false)
    setErrorMessage("")
    setIsLoading(true)
    video.load()
    video.play().catch(() => {})
  }, [getVideo])

  return {
    playing,
    currentTime,
    duration,
    buffered,
    volume,
    muted,
    speed,
    isPiP,
    isLoading,
    hasError,
    errorMessage,
    togglePlay,
    seek,
    seekPercent,
    setVolume,
    toggleMute,
    setSpeed,
    togglePiP,
    retry,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/video-viewer/use-video-controls.ts
git commit -m "feat: add useVideoControls hook"
```

---

### Task 3: Create controls.tsx — custom control bar UI

**Files:**
- Create: `components/ui/video-viewer/controls.tsx`

- [ ] **Step 1: Write controls.tsx**

```tsx
"use client"

import React, { useCallback, useRef, useState } from "react"
import {
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react"
import { formatTime } from "./format"
import type { VideoControlsActions, VideoControlsState } from "./use-video-controls"

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]

interface VideoControlsProps extends VideoControlsState, VideoControlsActions {
  fullscreen: boolean
  browserFullscreen: boolean
  onToggleFullscreen: () => void
  onToggleBrowserFullscreen: () => void
}

export default function VideoControls({
  playing,
  currentTime,
  duration,
  buffered,
  volume,
  muted,
  speed,
  isPiP,
  fullscreen,
  browserFullscreen,
  togglePlay,
  seekPercent,
  setVolume,
  toggleMute,
  setSpeed,
  togglePiP,
  onToggleFullscreen,
  onToggleBrowserFullscreen,
}: VideoControlsProps) {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const percent = ((e.clientX - rect.left) / rect.width) * 100
      seekPercent(Math.max(0, Math.min(100, percent)))
    },
    [seekPercent]
  )

  const handleProgressPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setIsSeeking(true)
      const rect = e.currentTarget.getBoundingClientRect()
      const percent = ((e.clientX - rect.left) / rect.width) * 100
      seekPercent(Math.max(0, Math.min(100, percent)))
    },
    [seekPercent]
  )

  const handleProgressPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isSeeking) return
      const rect = e.currentTarget.getBoundingClientRect()
      const percent = ((e.clientX - rect.left) / rect.width) * 100
      seekPercent(Math.max(0, Math.min(100, percent)))
    },
    [isSeeking, seekPercent]
  )

  const handleProgressPointerUp = useCallback(() => {
    setIsSeeking(false)
  }, [])

  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[60] flex flex-col bg-gradient-to-t from-black/80 to-transparent pt-8 pb-2 px-4"
      onPointerUp={handleProgressPointerUp}
    >
      {/* Progress bar */}
      <div
        ref={progressRef}
        className="group/progress relative mb-2 h-5 w-full cursor-pointer"
        onClick={handleProgressClick}
        onPointerDown={handleProgressPointerDown}
        onPointerMove={handleProgressPointerMove}
      >
        {/* Track background */}
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/20 group-hover/progress:h-1.5">
          {/* Buffered */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/30"
            style={{ width: `${buffered}%` }}
          />
          {/* Played */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent,#3b82f6)]"
            style={{ width: `${playedPercent}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/progress:opacity-100"
            style={{ left: `${playedPercent}%` }}
          />
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-1 text-white">
        {/* Play/Pause */}
        <button
          type="button"
          onClick={togglePlay}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white"
          aria-label={playing ? "暂停" : "播放"}
        >
          {playing ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
        </button>

        {/* Current time */}
        <span className="min-w-[40px] text-center text-xs font-mono tabular-nums text-white/80">
          {formatTime(currentTime)}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Duration */}
        <span className="text-xs font-mono tabular-nums text-white/80">
          {formatTime(duration)}
        </span>

        {/* Volume */}
        <div
          className="relative"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          <button
            type="button"
            onClick={toggleMute}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white"
            aria-label={muted ? "取消静音" : "静音"}
          >
            {muted || volume === 0 ? (
              <VolumeX size={18} />
            ) : volume < 0.5 ? (
              <Volume1 size={18} />
            ) : (
              <Volume2 size={18} />
            )}
          </button>
          {showVolumeSlider && (
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg bg-black/90 p-2 shadow-xl backdrop-blur">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="h-20 w-1 cursor-pointer appearance-none bg-white/20 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                style={{ WebkitAppearance: "slider-vertical", writingMode: "vertical-lr" }}
                aria-label="音量"
              />
            </div>
          )}
        </div>

        {/* Speed */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSpeedMenu((v) => !v)}
            className="inline-flex h-9 items-center justify-center rounded-full px-2 text-xs font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
            aria-label="播放速度"
          >
            {speed}x
          </button>
          {showSpeedMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSpeedMenu(false)}
              />
              <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg bg-black/90 p-1 shadow-xl backdrop-blur">
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSpeed(s)
                      setShowSpeedMenu(false)
                    }}
                    className={`block w-full rounded-md px-3 py-1.5 text-left text-xs transition ${
                      speed === s
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* PiP */}
        <button
          type="button"
          onClick={togglePiP}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
            isPiP
              ? "bg-white/15 text-white"
              : "text-white/90 hover:bg-white/10 hover:text-white"
          }`}
          aria-label="画中画"
        >
          <PictureInPicture2 size={18} />
        </button>

        {/* Browser fullscreen */}
        <button
          type="button"
          onClick={onToggleBrowserFullscreen}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
            browserFullscreen
              ? "bg-white/15 text-white"
              : "text-white/90 hover:bg-white/10 hover:text-white"
          }`}
          aria-label={browserFullscreen ? "退出浏览器全屏" : "浏览器全屏"}
        >
          <PictureInPicture2 size={18} />
        </button>

        {/* Monitor fullscreen */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10 hover:text-white"
          aria-label={fullscreen ? "退出全屏" : "全屏"}
        >
          {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>
    </div>
  )
}
```

> **Note:** The browser fullscreen icon used above (`PictureInPicture2`) is a placeholder — we use a different icon. Let's fix this in the next step by using the `Expand` icon from lucide-react as the existing code does.

- [ ] **Step 2: Fix browser fullscreen button icon** — replace `PictureInPicture2` for browser fullscreen with `Expand` from lucide-react. Update the import line to include `Expand`.

```tsx
import {
  Expand,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react"
```

And change the browser fullscreen button's icon:

```tsx
        <button
          type="button"
          onClick={onToggleBrowserFullscreen}
          ...
        >
          <Expand size={18} />
        </button>
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/video-viewer/controls.tsx
git commit -m "feat: add custom VideoControls component"
```

---

### Task 4: Modify index.tsx — integrate custom controls into VideoViewer

**Files:**
- Modify: `components/ui/video-viewer/index.tsx`

- [ ] **Step 1: Refactor index.tsx to use the new hook and controls**

Complete replacement of the existing file. Key changes:
1. Remove inline `formatDuration` function → import from `./format`
2. Import and use `useVideoControls` hook
3. Import and use `VideoControls` component
4. Remove `controls` attribute from `<video>`
5. Add loading spinner and error overlay
6. Wire keyboard handler from hook
7. Keep existing thumbnail/hover preview logic unchanged

```tsx
"use client"

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
    // On touch devices, never auto-hide
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

            {/* Center play button — shown when paused */}
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
```

- [ ] **Step 2: Verify the build compiles**

```bash
npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/video-viewer/index.tsx
git commit -m "feat: integrate custom video controls into VideoViewer"
```

---

### Task 5: Write tests for format.ts

**Files:**
- Create: `tests/video-viewer-format.test.ts`

- [ ] **Step 1: Write tests**

```ts
import { describe, it, expect } from "vitest"
import { formatTime, formatDuration } from "@/components/ui/video-viewer/format"

describe("formatTime", () => {
  it("formats 0 seconds as 00:00", () => {
    expect(formatTime(0)).toBe("00:00")
  })

  it("formats seconds under 1 minute", () => {
    expect(formatTime(5)).toBe("00:05")
    expect(formatTime(45)).toBe("00:45")
  })

  it("formats exact minutes", () => {
    expect(formatTime(60)).toBe("01:00")
    expect(formatTime(120)).toBe("02:00")
  })

  it("formats minutes and seconds", () => {
    expect(formatTime(65)).toBe("01:05")
    expect(formatTime(3661)).toBe("61:01")
  })

  it("handles negative numbers gracefully", () => {
    expect(formatTime(-5)).toBe("00:00")
  })

  it("handles NaN", () => {
    expect(formatTime(NaN)).toBe("00:00")
  })

  it("handles Infinity", () => {
    expect(formatTime(Infinity)).toBe("00:00")
  })
})

describe("formatDuration", () => {
  it("returns empty string for undefined", () => {
    expect(formatDuration(undefined)).toBe("")
  })

  it("returns empty string for 0", () => {
    expect(formatDuration(0)).toBe("")
  })

  it("returns empty string for negative", () => {
    expect(formatDuration(-1)).toBe("")
  })

  it("returns formatted time for positive seconds", () => {
    expect(formatDuration(90)).toBe("01:30")
  })
})
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/video-viewer-format.test.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/video-viewer-format.test.ts
git commit -m "test: add format.ts unit tests"
```

---

### Task 6: Wire everything — smoke test & final review

**Files:**
- None new or modified (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run
```

Expected: All existing tests still pass, new format test passes.

- [ ] **Step 2: Start dev server and manual check**

```bash
npm run dev
```

Open the app in a browser, verify:
- Video thumbnail click opens modal with custom controls
- Play/Pause button works
- Progress bar is seekable (click and drag)
- Buffer progress is visible
- Volume/mute works
- Speed selector works
- PiP works (if browser supports it)
- Fullscreen works
- Keyboard shortcuts work (Space, arrows, m, f, >, <, i)
- Loading spinner shows during buffering
- Error state shows with retry on broken video
- Controls auto-hide after 3s of no mouse movement
- On mobile (or touch device), controls stay visible

- [ ] **Step 3: Commit if any fixes were needed**
