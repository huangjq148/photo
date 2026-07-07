# Family Memory Library Design

## Goal

Evolve the current photo management app into a personal and family memory library.

The product should prioritize:

- Family sharing with low operational friction.
- A memory-first browsing experience organized by time.
- First-class support for photos and videos.
- Stable local storage and processing that can be deployed with the existing Next.js monolith.

This design intentionally avoids a large data model rewrite in the first phase. The current album membership model remains the permission boundary, while the user experience is repackaged as a family library.

## Current Baseline

The project is a Next.js monolith using Prisma, PostgreSQL, React, and local disk storage.

Implemented capabilities include:

- User registration, login, logout, and current user lookup.
- Album-first browsing and collaboration.
- Album members, invites, upload permission, and delete permission.
- Photo upload with image variants.
- EXIF extraction for taken time and GPS coordinates.
- Photo wall, preview, download, search, favorites, public share links, trash, restore, and permanent delete.
- Batch photo operations.
- Dark editorial visual system.

Important current constraints:

- The database still contains deprecated `Space`, `SpaceMember`, and `SpaceInvite` models.
- The active user-facing model is already album-first.
- Media records are currently represented by `Photo`.
- Upload processing is synchronous for images.
- File storage is local disk and served through project API routes.

## Product Direction

The selected direction is `family memory library`.

The app should feel less like a collection-management tool and more like a shared family archive:

- The default experience is a unified memory stream.
- Albums become categories or collections inside the family archive.
- Members are presented as family members, not as a complex role system.
- Photos and videos are both memory assets.
- Time-based browsing becomes a primary way to rediscover content.

## Recommended Approach

Use a lightweight family shell over the existing album model.

Do not introduce a new `Family` entity in the first implementation. Instead:

- Keep `Album` as the permission and classification boundary.
- Keep `AlbumMember` as the membership mechanism.
- Present joined albums and their media through a family-oriented interface.
- Add media fields to support videos without immediately renaming every `Photo` concept.
- Add an independent worker process for video processing.

This approach improves the product experience while controlling migration risk.

## Alternatives Considered

### Option 1: Experience wrapper only

Keep the data model unchanged and only rename screens and navigation.

Pros:

- Lowest implementation risk.
- Fastest visible improvement.

Cons:

- Does not support video properly.
- Does not solve memory-stream browsing.
- Leaves the app mostly album-management-oriented.

### Option 2: Full family data model

Create `Family`, `FamilyMember`, and `MediaAsset` as new first-class models.

Pros:

- Clean domain model.
- Easier to reason about long term.

Cons:

- High migration cost.
- Large route, permission, component, and test churn.
- Risky before the product shape is validated.

### Option 3: Lightweight family shell plus media expansion

Keep album membership, add a family memory UX, and extend the existing media record to support photos and videos.

Pros:

- Matches the selected product direction.
- Avoids a large migration.
- Supports complete video processing.
- Creates a clear path toward a future `MediaAsset` model.

Cons:

- `Photo` remains semantically overloaded for a while.
- Some APIs and components need transitional naming.
- Aggregated family views must carefully enforce album membership access.

Choose option 3.

## First Implementation Target

The first implementation plan should cover `P0: Family Memory Stream` and `P1: Complete Video Support`.

`P2` and `P3` are roadmap context only. They should not be included in the first implementation plan except where `P0/P1` work must avoid blocking them.

Decisions for the first implementation:

- Maximum image upload size: keep the current `20MB` default.
- Maximum video upload size: default to `512MB`, configurable by environment.
- Public video shares: playback-only by default; do not expose original video download on public share pages.
- Worker concurrency: support one active job by default in the first implementation.
- Worker job claim: still use a transactional claim so a second worker process cannot process the same job if accidentally started.
- Quota accounting: count original uploads immediately and count derived files after worker processing completes.
- API migration: keep existing `/api/photos` endpoints as compatibility aliases; use `/api/media` naming for new UI and new endpoints where practical.

## Information Architecture

### Primary Navigation

Replace the current management-heavy navigation with family-memory language:

- `家庭回忆流`
- `回忆时间线`
- `家庭相册`
- `收藏精选`
- `回收站`

If space is limited on mobile, collapse to:

- `回忆`
- `相册`
- `收藏`
- `回收站`

### Family Memory Stream

The memory stream becomes the authenticated default destination.

It aggregates media from albums the current user can access and groups it by capture time:

- Today or recent days for fresh content.
- Month groups such as `2026 年 7 月`.
- Year groups for older content.

Each group should support mixed media:

- Images use thumbnails.
- Videos use poster frames.
- Processing videos show a clear pending state.
- Failed videos show a download-only state.

The stream supports filters:

