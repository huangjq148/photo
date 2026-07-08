# Video Support Design

## Overview

Add video file support to the photo management application. Users can upload, view, and manage video files alongside images. The existing `Photo` model is refactored to a unified `Media` model.

## Decisions

| Item | Decision |
|------|----------|
| Video formats | `video/mp4` (H.264), `video/webm`, `video/quicktime` (.mov) |
| Thumbnail generation | Backend FFmpeg extracts first frame → 512px thumbnail + 2048px preview (JPEG) |
| Card interaction | Hover: silent autoplay loop preview. Click: modal fullscreen player with controls |
| Upload size limit | 500MB for video, 20MB for images (unchanged) |
| File naming | Retain original name + UUID, same as images |

## Database Changes

### Model: `Photo` → `Media`

The `Photo` model is renamed to `Media`. All relations (Album, AlbumPhoto, Favorite, PhotoShare, User) are updated accordingly.

New/Changed fields:

```prisma
model Media {
  // ... existing fields renamed from Photo ...
  media_type   String   // "image" | "video" — for fast frontend rendering decisions
  duration     Float?   // video duration in seconds, null for images
  // width/height remain: for video this is the resolution
  // preview_url: for video, this stores the first-frame JPEG preview
  // thumbnail_url: for video, this stores the first-frame JPEG thumbnail
}
```

### Migration approach

- Rename `Photo` table to `Media`
- Add `media_type` column (default `"image"` for existing rows)
- Add `duration` column (nullable, null for all existing images)

## Backend Changes

### New dependency: FFmpeg

Server must have `ffmpeg` binary available. Used for:
- Extracting video metadata (width, height, duration) via `ffprobe`
- Generating thumbnail (first frame, 512px wide JPEG)
- Generating preview (first frame, 2048px wide JPEG)

### Upload pipeline

```
File received → validate mime type and size
  ├─ image/* → sharp pipeline (unchanged)
  └─ video/* → FFmpeg pipeline:
       1. ffprobe: width, height, duration
       2. ffmpeg: extract frame → thumbnail (512px)
       3. ffmpeg: extract frame → preview (2048px)
       4. Store original video file as-is (no transcoding)
       5. Write Media row (media_type="video", duration=...)
```

### Files to create/modify

| File | Action |
|------|--------|
| `lib/media/video.ts` | New: FFmpeg helpers (getVideoMeta, extractFrame) |
| `lib/media/upload.ts` | Rename from `lib/photos/upload.ts`, add video branch |
| `lib/photos/upload.ts` | Re-export from `lib/media/upload.ts` for backward compat |
| `prisma/schema.prisma` | Photo → Media rename + new fields |
| All API routes referencing Photo | Update to Media |
| All lib modules referencing Photo | Update to Media |

### Supported MIME types (updated)

```ts
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORTED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;  // 20MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
```

## Frontend Changes

### New component: `VideoViewer`

Path: `components/ui/video-viewer/index.tsx`

Props:
```ts
interface VideoViewerProps {
  src: string           // thumbnail poster URL
  alt: string           // file name
  videoSrc: string      // original video URL for playback
  duration?: number     // duration in seconds, for display label
  className?: string
  imgClassName?: string
}
```

Behavior:
1. **Thumbnail mode**: Displays `src` (thumbnail) with a play button overlay centered
2. **Hover**: Loads `<video>` element with `videoSrc`, autoplay, muted, loop. Fades in the video over the thumbnail
3. **Click**: Opens portal modal with full `<video controls>` player, ESC to close
4. **Duration label**: Shows formatted duration (mm:ss) overlay on bottom-right of card

### Modified component: `PhotoGalleryCard`

- Check `mediaType` (or `mimeType.startsWith("video/")`) to choose `VideoViewer` vs `ImageViewer`
- Pass `duration` to `VideoViewer`
- "照片信息" → "媒体信息" in the dropdown menu
- Video cards show duration badge

### Modified galleries

| File | Changes |
|------|---------|
| `components/photos/favorites-gallery.tsx` | Import `VideoViewer`, branch on mediaType |
| `components/photos/trash-gallery.tsx` | Same as above |
| `components/share/share-image-client.tsx` | Same as above |

### Modified upload form

- `accept` attribute: add `video/mp4,video/webm,video/quicktime`
- Label text: "选择图片" → "选择图片/视频"
- All upload forms (album, spaces if any)

## API Routes to Update

All routes that query or mutate `Photo` are updated to use `Media`:

```
app/api/albums/[id]/photos/*      → rename or update queries
app/api/photos/[id]/*            → rename or update queries
app/api/favorites/route.ts       → update queries
app/api/trash/photos/*           → update queries
app/api/files/[variant]/[fileName]/route.ts → add video streaming (Content-Range)
```

### Video streaming

For video files served via `/api/files/originals/[fileName]`, add `Range` header support to enable seeking in `<video>` elements. Return `206 Partial Content` with `Content-Range` header when client requests a range.

## File Storage Layout (unchanged)

```
{STORAGE_ROOT}/
  originals/   ← raw video files + original images
  previews/    ← 2048px JPEG (first frame for videos, resized for images)
  thumbnails/  ← 512px JPEG (first frame for videos, resized for images)
```

## Testing

- Upload video files (MP4, WebM, MOV) and verify storage, thumbnail generation
- Verify video cards render with duration badge in gallery
- Verify hover preview plays silently
- Verify click opens fullscreen player with controls
- Verify video streaming supports seeking (Range requests)
- Verify image upload flow is unaffected by refactoring
- Verify favorites, trash, share all render video correctly
