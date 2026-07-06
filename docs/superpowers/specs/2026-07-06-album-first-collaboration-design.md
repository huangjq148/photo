# Album-First Collaboration Redesign

## Goal

Remove the user-facing concept of spaces and make albums the primary entry point, collaboration boundary, and photo container.

The home page action that currently opens spaces should open albums instead. After entering albums, users should see an album card list. Each album can be created with a name and optional cover, can invite other people, and all joined members can upload, edit, delete, and view photos in that album.

## Current Baseline

The current MVP uses spaces as the top-level collaboration model:

- `Space` owns photos and albums.
- `SpaceMember` controls membership.
- `SpaceInvite` handles invitation state.
- `Album` belongs to a space and groups photos through `AlbumPhoto`.
- Photo upload, listing, trash, favorites, and album operations validate space membership.
- The home page points authenticated users to `/spaces`.

This creates an extra layer for users who primarily think in albums. The redesign should keep the useful collaboration and permission mechanics, but move them from spaces to albums.

## Product Decisions

### Recommended Approach

Use albums as the only visible collection model.

Internally, migrate membership and invitations from space-level records to album-level records. Photos should belong directly to albums. This avoids continuing to maintain a hidden space abstraction that would leak into APIs, routes, and future features.

### Alternatives Considered

1. Keep spaces internally and hide them in the UI.
   - Pros: smaller short-term database change.
   - Cons: every new feature still has to reason about hidden spaces, invite wording becomes confusing, and API paths remain misleading.

2. Make albums first-class and migrate data ownership to albums.
   - Pros: domain model matches the product, routes become simpler, permissions are easier to explain, and future features do not depend on hidden concepts.
   - Cons: larger migration and more call sites to update.

3. Add album membership while keeping space-owned photos.
   - Pros: incremental.
   - Cons: creates two permission systems and unclear behavior when an album member is not a space member.

Choose option 2.

## User Experience

### Home

Authenticated users see a primary action labeled `进入相册`, linking to `/albums`.

Unauthenticated users may still see login/register actions, but any old `空间` label should be replaced with `相册`. If an unauthenticated user opens `/albums`, redirect to login and preserve the intended destination.

### Album List

Route: `/albums`

The page shows all albums the current user has joined.

Album cards should include:

- Cover image.
- Album name.
- Photo count.
- Member count.
- Last updated or last uploaded time.
- Current user's role if roles are kept.

Cards should be image-first and use the existing dark editorial visual system. Empty albums use a quiet placeholder cover.

Default sorting should put recently updated albums first. Updating an album name, changing the cover, inviting a member, uploading a photo, deleting a photo, or restoring a photo should update the album's `updated_at` timestamp.

### Album Cover

Cover resolution order:

1. If `cover_photo_id` is set, use that photo.
2. Otherwise use the most recently uploaded normal photo in the album.
3. Otherwise show an empty album placeholder.

Manual cover selection:

- Users can set any normal photo in the album as the cover.
- If the selected cover photo is deleted or permanently removed, clear `cover_photo_id` and fall back to the latest normal photo.
- Cover changes should be available to all joined members unless a stricter role model is introduced later.

### Album Creation

Creating an album should support:

- Required name.
- Optional cover photo.
- Optional initial invited people can be deferred to a later invite flow.

If a cover file is uploaded during creation, create the album first, upload the photo into that album, then set `cover_photo_id` to the uploaded photo.

The minimum creation flow should be fast:

1. Enter album name.
2. Optionally choose cover.
3. Create album.

### Album Detail

Route: `/albums/[albumId]`

The album detail page shows:

- Album title and cover context.
- Upload action.
- Invite members action.
- Cover management action.
- Photo grid.
- Batch selection actions for delete and other supported operations.

All existing photo capabilities should work within the album:

- Upload.
- View.
- Search or filter.
- Download.
- Favorite.
- Share public photo link.
- Soft delete.
- Restore from trash.
- Permanent delete.

### Invitation And Membership