- `全部`
- `照片`
- `视频`
- Optional member/uploader filter.
- Optional album filter.

### Timeline

The timeline is a more focused browsing mode for long-term archives.

Initial scope:

- Year/month jump navigation.
- Same media grid as the memory stream.
- Grouping by `taken_at` when available, falling back to `uploaded_at`.

Future scope:

- Location grouping.
- Map entry.
- Event or holiday grouping.

### Family Albums

Albums remain the classification and sharing boundary.

The UI should describe them as family albums:

- Album cards use cover media, photo/video count, member count, and last activity.
- Album detail keeps upload, add media, set cover, invite family, and member management.
- Existing album permission logic continues to apply.

### Favorites

Favorites become `收藏精选`.

The page should present saved family memories, not just a technical list of favorited photos.

### Trash

Trash remains separate and explicit.

It should support both photos and videos:

- Restore.
- Permanent delete.
- Batch restore.
- Batch permanent delete.

## Media Model

### Transitional Naming

Keep the existing `Photo` table name during the first implementation. Treat it as a media record in application logic.

Avoid large table renames until the video functionality and family-memory UX are stable.

### Required Fields

Add fields to support mixed media:

- `media_type`: enum or string with `image` and `video`.
- `duration_seconds`: nullable integer or float for video duration.
- `playback_url`: nullable text for processed video playback file.
- `poster_url`: nullable text for video poster image.
- `processing_error`: nullable text for failed processing details.
- `processed_at`: nullable datetime.
- `original_codec`: nullable text or JSON-compatible string for diagnostics.

Existing fields remain useful:

- `mime_type`
- `size`
- `width`
- `height`
- `original_url`
- `preview_url`
- `thumbnail_url`
- `storage_path`
- `processing_status`
- `taken_at`
- `latitude`
- `longitude`
- `status`

### Processing Status

Use `PhotoProcessingStatus` for both image and video:

- `pending`: record exists, worker has not processed it.
- `processing`: worker is currently processing it.
- `normal`: media is ready.
- `failed`: processing failed, but original file may still be downloadable.

For images, processing can remain synchronous in the API unless later moved to the worker.

For videos, processing must be asynchronous.

## Storage Layout

Extend local disk storage with video-specific output directories:

- `originals/`: original images and original videos.
- `previews/`: image previews.
- `thumbnails/`: image thumbnails and small video poster thumbnails.
- `posters/`: large video poster frames.
- `playbacks/`: transcoded browser-friendly video files.

Video playback files should use deterministic names tied to the media id, for example:

```text
playbacks/<media-id>.mp4
posters/<media-id>.jpg
thumbnails/<media-id>.jpg
```

Keep serving files through API routes so access control remains centralized.

## Video Processing

### Worker Process

Use an independent worker process.

Responsibilities:

- Poll or claim pending video records.
- Use `ffprobe` to read duration, dimensions, codec, and rotation.
- Use `ffmpeg` to generate poster frames.
- Use `ffmpeg` to transcode playback MP4.
- Update database state.
- Leave the original file intact on failure.

The Next.js app remains responsible for:

- Authentication.
- Upload validation.
- Writing original files.
- Creating database records.
- Serving UI and API responses.

### Processing Flow

1. User uploads a video.
2. API validates membership, file type, size, and capacity.
3. API writes original video to `originals/`.
4. API creates a media record with `media_type = video` and `processing_status = pending`.
5. Worker claims the pending record and marks it `processing`.
6. Worker reads metadata with `ffprobe`.
7. Worker generates poster and thumbnail frames.
8. Worker transcodes to MP4/H.264/AAC for browser playback.
9. Worker updates URLs, duration, dimensions, codec info, `processed_at`, and `processing_status = normal`.
10. On failure, worker sets `processing_status = failed` and records `processing_error`.

If processing fails after creating some derived files:

- Keep successfully generated poster or thumbnail files if they are usable for display.
- Do not expose a playback URL unless transcoding completed successfully.
- Count retained derived files against quota.
- Remove incomplete playback files.
- Record the failure in `processing_error`.

### Playback Format

Initial target format:

- Container: MP4.
- Video codec: H.264.
- Audio codec: AAC.

This is broadly compatible with browsers and avoids HLS complexity in the first version.

### Failure Behavior

If processing fails:

- The media remains visible in the stream as failed.
- The original file remains downloadable if the current user has access.
- The UI should not show a broken video player.
- The error message shown to users should be simple, for example `视频暂不可在线播放，可下载原文件`.

Detailed `processing_error` should be treated as diagnostic information and not exposed verbatim to general users.

## Upload Rules

### Images

Keep existing supported types:

- `image/jpeg`
- `image/png`
- `image/webp`

### Videos

Add common family video formats:

