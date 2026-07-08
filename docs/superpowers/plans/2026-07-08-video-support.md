# Video Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add video file support (MP4, WebM, MOV) with upload, storage, thumbnail generation and `<video>` playback, while refactoring the `Photo` model to a unified `Media` model.

**Architecture:** The `Photo` Prisma model is renamed to `Media` with new `media_type` and `duration` fields. Backend adds FFmpeg-based video metadata extraction and frame capture for thumbnails. Frontend adds a `VideoViewer` component that shows video cards alongside image cards, with hover preview and click-to-play modal.

**Tech Stack:** Next.js 15, Prisma (PostgreSQL), FFmpeg (CLI), sharp, React

---

### Task 1: Prisma Schema & Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration via `npx prisma migrate dev`

- [ ] **Step 1: Rename `Photo` model to `Media` and add fields**

In `prisma/schema.prisma`:
1. Rename model `Photo` → `Media` (keep all fields)
2. Add `media_type String` field — "image" or "video" (no default, handled in migration)
3. Add `duration Float?` field — video duration in seconds, null for images
4. Update all relations:
   - `Album.ownedPhotos Photo[]` → `Album.ownedMedia Media[]`
   - `Album.coverPhoto Photo?` → keep relation name, target Media
   - `AlbumPhoto.photo Photo` → rename field & relation to media
   - `User.uploads Photo[]` → `User.uploads Media[]`
   - `User.deletedPhotos Photo[]` → `User.deletedMedia Media[]`
   - `Favorite.photo Photo` → `Favorite.media Media`
   - `PhotoShare.photo Photo` → `PhotoShare.media Media`
5. Update all `@@index` and `@@unique` constraints with new field names
6. Rename enums: `PhotoProcessingStatus` → `MediaProcessingStatus`, `PhotoStatus` → `MediaStatus` (or keep as-is with comment "MEDIA" — keeping existing names reduces churn)

**Decision:** Keep enum names unchanged (`PhotoProcessingStatus`, `PhotoStatus`) to minimize diff volume. They're semantically fine for media.

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name rename-photo-to-media-add-video-fields
```

Expected: migration created, `prisma client` regenerated

- [ ] **Step 3: Verify generated client**

```bash
npx prisma generate
```

Check that `PrismaClient` exposes `.media`, `.albumPhoto`, `.favorite`, `.photoShare` with correct types.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: refactor Photo to Media model with video fields"
```

---

### Task 2: Backend — FFmpeg Video Helpers

**Files:**
- Create: `lib/media/video.ts`

- [ ] **Step 1: Create `getVideoMeta` function**

Uses `ffprobe` to extract width, height, duration from video files.

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type VideoMeta = {
  width: number;
  height: number;
  duration: number;
};

export async function getVideoMeta(filePath: string): Promise<VideoMeta> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,duration",
    "-of", "csv=p=0",
    filePath,
  ]);

  const parts = stdout.trim().split(",");
  const width = parseInt(parts[0], 10);
  const height = parseInt(parts[1], 10);
  const duration = parseFloat(parts[2]);

  if (!width || !height || !duration) {
    throw new Error("无法读取视频元数据");
  }

  return { width, height, duration };
}
```

- [ ] **Step 2: Create `extractVideoFrame` function**

Uses `ffmpeg` to extract first frame at a given width.

```typescript
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export async function extractVideoFrame(
  videoPath: string,
  outputPath: string,
  width: number,
): Promise<void> {
  const tmpPath = join(tmpdir(), `${randomUUID()}.jpg`);

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", videoPath,
      "-vframes", "1",
      "-vf", `scale=${width}:-1`,
      "-q:v", "3",
      tmpPath,
    ]);

    await writeFile(outputPath, await readFile(tmpPath));
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
```

Also import `readFile` from `node:fs/promises`.

- [ ] **Step 3: Add mime-to-extension mapping for video formats**

```typescript
export function mimeToExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg": return ".jpg";
    case "image/png": return ".png";
    case "image/webp": return ".webp";
    case "video/mp4": return ".mp4";
    case "video/webm": return ".webm";
    case "video/quicktime": return ".mov";
    default: return ".bin";
  }
}

export const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const SUPPORTED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
export const SUPPORTED_MIME_TYPES = new Set([...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES]);

