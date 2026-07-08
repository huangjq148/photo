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