- `video/mp4`
- `video/quicktime`
- `video/webm`

The first implementation may accept additional types only if ffmpeg can reliably process them, but the UI should present a small clear list.

### Size Limits

Separate limits for images and videos:

- Images keep the existing `20MB` default.
- Videos use a `512MB` default.

The exact value should be environment-configurable:

- `MAX_IMAGE_UPLOAD_MB`
- `MAX_VIDEO_UPLOAD_MB`

### Capacity

Storage capacity must include:

- Original files.
- Generated image variants.
- Video posters.
- Video playback files.

The current `storage_used` behavior only increments by upload file size. That must be expanded for video processing.

Required first implementation behavior:

- Check quota against original upload size before accepting the upload.
- Increment quota by original upload size when the original file is stored.
- After worker processing completes, add generated poster, thumbnail, and playback file sizes to the user's `storage_used`.
- On permanent delete, decrement all known original and derived file sizes.
- If processing fails before derived files are created, only the original file size remains counted.
- If cleanup of a derived file fails, keep database accounting consistent with the files that are still expected to exist and log the cleanup failure.

## Access Control

Access control must remain album-membership-based.

For any media read, stream, download, favorite, share, restore, or delete action:

- The user must be a member of the owning album or an album linked through `AlbumPhoto`.
- Public share pages must validate share token state, expiration, revocation, and media availability.

Video playback routes need the same checks as image file routes.

Do not expose `playbacks/`, `posters/`, or `originals/` as static public directories.

## Sharing

Public sharing should support both photos and videos.

Share page behavior:

- Photo share: show image preview and download action.
- Video share: show video player using `playback_url` when processing is complete.
- Failed or pending public video share: show poster or placeholder and a clear unavailable state. Do not expose original video download on the public share page.

Public video shares are playback-only by default.

- Authenticated users with album access can download original videos.
- Public share viewers can play processed videos when ready.
- Public share viewers cannot download original videos in the first implementation.
- Photo public shares can keep the existing download behavior unless a later privacy pass changes it.

Public playback routes must serve only processed playback variants. They must never stream files from `originals/`.

When this spec says failed videos remain downloadable, that applies only to authenticated album members through authenticated download routes, not to public share viewers.

## UI Components

### Media Card

Replace photo-only assumptions with a generic media card.

The card should support:

- Image thumbnail.
- Video poster.
- Video duration badge.
- Processing badge.
- Failed badge.
- Selection.
- Favorite.
- Share.
- Delete.
- Set as album cover.
- Info panel.

### Viewer

The viewer should branch by media type:

- Image: existing image viewer.
- Video: HTML video player using processed playback URL.
- Pending video: processing state.
- Failed video: download-only state.

### Upload Queue

The upload queue should show:

- File type.
- Size.
- Upload status.
- For videos, post-upload processing status.

The upload operation may finish before video playback is ready. The UI must communicate this clearly.

## API Design

Prefer media-oriented naming for new endpoints, while keeping existing photo endpoints working during transition.

Potential new endpoints:

- `GET /api/media`
- `GET /api/media/[id]`
- `POST /api/albums/[id]/media/upload`
- `POST /api/media/[id]/favorite`
- `POST /api/media/[id]/share`
- `GET /api/media/[id]/download`
- `GET /api/files/[variant]/[fileName]`

Compatibility:

- Existing `/api/photos/...` endpoints can remain as aliases during the transition.
- New UI should use media-oriented APIs where practical.

## Implementation Phases

### P0: Family Memory Stream

Goal: make the product feel like a family memory library without changing the core model.

Scope:

- Add authenticated family memory stream page.
- Aggregate accessible media from joined albums.
- Group by `taken_at`, falling back to `uploaded_at`.
- Add filters for all/photos/videos, even if videos are initially absent.
- Rename key UI labels toward family-memory language.
- Keep album list as `家庭相册`.
- Keep current image upload and photo operations working.

Acceptance criteria:

- Authenticated users land on a memory-first experience.
- Photos from accessible albums are visible in chronological groups.
- Album membership access rules are preserved.
- Existing album, favorite, share, trash, and upload tests continue to pass.

### P1: Complete Video Support

Goal: support videos as first-class family memories.

Scope:

- Extend Prisma schema for media fields.
- Extend storage layout.
- Add upload validation for videos.
- Add video upload path that creates pending records.
- Add worker process using `ffprobe` and `ffmpeg`.
- Generate posters, thumbnails, and playback MP4 files.
- Add media card video state rendering.
- Add video viewer.
- Add share page video behavior.
- Add download support for original video.

Acceptance criteria:

- A supported video can be uploaded.
- The upload returns promptly without waiting for transcoding.
- Worker processes the video and marks it ready.
- Ready videos show poster, duration, and can play in browser.
- Failed videos do not break the UI and remain downloadable.
- Access control applies to video originals, posters, thumbnails, and playback files.