Albums are collaborative. A member who joins an album can upload, modify, delete, and view photos in that album.

Initial role model:

- `owner`: album creator; can delete the album and remove members.
- `member`: can upload, edit metadata, set cover, delete photos, restore photos, and view all album photos.

The user's request says all joined members can upload, modify, delete, and view photos. That means the initial implementation should not add restrictive admin-only rules for normal photo actions.

Invite behavior:

- Album members can invite by email.
- If the invited email belongs to an existing user, accepting the invite adds that user to `AlbumMember`.
- If the email does not exist, registration followed by accepting the invite should add membership.
- Pending invites should expire.
- Duplicate pending invites for the same album and email should be deduplicated.

## Data Model

### Remove Or Deprecate

The user-facing replacement should eventually remove:

- `Space`
- `SpaceMember`
- `SpaceInvite`
- `SpaceType`
- `SpaceRole`

During migration, these can remain temporarily only to transform existing rows.

### Add Or Change

`Album`

- `id`
- `creator_id`
- `name`
- `description`
- `cover_photo_id`
- `created_at`
- `updated_at`

Remove `space_id`.

`AlbumMember`

- `id`
- `album_id`
- `user_id`
- `role`: `owner` or `member`
- `joined_at`
- unique `(album_id, user_id)`
- index `(user_id, joined_at)`

`Photo`

- Replace `space_id` with `album_id`.
- Keep uploader, storage, status, deletion, preview, thumbnail, and sharing fields.
- Index `(album_id, status, uploaded_at)`.

`AlbumInvite`

- `id`
- `album_id`
- `email`
- `role`
- `invited_by`
- `status`: `pending`, `accepted`, `expired`
- `created_at`
- `expired_at`
- unique or partial unique equivalent for pending `(album_id, email)`

`AlbumPhoto`

If photos belong directly to one album, remove `AlbumPhoto`. The album-photo relationship becomes `Album.photos`.

Keep a join table only if the product needs the same photo to live in multiple albums. That is not required by this request, so the simpler direct ownership model is preferred.

## Migration Plan

Use a staged migration to avoid data loss:

1. Add new `album_id` on `Photo`, `AlbumMember`, and `AlbumInvite` models while old space fields still exist.
2. Backfill album membership:
   - For each existing album, copy all members from its current space into `AlbumMember`.
   - Make the existing album creator or space owner the album owner.
3. Backfill photo ownership:
   - For photos already linked through `AlbumPhoto`, assign them to that album.
   - For photos not in any album, create a default album named after the old space, then assign those photos to it.
4. Backfill album invites from space invites where possible.
5. Update application reads and writes to album-owned data.
6. Remove old space routes and UI.
7. Drop old space tables and fields after verification.

If a photo appears in multiple albums through `AlbumPhoto`, create one copied ownership record only if storage duplication is acceptable. Otherwise keep `AlbumPhoto` and document that photos can appear in multiple albums. The preferred product rule is one photo belongs to one album.

## Routes

### Pages

Remove or redirect:

- `/spaces`
- `/spaces/[spaceId]`
- `/spaces/[spaceId]/photos`
- `/spaces/[spaceId]/albums`
- `/spaces/[spaceId]/albums/[albumId]`

Add:

- `/albums`
- `/albums/[albumId]`
- `/albums/[albumId]/trash` if trash remains album-scoped.

Global favorites can remain at `/favorites`.

Global trash can remain at `/trash` only if it lists deleted photos across all albums the user belongs to. Otherwise redirect users to album-scoped trash.

### API

Remove or redirect old space APIs:

- `/api/spaces`
- `/api/spaces/[id]`
- `/api/spaces/[id]/albums`
- `/api/spaces/[id]/photos`
- `/api/spaces/[id]/photos/upload`
- `/api/spaces/[id]/photos/batch-delete`

Add:

- `GET /api/albums`
- `POST /api/albums`
- `GET /api/albums/[id]`
- `PATCH /api/albums/[id]`
- `DELETE /api/albums/[id]`
- `GET /api/albums/[id]/photos`
- `POST /api/albums/[id]/photos/upload`
- `POST /api/albums/[id]/photos/batch-delete`
- `PATCH /api/albums/[id]/cover`
- `GET /api/albums/[id]/members`
- `POST /api/albums/[id]/invites`
- `POST /api/album-invites/[token]/accept`

Photo APIs that operate by photo ID can stay mostly unchanged, but their authorization must validate album membership instead of space membership.

## Authorization Rules

Every album-scoped operation must call a shared membership assertion:

- `assertAlbumMembership(prisma, albumId, userId)`
- `assertAlbumOwner(prisma, albumId, userId)` for album deletion and member removal

Allowed for all members:

- View album.
- List photos.
- Upload photos.
- Edit album name if product accepts open collaboration.
- Set cover.
- Soft delete photos.
- Restore photos.
- Permanently delete photos.
- Invite others.

Owner-only:

- Delete album.
- Remove members.
- Transfer ownership if added later.

For destructive actions, the UI should still show confirmation states even when all members are allowed to perform the action.

## Service Layer Changes

Rename or replace space-based library functions:

- `getUserSpaces` -> `getUserAlbums`
- `getSpaceDetail` -> `getAlbumSummary`
- `getSpaceAlbums` -> `getUserAlbums`
- `getSpacePhotos` -> `getAlbumPhotos`
- `uploadPhotoToSpace` -> `uploadPhotoToAlbum`

Move membership checks out of photo functions that currently accept `spaceId`; photo functions should either accept `albumId` directly or load the photo and validate the caller's album membership.

## UI Component Changes

Replace:

- `components/spaces/*`
- `app/spaces/*`

With:

- `components/albums/album-card.tsx`
- `components/albums/album-list.tsx`
- `components/albums/album-create-form.tsx`
- `components/albums/album-detail.tsx`
- `components/albums/album-members.tsx`
- `components/albums/album-invite-form.tsx`
- `components/photos/photo-gallery.tsx` updated to use `albumId`

The album card should have stable dimensions:

- Fixed aspect ratio for cover.
- Name and metadata below or overlaid with enough contrast.
- No layout shift when cover images load.

## Error Handling

Use clear error responses:

- `401` when no session exists.
- `403` when the user is not an album member.
- `404` when the album, photo, or invite does not exist or is inaccessible.
- `409` for duplicate pending invites.
- `422` for invalid album names, invalid cover photo, or invalid invite email.

If the selected cover photo is deleted between request and update, return `422`.

## Testing

Update test coverage around the new album-first model:

- Home authenticated CTA links to `/albums` and uses `进入相册`.
- Album list returns albums joined by the current user.
- Album cards expose cover fallback behavior.
- Album creation supports name and optional cover.
- Album invite creates, accepts, expires, and deduplicates invitations.
- Album members can upload, edit, delete, restore, permanently delete, and view photos.
- Non-members cannot access album photos or metadata.
- Deleted cover photo falls back to the latest normal photo.
- Legacy `/spaces` routes redirect or return the chosen deprecation response.

Existing space tests should be replaced rather than adapted around hidden spaces.

## Rollout

1. Introduce album membership and album-owned photo APIs behind new routes.
2. Update home and navigation to point to `/albums`.
3. Replace spaces pages with album pages.
4. Migrate existing data.
5. Add redirects from old space URLs to the closest album destination where possible.
6. Remove space model and dead code after tests and manual verification pass.

## Open Decisions

The implementation plan should confirm these before coding:

- Whether the same photo can appear in multiple albums. Recommended: no, one photo belongs to one album.
- Whether all members can edit album name and cover. Recommended: yes, matching the requested collaboration behavior.
- Whether global trash remains across all albums. Recommended: keep global trash for convenience, backed by album membership checks.
- Whether invites are email-only or token links can be copied manually. Recommended: support email field and token acceptance route first.
