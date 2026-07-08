# Custom Video Controls — Design Spec

**Date:** 2026-07-08
**Status:** Approved

## Overview

Replace the browser's native `<video controls>` with a fully custom control bar in the `VideoViewer` modal overlay. The thumbnail + hover preview behavior remains unchanged; only the modal playback UI is modified.

## Scope

### Included

- Play/Pause button
- Seekable progress bar with buffer progress overlay
- Current time / total duration display
- Volume control with mute toggle (click to mute, hover for volume slider)
- Playback speed selector (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
- Picture-in-Picture toggle
- Fullscreen toggle (browser + monitor, as existing)
- Keyboard shortcuts (Space, arrows, m, f, i, >, <)
- Loading spinner overlay
- Error state with retry button
- Auto-hide controls after 3s of inactivity (desktop); always visible on touch devices
- Top toolbar (title, fullscreen, close) — keep existing

### Not Included

- Previous/Next media navigation (V2)
- Resolution switching / quality selection (requires server-side transcoding)
- Hover preview — already exists, no changes

## Architecture

### File Structure

```
components/ui/video-viewer/
├── index.tsx                # Main component (modified)
├── controls.tsx             # Custom control bar UI
├── use-video-controls.ts    # Video DOM API hook
└── format.ts                # Time formatting utilities
```

### Component Tree

```
VideoViewer (index.tsx)
├── Thumbnail + hover preview (unchanged)
└── Modal Portal (modified)
    ├── Top toolbar (unchanged)
    ├── <video> (no `controls` attribute)
    ├── Loading spinner (new)
    ├── Error overlay (new)
    ├── Center play button overlay (new, shown on pause)
    └── VideoControls (controls.tsx, new)
        ├── Play/Pause button
        ├── Current time
        ├── Progress bar (with buffer)
        ├── Duration
        ├── Volume button + slider
        ├── Speed selector
        ├── PiP button
        └── Fullscreen button
```

### Data Flow

```
VideoViewer
  │
  ├─ useVideoControls(videoRef)
  │   ├─ state: playing, currentTime, duration, buffered, volume, muted, speed, isPiP, isLoading, hasError
  │   ├─ actions: togglePlay, seek, setVolume, toggleMute, setSpeed, togglePiP, toggleFullscreen, retry
  │   └─ keyboard handler
  │
  └─ VideoControls ← receives state + actions as props
```

### Hook: `useVideoControls`

```ts
interface UseVideoControlsReturn {
  // State
  playing: boolean
  currentTime: number
  duration: number
  buffered: number  // 0–100 percentage
  volume: number    // 0–1
  muted: boolean
  speed: number
  isPiP: boolean
  isLoading: boolean
  hasError: boolean
  errorMessage: string

  // Actions
  togglePlay: () => void
  seek: (time: number) => void
  seekPercent: (percent: number) => void
  setVolume: (vol: number) => void
  toggleMute: () => void
  setSpeed: (speed: number) => void
  togglePiP: () => void
  toggleFullscreen: () => void
  retry: () => void
}

function useVideoControls(
  videoRef: RefObject<HTMLVideoElement>,
  containerRef: RefObject<HTMLDivElement>,
  onClose: () => void
): UseVideoControlsReturn
```

This hook owns all `addEventListener` calls on the video element and exposes clean state/action interfaces.

### Control Bar Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [▶]  00:15  ═══════════●═══════════  02:30  [🔊] [1x▾] [⫸] [⛶] │
└─────────────────────────────────────────────────────────────┘
```

- **Play/Pause**: Center-left, icon toggles between Play / Pause (lucide-react)
- **Current time**: Monospace text, updates on `timeupdate`
- **Progress bar**: 
  - Background: gray track
  - Buffer overlay: lighter gray (from `video.buffered`)
  - Played overlay: accent color (from `video.currentTime / video.duration`)
  - Thumb/dot at current position
  - Click or drag anywhere on the track to seek
- **Duration**: Monospace text
- **Volume**: Icon toggles muted/unmuted on click; on hover/focus, a vertical slider appears above
- **Speed**: Click opens popup menu with options: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x; current speed highlighted
- **PiP**: Toggle Picture-in-Picture
- **Fullscreen**: Existing behavior (browser + monitor modes)

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` / `k` | Toggle play/pause |
| `←` | Seek -5s |
| `→` | Seek +5s |
| `↑` | Volume +5% |
| `↓` | Volume -5% |
| `m` | Toggle mute |
| `f` | Toggle fullscreen |
| `>` (`Shift+.`) | Speed +0.25x |
| `<` (`Shift+,`) | Speed -0.25x |
| `i` | Toggle PiP |
| `Escape` | Close viewer (existing) |

All shortcuts are suppressed when the user is typing in an input field.

### Error Handling

- **Loading**: `<video>` emits `waiting` / `canplay` → show centered spinner overlay
- **Error**: `<video>` emits `error` → show centered error message + "重试" button. `retry()` calls `video.load()` then `video.play()`.
- **Network retry**: on error, show the error code from `video.error?.code`

### Auto-hide Behavior (existing, preserved)

- Show controls on mouse move / touch
- Hide after 3 seconds of no mouse movement (desktop only)
- On touch devices (`'ontouchstart' in window`), controls stay visible
- During PiP, hide full control bar (browser handles minimal controls)

### Responsive

- Control bar height: 48px on desktop, 56px on mobile (larger touch targets)
- Speed popup adapts position (above bar on narrow screens)
- Volume slider is vertical popup on hover (saves horizontal space)

## Testing

Unit tests for `useVideoControls` hook (simulate video events via a mock video element) and `format.ts`. Component tests for `VideoControls` rendering with mock state.

## Dependencies

- `lucide-react` (already in project) for icons
- No new npm packages
