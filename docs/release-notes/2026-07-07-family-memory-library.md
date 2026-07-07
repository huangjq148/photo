# Family Memory Library — First Implementation

**Date:** 2026-07-07
**Scope:** P0 Family Memory Stream + P1 Complete Video Support

---

## New Features

### `/memories` — 家庭回忆流 (Family Memory Stream)

New primary entry point for authenticated users. Displays all accessible media grouped by month with filter controls for 全部 / 照片 / 视频.

- Infinite scroll with page loading
- Unified media cards supporting both image and video
- Processing status indicators for video uploads
- Lightbox viewer for images, native video player for ready videos

### Complete Video Support

Full video lifecycle: upload, processing, playback, and sharing.

- **Upload:** `/api/albums/[id]/media/upload` accepts both images and videos
- **Processing:** Background worker (`npm run worker:media`) processes pending videos with ffmpeg/ffprobe
- **Playback:** Processed videos stream via token-validated public share URLs
- **Sharing:** Public video shares are playback-only (no original download)
- **Quota:** Derived files (poster, thumbnail, playback) count toward user storage

### Navigation Updates

- 家庭回忆流 (`/memories`) — family memory stream
- 家庭相册 (`/albums`) — albums
- 收藏精选 (`/favorites`) — favorites
- 回收站 (`/trash`) — trash

### Supported Media Types

| Category | MIME Types |
|----------|-----------|
| Images | `image/jpeg`, `image/png`, `image/webp` |
| Videos | `video/mp4`, `video/quicktime`, `video/webm` |

### Upload Limits

| Type | Default Limit |
|------|--------------|
| Image | 20 MB |
| Video | 512 MB |

---

## Operational Requirements

### Prerequisites

- **ffmpeg** and **ffprobe** must be installed on the worker machine
- PostgreSQL database
- Node.js 22+

### Worker

```bash
# One-shot processing of the next pending video
npm run worker:media:once

# Continuous polling
npm run worker:media
```

### Environment Variables

See `.env.example` for full list. New media-specific variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_IMAGE_UPLOAD_MB` | 20 | Max image upload size in MB |
| `MAX_VIDEO_UPLOAD_MB` | 512 | Max video upload size in MB |
| `MEDIA_WORKER_POLL_INTERVAL_MS` | 5000 | Worker poll interval in ms |
| `MEDIA_WORKER_CONCURRENCY` | 1 | Concurrent video processing jobs |
| `MEDIA_TRANSCODE_PRESET` | medium | ffmpeg transcode preset (fast/medium/high) |

---

## Architecture Notes

- `Photo` table retains its name and gains media fields (`media_type`, `playback_url`, `poster_url`, etc.)
- Existing photo routes (`/api/photos/*`) continue to work for compatibility
- New media routes use `/api/media/*` naming convention
- Public video playback uses token-validated `/api/share/[token]/playback` — never exposes original files
- Storage layout adds `posters/` and `playbacks/` directories

---

## Known Limitations

- No HLS/adaptive streaming — single MP4 transcode
- No cloud storage integration — local disk only
- No true `Family` database model — uses existing `Album`/`AlbumMember` for access control
- No AI, face recognition, duplicate detection, map browsing, or batch export
- Video processing is serial by default (`MEDIA_WORKER_CONCURRENCY=1`)