export const MAX_IMAGE_SIZE = 20 * 1024 * 1024;  // 20MB
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
```

- [ ] **Step 4: Create `getVideoThumbnailFileName` helper**

Videos use JPEG for thumbnail/preview (from first frame), but keep original extension for the original file.

```typescript
export function getVideoDisplayFileName(storedId: string): string {
  return `${storedId}.jpg`;
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/media/video.ts
git commit -m "feat: add FFmpeg video metadata and frame extraction helpers"
```

---

### Task 3: Backend — Refactor Upload Pipeline

**Files:**
- Rename: `lib/photos/upload.ts` → `lib/media/upload.ts`
- Create: `lib/photos/upload.ts` (re-export backward compat)
- Modify: `app/api/albums/[id]/photos/upload/route.ts`

- [ ] **Step 1: Update upload.ts for Media model + video support**

In `lib/media/upload.ts`:
1. Replace all `prisma.photo` → `prisma.media`
2. Add video processing branch after reading buffer:
   - For images: keep existing sharp pipeline
   - For videos: use `getVideoMeta` + `extractVideoFrame` for thumbnail (512px) and preview (2048px)
3. Update `SUPPORTED_MIME_TYPES` import from `lib/media/video`
4. Video storage: original stays as video file, thumbnail/preview are JPEGs from first frame
5. For video uploads: store original file with its original extension; thumbnail/preview use `.jpg` extension
6. `media_type` field set to `"image"` or `"video"` based on mime type
7. `duration` field set for videos
8. Size validation: images ≤20MB, videos ≤500MB

Key code changes in upload function:

```typescript
import { getVideoMeta, extractVideoFrame, getVideoDisplayFileName, SUPPORTED_IMAGE_TYPES, SUPPORTED_VIDEO_TYPES, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE, mimeToExtension } from "@/lib/media/video";

// Inside uploadPhotoToAlbum, after getting buffer:
const isVideo = SUPPORTED_VIDEO_TYPES.has(input.file.type);
const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

if (input.file.size > maxSize) {
  throw new Error(isVideo ? "视频大小超过500MB限制" : "图片大小超过20MB限制");
}

let width: number, height: number, duration: number | null = null;

if (isVideo) {
  // For videos, write original first, then extract metadata
  const tmpVideoPath = join(tmpdir(), `${storedId}${mimeToExtension(input.file.type)}`);
  await writeFile(tmpVideoPath, buffer);
  
  try {
    const meta = await getVideoMeta(tmpVideoPath);
    width = meta.width;
    height = meta.height;
    duration = meta.duration;
    
    await Promise.all([
      extractVideoFrame(tmpVideoPath, previewPath, 2048),
      extractVideoFrame(tmpVideoPath, thumbnailPath, 512),
    ]);
    
    await writeFile(originalPath, buffer);
  } finally {
    await unlink(tmpVideoPath).catch(() => {});
  }
} else {
  // Image: existing sharp pipeline
  const metadata = await sharp(buffer).metadata();
  // ... existing code ...
}

// In the prisma create, add media_type and duration:
await tx.media.create({
  data: {
    // ... existing fields ...
    media_type: isVideo ? "video" : "image",
    duration: duration,
  },
});
```

Important: for videos, `file_name` in DB should match the actual storage files. Since original is the video file (e.g. `{storedId}.mp4`) but thumbnail/preview are JPEG (`{storedId}.jpg`), we need a different approach:
- Store original video as `{storedId}.mp4` (or .webm/.mov)
- Store thumbnail as `{storedId}_thumb.jpg`
- Store preview as `{storedId}_preview.jpg`
- `storage_path` = `{storedId}.mp4` (the original filename)
- `thumbnail_url` = `/api/files/thumbnails/{storedId}_thumb.jpg`
- `preview_url` = `/api/files/previews/{storedId}_preview.jpg`
- `original_url` = `/api/files/originals/{storedId}.mp4`
- `file_name` = `{storedId}.mp4`

Actually wait — for the file serving route, it uses `storage_path` to find the file. If thumbnail and preview have different names, the file serving won't find them because it searches for photos by `storage_path`.

Let me reconsider: The file serving route `/api/files/[variant]/[fileName]` searches for `Media` by `storage_path`. For videos, we'd need different file names for different variants. The simplest approach:
- Keep `storage_path` as the original file name (e.g. `uuid.mp4`)
- For thumbnails/previews, match the image naming pattern: store as `uuid.jpg` and look up differently

Actually the best approach: for video, store all three files with the same base name but different extensions. The file serving route queries by `storage_path` which is `uuid.jpg` for thumbnail AND `uuid.jpg` for preview (same file at different resolutions)... No this doesn't work with different resolutions.

Simpler approach: For videos, store thumbnail and preview as separate files:
- `{storedId}.jpg` for original video
- `{storedId}_thumb.jpg` for thumbnail
- `{storedId}_preview.jpg` for preview

And in the file serving route, handle the `_thumb` and `_preview` suffixes.

OR: Just store video thumbnails with the same naming convention as images. Videos use:
- `storage_path` = `{storedId}.mp4` (original extension)
- Thumbnail URL = custom path or a new field

Actually the cleanest approach: use the original extension for the video file name, and for thumbnail/preview URLs, store them directly in the DB as complete URL paths like they already do for images. The difference is that for videos, thumbnailUrl and previewUrl will point to a `.jpg` file while storage_path has `.mp4`. The file route already does `prisma.media.findFirst({ where: { storage_path: fileName } })` — this will fail for thumbnails since the file on disk is different from storage_path.

Simplest fix: store thumbnail/preview with the same `storage_path` but with `.jpg` extension, and update the file serving route to handle video thumbnail lookups.

Actually, the simplest approach that requires minimal changes to the file serving route: for both images and videos, always store thumbnails/previews as `.jpg` files and use the same `storage_path` but with `.jpg` extension.

Wait, for images, everything works because original, preview, and thumbnail all have the same extension. For videos, the original has a video extension while thumbnails have .jpg.

Let me think about this differently. The file route searches by `storage_path` which is the filename of the original. For videos:
- `storage_path` = `{storedId}.mp4` 
- Original file on disk: `{storedId}.mp4` ✓
- Preview on disk: `{storedId}.jpg` — won't be found by `storage_path` search
- Thumbnail on disk: `{storedId}.jpg` — won't be found

Solution: For videos, store preview/thumbnail as `{storedId}.jpg` (same file at different resolutions? No, that doesn't work).

Best solution: modify the file serving route to also search for `{uuid}.jpg` variant when the media is a video. OR use a separate naming convention that encodes the variant.

Actually, the simplest solution without changing the file serving logic:
- For videos, use the same `storage_path` for all three files but with a naming convention
- `storage_path` in DB = `{storedId}.mp4`
- Original on disk: `{storedId}.mp4`  
- Preview on disk: `{storedId}_preview.jpg`
- Thumbnail on disk: `{storedId}_thumb.jpg`
- In DB: `thumbnail_url = /api/files/thumbnails/{storedId}_thumb.jpg`, `preview_url = /api/files/previews/{storedId}_preview.jpg`

Then modify the file serving route to strip `_thumb` and `_preview` suffixes when looking up the media record, but use the full filename for the file on disk.

OR even simpler: modify the file serving route to handle this by searching both `storage_path` and a pattern match. Let me think...

The cleanest approach for the file serving:

```typescript
// In files route, when variant is previews or thumbnails:
// Try exact match first, then try with _thumb/_preview suffix
const baseName = fileName.replace(/_(thumb|preview)\.jpg$/, '.jpg');
const photo = await prisma.media.findFirst({
  where: { storage_path: fileName }
}) ?? await prisma.media.findFirst({
  where: { 
    storage_path: { startsWith: storedId },
    // ...
  }
});
```

This is getting complicated. Let me just go with the simplest approach:
- For videos, store files as:
  - Original: `{storedId}.mp4`
  - Preview: `{storedId}.jpg` (2048px frame)
  - Thumbnail: `{storedId}.jpg` (512px frame) — same filename!

Wait, they can't both be `{storedId}.jpg`. One is 2048px, one is 512px.

OK final decision: for videos:
- `storage_path` = `{storedId}.mp4` (stores original video filename)
- Preview file: `{storedId}_preview.jpg`
- Thumbnail file: `{storedId}_thumb.jpg`
- `thumbnail_url` = `/api/files/thumbnails/{storedId}_thumb.jpg`
- `preview_url` = `/api/files/previews/{storedId}_preview.jpg`

Modify the file serving route to handle `_thumb` and `_preview` suffixes by stripping them for DB lookup but using the full name for disk access. The simplest way: when the variant is "previews" or "thumbnails", also try searching by the base `storage_path` without the suffix.

Let me encode this in the plan properly. I'll handle the file route changes in the upload task.

- [ ] **Step 2: Create backward compat re-export**

Create `lib/photos/upload.ts`:

```typescript
export { uploadPhotoToAlbum } from "@/lib/media/upload";
```

- [ ] **Step 3: Update upload API route**

In `app/api/albums/[id]/photos/upload/route.ts`, change import from `lib/photos/upload` → `lib/media/upload`.

- [ ] **Step 4: Commit**

```bash
git add lib/media/upload.ts lib/photos/upload.ts app/api/albums/\[id\]/photos/upload/route.ts
git commit -m "feat: add video upload support with FFmpeg thumbnail generation"
```

---

### Task 4: Backend — Video Streaming & File Serving

**Files:**
- Modify: `app/api/files/[variant]/[fileName]/route.ts`
- Modify: `app/api/photos/[id]/download/route.ts`

- [ ] **Step 1: Update file serving route for video thumbnails**

In the file serving route, handle video thumbnails where `storage_path` in DB differs from the file on disk:

```typescript
// After the existing photo query, add fallback:
let fileOnDisk = fileName;
if (!photo) {
  // Try stripping _thumb or _preview suffix for video thumbnails
  const match = fileName.match(/^(.+)_(thumb|preview)\.jpg$/);
  if (match) {
    const baseStoragePath = match[1];
    // Try finding by the base name pattern
    photo = await prisma.media.findFirst({
      where: {
        storage_path: { startsWith: baseStoragePath + "." },
        OR: [
          { album: { members: { some: { user_id: user.id } } } },
          { albumPhotos: { some: { album: { members: { some: { user_id: user.id } } } } } }
        ]
      },
      select: { mime_type: true, storage_path: true }
    });
  }
}
```

Also add `Content-Type: image/jpeg` for preview/thumbnail variants when the file is `_thumb.jpg`/`_preview.jpg`.

- [ ] **Step 2: Add Range request support for video streaming**

Add `Range` header handling so `<video>` elements can seek:

```typescript
const fileStats = await stat(filePath);
const fileSize = fileStats.size;

const rangeHeader = request.headers.get("range");
if (rangeHeader) {
  const parts = rangeHeader.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  const chunkSize = end - start + 1;

  const stream = createReadStream(filePath, { start, end });
  return new Response(Readable.toWeb(stream) as never, {
    status: 206,
    headers: {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Content-Type": photo.mime_type,
      "Content-Length": String(chunkSize),
      "Accept-Ranges": "bytes",
    },
  });
}
```

- [ ] **Step 3: Update download route for video**

In `app/api/photos/[id]/download/route.ts`:
- Change `photo` variable name to `media`
- Update `prisma.photo` → `prisma.media` (actually this uses `getPhotoDetails` which internally queries photo/media)
- Change `Content-Type` and `Content-Disposition` to use correct mime type
- Video downloads should use `attachment` disposition (same as images)

- [ ] **Step 4: Commit**

```bash
git add app/api/files/ app/api/photos/
git commit -m "feat: add video streaming with Range support and thumbnail fallback"
```

---

### Task 5: Backend — Refactor Remaining API Routes & Libraries

**Files:**
- Modify: `lib/photos/library.ts` (or rename to `lib/media/library.ts`)
- Modify: `lib/photos/shares.ts` → `lib/media/shares.ts`
- Modify: `lib/albums/library.ts`
- Modify: All API routes under `app/api/`

- [ ] **Step 1: Refactor `lib/photos/library.ts`**

Rename to `lib/media/library.ts`. Update all `prisma.photo` → `prisma.media`, `PhotoRecord` → `MediaRecord`, `PhotoListItem` → `MediaListItem`, etc. Add `mediaType` and `duration` to list item types.

Create `lib/photos/library.ts` as re-export.

- [ ] **Step 2: Refactor `lib/photos/shares.ts`**

Rename to `lib/media/shares.ts`. Update `prisma.photoShare` → `prisma.photoShare` (name unchanged, just field refs). Update `photo` field references to `media`.

Create `lib/photos/shares.ts` as re-export.

- [ ] **Step 3: Update `lib/albums/library.ts`**

Update all `prisma.photo` → `prisma.media`, `photo` field in includes → `media`, `coverPhoto` relation → stays same name but references Media model.

- [ ] **Step 4: Update all API routes**

Update `prisma.photo` → `prisma.media` in ALL routes:

| Route | Key changes |
|-------|-------------|
| `app/api/albums/[id]/cover/route.ts` | `prisma.photo` → `prisma.media` |
| `app/api/albums/[id]/photos/route.ts` | Uses `getAlbumPhotos` from lib |
| `app/api/albums/[id]/photos/[photoId]/route.ts` | Update imports |
| `app/api/albums/[id]/photos/batch-delete/route.ts` | Uses `softDeletePhotos` |
| `app/api/favorites/route.ts` | Uses `getFavoritePhotos`, `toggleFavoritePhoto` |
| `app/api/photos/[id]/route.ts` | Uses `getPhotoDetails` |
| `app/api/photos/[id]/favorite/route.ts` | Uses `toggleFavoritePhoto` |
| `app/api/photos/[id]/restore/route.ts` | Uses `restorePhoto` |
| `app/api/photos/[id]/permanent-delete/route.ts` | Uses `permanentlyDeletePhoto` |
| `app/api/photos/[id]/share/route.ts` | Uses `createPhotoShare` |
| `app/api/trash/photos/route.ts` | Uses `getTrashPhotos` |
| `app/api/trash/photos/[id]/route.ts` | Uses `permanentlyDeletePhoto` |
| `app/api/trash/photos/[id]/restore/route.ts` | Uses `restorePhoto` |
| `app/api/trash/photos/batch-delete/route.ts` | Uses `permanentlyDeleteTrashPhotos` |
| `app/api/trash/photos/batch-restore/route.ts` | Uses `restoreTrashPhotos` |

- [ ] **Step 5: Commit**

```bash
git add lib/photos/ lib/media/ lib/albums/ app/api/
git commit -m "refactor: rename Photo to Media across all backend code"
```

---

### Task 6: Frontend — VideoViewer Component

**Files:**
- Create: `components/ui/video-viewer/index.tsx`

- [ ] **Step 1: Create VideoViewer component**

```tsx
'use client'

import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Play, X } from 'lucide-react'