### P2: Family Sharing Experience

Goal: reduce collaboration complexity for family users.

Scope:

- Rename member management to family management.
- Simplify invite copy.
- Add permission presets instead of exposing raw role complexity.
- Add member/uploader filters in memory stream.
- Improve album detail to show family activity.

Acceptance criteria:

- A non-technical user can invite a family member without understanding role internals.
- Current permission checks remain enforced.
- Members can find memories uploaded by a specific family member.

### P3: Memory Enhancement

Goal: improve long-term browsing and archive value.

This phase is roadmap context and should be split into separate specs before implementation.

Scope:

- Year/month jump navigation.
- Location-based browsing using existing GPS data.
- Map entry.
- Duplicate detection.
- Batch download by album or time range.
- Manual or assisted event grouping.

Acceptance criteria:

- Large archives remain navigable.
- Users can rediscover memories by time and place.
- Bulk export paths are available for family backup use cases.

## Testing Strategy

### Unit Tests

Add or update tests for:

- Media grouping by date.
- Media type filtering.
- Upload validation for image and video MIME types.
- Capacity checks for larger video files.
- Worker state transitions.
- Processing failure behavior.
- Share behavior for photos and videos.
- Access checks for playback and poster files.

### Integration Tests

Add API-level tests for:

- Upload video creates a pending media record.
- Worker updates record to normal after successful processing.
- Failed processing preserves original file.
- Unauthorized users cannot read video files.
- Public share token can access only allowed media.
- Failed or pending public video shares never render or expose original video download URLs.

### End-to-End Tests

Add at least one browser-level flow after the feature exists:

- Register or log in.
- Upload video.
- See processing state.
- Wait for worker completion in a controlled fixture.
- Play video.
- Share video.
- Open share page.

### Manual Verification

Manual verification should include:

- Desktop and mobile memory stream.
- Large video upload behavior.
- Unsupported video format error.
- Worker stopped or delayed behavior.
- Failed ffmpeg processing behavior.
- Permanent delete cleans up all generated files.

## Operational Requirements

### Dependencies

The deployment environment must provide:

- `ffmpeg`
- `ffprobe`

The app should fail worker startup clearly if these binaries are unavailable.

### Scripts

Add scripts such as:

```json
{
  "worker:media": "tsx workers/media-worker.ts",
  "worker:media:once": "tsx workers/media-worker.ts --once"
}
```

### Configuration

Add environment configuration:

- `MAX_IMAGE_UPLOAD_MB`
- `MAX_VIDEO_UPLOAD_MB`
- `MEDIA_WORKER_POLL_INTERVAL_MS`
- `MEDIA_WORKER_CONCURRENCY`
- `MEDIA_TRANSCODE_PRESET`

### Concurrency

The worker must claim jobs safely.

The first implementation supports one active processing job by default.

For PostgreSQL, still use a transactional claim step that prevents two workers from processing the same record if multiple worker processes are accidentally started.

`MEDIA_WORKER_CONCURRENCY` should default to `1`. Higher values are out of scope until processing load, CPU capacity, and storage throughput are measured.

## Risks

### Video processing load

Video transcoding is CPU intensive and may degrade the web app if run on the same machine.

Mitigation:

- Independent worker process.
- Low default concurrency.
- Clear operational documentation.

### Storage growth

Videos and playback files consume much more storage than images.

Mitigation:

- Configurable limits.
- Capacity accounting that includes derived files.
- Conservative defaults.

### Domain naming drift

Keeping the `Photo` table while adding videos can confuse future development.

Mitigation:

- Use `media` naming in new UI and APIs.
- Document `Photo` as a transitional storage model.
- Plan a later migration to `MediaAsset` only after feature stabilization.

### Public sharing semantics

Video public sharing can expose large files or private family content.

Mitigation:

- Keep token validation strict.
- Use playback-only public video shares by default.
- Add revocation and expiration visibility.

## Resolved Planning Decisions

These decisions are fixed for the first implementation plan:

- Initial maximum image upload size: `20MB`.
- Initial maximum video upload size: `512MB`.
- Public video shares: playback-only, no original video download.
- Worker concurrency: one active job by default.
- Worker claim safety: transactional claim even with default single-job processing.
- Generated playback, poster, and thumbnail files count against user quota after processing completes.
- Existing `/api/photos` endpoints remain as compatibility aliases during the transition.

## Out Of Scope For First Implementation

- Native mobile app.
- Cloud object storage.
- HLS adaptive streaming.
- AI face recognition.
- AI semantic search.
- True `Family` database entity.
- Full table rename from `Photo` to `MediaAsset`.
