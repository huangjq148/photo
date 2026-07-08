"use client"

import React, { useCallback, useRef, useState } from "react"
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
      className="absolute bottom-0 left-0 right-0 z-[60] flex flex-col bg-gradient-to-t from-black/80 to-transparent pt-8 pb-3 px-4"
      onPointerUp={handleProgressPointerUp}
    >
      {/* Progress bar */}
      <div
        ref={progressRef}
        className="group/progress relative mb-3 h-5 w-full cursor-pointer"
        onClick={handleProgressClick}
        onPointerDown={handleProgressPointerDown}
        onPointerMove={handleProgressPointerMove}
      >
        {/* Track background */}
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/20 transition-[height] group-hover/progress:h-1.5">
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
        <span className="min-w-[42px] text-center text-xs tabular-nums text-white/80">
          {formatTime(currentTime)}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Duration */}
        <span className="text-xs tabular-nums text-white/80">
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
            <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg bg-black/90 p-2 shadow-xl backdrop-blur">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="h-24 w-1.5 cursor-pointer appearance-none rounded-full bg-white/20 accent-white [writing-mode:vertical-lr] direction-rtl"
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
          <Expand size={18} />
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