interface VideoViewerProps {
  src: string           // thumbnail poster URL
  alt: string           // file name
  videoSrc: string      // original video URL
  duration?: number     // duration in seconds
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

  // Close modal on Escape
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const overlay = open && typeof document !== 'undefined'
    ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`播放视频：${alt}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
          <video
            src={videoSrc}
            controls
            autoPlay
            className="max-h-[90vh] max-w-[90vw] rounded-lg"
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
        {/* Thumbnail / hover preview */}
        <div className="relative">
          <img
            src={src}
            alt={alt}
            draggable={false}
            className={`${imgClassName} ${hover && previewLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
          />
          {hover && (
            <video
              src={videoSrc}
              muted
              autoPlay
              loop
              playsInline
              onCanPlay={() => setPreviewLoaded(true)}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${previewLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          )}
          {/* Play button overlay */}
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/60 p-3 backdrop-blur-sm transition-transform group-hover:scale-110">
              <Play size={24} className="text-white" fill="white" />
            </span>
          </span>
        </div>

        {/* Duration badge */}
        {duration ? (
          <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-md bg-black/70 px-1.5 py-0.5 text-xs text-white/90 backdrop-blur-sm">
            {formatDuration(duration)}
          </span>
        ) : null}
      </button>
      {overlay}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/video-viewer/
git commit -m "feat: add VideoViewer component with hover preview and modal playback"
```

---

### Task 7: Frontend — Update PhotoGalleryCard & All Galleries

**Files:**
- Modify: `components/photos/photo-gallery-card.tsx`
- Modify: `components/photos/photo-gallery.tsx`
- Modify: `components/photos/favorites-gallery.tsx`
- Modify: `components/photos/trash-gallery.tsx`
- Modify: `components/share/share-image-client.tsx`

- [ ] **Step 1: Update PhotoGalleryCardItem type**

Add `mediaType` and `duration` fields to the type:

```typescript
export type PhotoGalleryCardItem = {
  id: string;
  originalName: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  mimeType: string;
  mediaType: string;    // "image" | "video"
  duration: number | null;
  width: number;
  height: number;
  takenAt: string | null;
  uploadedAt: string;
};
```

- [ ] **Step 2: Branch rendering in PhotoGalleryCard**

```tsx
import VideoViewer from "@/components/ui/video-viewer";

// In the render:
const isVideo = photo.mediaType === "video" || photo.mimeType.startsWith("video/");

{isVideo ? (
  <VideoViewer
    src={photo.thumbnailUrl}
    alt={photo.originalName}
    videoSrc={photo.originalUrl}
    duration={photo.duration ?? undefined}
    imgClassName={photo.mimeType.startsWith("video/") ? imgClassName : undefined}
    className="group/img block w-full"
  />
) : (
  <ImageViewer
    src={photo.thumbnailUrl}
    alt={photo.originalName}
    previewSrc={photo.previewUrl}
    imgClassName="aspect-[4/3] w-full object-cover transition duration-300 group-hover/img:scale-[1.02]"
    className="group/img block w-full"
  />
)}
```

Also update the info overlay: change "照片信息" to "媒体信息", add duration display for videos.

- [ ] **Step 3: Update PhotoGallery to include mediaType/duration/originalUrl in items**

In `photo-gallery.tsx`, update the `PhotoItem` type to include `mediaType`, `duration`, `originalUrl`. Update the API response mapping. Update all type references.

- [ ] **Step 4: Update FavoritesGallery**

Add `mediaType`, `duration`, `originalUrl` to `FavoriteItem`. Branch rendering between `VideoViewer` and `ImageViewer`.

- [ ] **Step 5: Update TrashGallery**

Add mimeType check. For trash items with video mimeType, use a video element or show a video icon overlay.

- [ ] **Step 6: Update ShareImageClient**

Add `mediaType` and `duration` props. Branch to `VideoViewer` for video shares.

- [ ] **Step 7: Commit**

```bash
git add components/photos/ components/share/
git commit -m "feat: render video files with VideoViewer in all galleries"
```

---

### Task 8: Frontend — Update Upload Forms

**Files:**
- Modify: `components/upload/photo-upload-form.tsx`

- [ ] **Step 1: Update accept attribute and labels**

```tsx
accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
```

Change label from "选择图片" to "选择图片/视频".

- [ ] **Step 2: Commit**

```bash
git add components/upload/photo-upload-form.tsx
git commit -m "feat: accept video files in upload form"
```

---

### Task 9: Verification & Testing

- [ ] **Step 1: Run existing tests**

```bash
npx vitest run
```

Expected: all tests pass or only name-related failures from Photo→Media rename.

- [ ] **Step 2: Fix breaking tests**

Update test files that reference `prisma.photo` → `prisma.media`, update type names, update mocks.

Files to check:
- `tests/photo-library.test.ts`
- `tests/photo-shares.test.ts`
- `tests/photo-upload.test.ts`
- `tests/albums.test.ts`
- `tests/add-photos-modal.test.ts`
- `tests/album-detail-header.test.ts`
- `tests/photo-gallery-card.test.ts`
- `tests/photo-gallery-size-control.test.ts`

- [ ] **Step 3: Manual testing checklist**

1. Upload an MP4 video → verify it appears in gallery with duration badge
2. Hover over video card → verify silent autoplay preview
3. Click video card → verify modal player with controls
4. Test video in favorites, trash, share
5. Upload image → verify still works normally
6. Delete video → verify deleted from storage
7. Restore video from trash → verify restored

- [ ] **Step 4: Commit**

```bash
git add tests/
git commit -m "test: update tests for Media model and video support"
```

---

### Task 10: Final Commit & Cleanup

- [ ] **Step 1: Verify no remaining `prisma.photo` references**

```bash
grep -r "prisma\.photo\b" --include="*.ts" --include="*.tsx" . | grep -v node_modules
```

Expected: no results (or only in comments/deprecated code).

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup, remove remaining Photo references"
```
