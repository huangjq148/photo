# Album-First Collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the app from space-centric to album-centric — albums become the primary entry point, collaboration boundary, and photo container. Each user gets a default "全部照片" album on registration; photos uploaded into it can be referenced by other albums via AlbumPhoto join table.

**Architecture:** Remove the Space/SpaceMember/SpaceInvite model layer, add AlbumMember/AlbumInvite models directly on Album. Photos get `album_id` pointing to their owning "全部照片" album; AlbumPhoto join table remains for multi-album references. Old `/spaces` routes redirect to `/albums`.

**Tech Stack:** Next.js 15, Prisma, PostgreSQL, TypeScript, React 19, Vitest

---

## File Structure

### Create

| File | Responsibility |
|------|---------------|
| `app/albums/page.tsx` | Album list page |
| `app/albums/[albumId]/page.tsx` | Album detail page |
| `app/api/albums/route.ts` | GET (list user albums) + POST (create album) |
| `app/api/albums/[id]/route.ts` | GET/PATCH/DELETE single album |
| `app/api/albums/[id]/photos/route.ts` | GET (list album photos via references) |
| `app/api/albums/[id]/photos/upload/route.ts` | POST upload photo into album |
| `app/api/albums/[id]/photos/batch-delete/route.ts` | POST batch soft-delete photos |
| `app/api/albums/[id]/cover/route.ts` | PATCH set album cover |
| `app/api/albums/[id]/members/route.ts` | GET list members + DELETE remove member |
| `app/api/albums/[id]/invites/route.ts` | GET list invites + POST create invite |
| `app/api/album-invites/[token]/accept/route.ts` | POST accept invite |
| `components/albums/album-card.tsx` | Single album card with cover/name/meta |
| `components/albums/album-create-form.tsx` | Create album form (name + optional cover) |
| `components/albums/album-members.tsx` | Member list with remove button |
| `components/albums/album-invite-form.tsx` | Invite by email + copy link |
| `lib/albums/library.ts` | Rewrite — all album-first service functions |
| `lib/membership.ts` | Shared `assertAlbumMembership` / `assertAlbumOwner` |
| `prisma/migrations/*` | Auto-generated migration |

### Modify

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add AlbumMember, AlbumInvite; add `album_id` + `is_default`/`is_immutable` to Album; add `album_id` to Photo; remove space_id from Album; keep Space models for migration |
| `lib/photos/library.ts` | Replace space membership checks → album membership checks; update trash queries to use album_id; add restore-references logic |
| `lib/photos/upload.ts` | Change `uploadPhotoToSpace` → `uploadPhotoToAlbum`; validate album membership |
| `lib/photos/shares.ts` | Replace `getPhotoDetails` space membership check (it delegates to library) |
| `lib/auth/redirects.ts` | `/spaces` → `/albums` |
| `components/home/home-actions.tsx` | "进入空间" → "进入相册", `/spaces` → `/albums` |
| `components/layout/app-shell.tsx` | Nav "空间" → "相册", `/spaces` → `/albums` |
| `components/photos/photo-gallery.tsx` | Accept `albumId` instead of `spaceId`; API paths to album routes |
| `components/upload/photo-upload-form.tsx` | Accept `albumId`; upload to album endpoint |
| `components/albums/album-list.tsx` | Rewrite — list user's joined albums from `/api/albums` |
| `components/albums/album-detail.tsx` | Rewrite — full album detail with upload/invite/members/cover management |
| `app/page.tsx` | No changes needed (delegates to HomeActions) |
| `app/favorites/page.tsx` | Change "空间" link → "相册", `/spaces` → `/albums` |
| `app/trash/page.tsx` | Change "空间" link → "相册", `/spaces` → `/albums` |
| `app/share/[token]/page.tsx` | Update spaceName reference (photo.space → photo.album) |
| `app/api/files/[variant]/[fileName]/route.ts` | Change space membership check → album membership check |
| `app/api/photos/[id]/route.ts` | Change auth check from space → album |
| `app/api/photos/[id]/download/route.ts` | Change auth check from space → album |
| `app/api/photos/[id]/favorite/route.ts` | Change auth check from space → album |
| `app/api/photos/[id]/restore/route.ts` | Change auth check; add refs restoration |
| `app/api/photos/[id]/permanent-delete/route.ts` | Change auth check; cleanup album refs |
| `app/api/photos/[id]/share/route.ts` | Delegates to library — auth check updated there |
| `app/api/trash/photos/route.ts` | Update trash query to use album membership |
| `app/api/trash/photos/[id]/route.ts` | Auth check updated |
| `app/api/trash/photos/[id]/restore/route.ts` | Auth check updated |
| `app/api/trash/photos/batch-delete/route.ts` | Auth check updated |
| `app/api/trash/photos/batch-restore/route.ts` | Auth check updated |
| `app/api/favorites/route.ts` | No changes needed (uses user_id directly) |

### Redirect (old space routes)

| File | Action |
|------|--------|
| `app/spaces/page.tsx` | Replace with redirect to `/albums` |
| `app/spaces/[spaceId]/page.tsx` | Replace with redirect to `/albums` |
| `app/spaces/[spaceId]/photos/page.tsx` | Replace with redirect to `/albums` |
| `app/spaces/[spaceId]/albums/page.tsx` | Replace with redirect to `/albums` |
| `app/spaces/[spaceId]/albums/[albumId]/page.tsx` | Replace with redirect to `/albums/[albumId]` |
| `app/api/spaces/route.ts` | Return 410 Gone |
| `app/api/spaces/[id]/route.ts` | Return 410 Gone |
| `app/api/spaces/[id]/photos/route.ts` | Return 410 Gone |
| `app/api/spaces/[id]/photos/upload/route.ts` | Return 410 Gone |
| `app/api/spaces/[id]/photos/batch-delete/route.ts` | Return 410 Gone |
| `app/api/spaces/[id]/albums/route.ts` | Return 410 Gone |

### Remove (after migration verified)

| File |
|------|
| `components/spaces/space-chrome.tsx` |
| `components/spaces/space-detail-header.tsx` |
| `components/spaces/space-list.tsx` |
| `lib/spaces/library.ts` |
| `app/api/albums/[id]/photos/[photoId]/route.ts` (old remove-from-album — replace with new ref management) |

### Test Updates

| File | Changes |
|------|---------|
| `tests/auth-navigation.test.ts` | Update to reference `/albums` and "进入相册" |
| `tests/spaces.test.ts` | Rewrite as `tests/albums.test.ts` for album membership |
| `tests/albums.test.ts` | Rewrite for album-first model |
| `tests/photo-library.test.ts` | Update for album-based ownership |
| `tests/photo-upload.test.ts` | Update for album-based upload |
| `tests/space-presentations.test.ts` | Rewrite as album card tests |

---

### Task 1: Database Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add AlbumMember model to schema**

In `prisma/schema.prisma`, add after the Album model:

```prisma
model AlbumMember {
  id        String   @id @default(uuid()) @db.Uuid
  album_id  String   @db.Uuid
  user_id   String   @db.Uuid
  role      String   @default("member") // "owner" | "member"
  joined_at DateTime @default(now())

  album     Album    @relation(fields: [album_id], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([album_id, user_id])
  @@index([user_id, joined_at])
}
```

- [ ] **Step 2: Add AlbumInvite model to schema**

Add after AlbumMember:

```prisma
model AlbumInvite {
  id         String   @id @default(uuid()) @db.Uuid
  album_id   String   @db.Uuid
  email      String
  role       String   @default("member")
  invited_by String   @db.Uuid
  token      String   @unique
  status     String   @default("pending") // "pending" | "accepted" | "expired"
  created_at DateTime @default(now())
  expired_at DateTime

  album      Album    @relation(fields: [album_id], references: [id], onDelete: Cascade)
  inviter    User     @relation(fields: [invited_by], references: [id], onDelete: Cascade)

  @@index([album_id, email, status])
}
```

- [ ] **Step 3: Modify Album model**

Change Album to remove `space_id`, add `is_default` and `is_immutable`:

```prisma
model Album {
  id             String      @id @default(uuid()) @db.Uuid
  creator_id     String      @db.Uuid
  name           String
  description    String?
  cover_photo_id String?     @db.Uuid
  is_default     Boolean     @default(false)
  is_immutable   Boolean     @default(false)
  created_at     DateTime    @default(now())
  updated_at     DateTime    @updatedAt

  creator        User         @relation("AlbumCreator", fields: [creator_id], references: [id], onDelete: Cascade)
  coverPhoto     Photo?       @relation("AlbumCoverPhoto", fields: [cover_photo_id], references: [id], onDelete: SetNull)
  photos         AlbumPhoto[]
  members        AlbumMember[]
  invites        AlbumInvite[]

  @@index([creator_id, created_at])
}
```

- [ ] **Step 4: Add album_id to Photo model**

Remove `space_id` field and `space` relation from Photo. Add:

```prisma
  album_id          String                @db.Uuid
  album             Album                 @relation(fields: [album_id], references: [id], onDelete: Cascade)
```

Update indexes: replace `@@index([space_id, status, uploaded_at])` with `@@index([album_id, status, uploaded_at])`.

- [ ] **Step 5: Add AlbumMember and AlbumInvite relations to User model**

Add to User:
```prisma
  albumMemberships AlbumMember[]
  albumInvitesSent AlbumInvite[] @relation("AlbumInviteSender")
```

- [ ] **Step 6: Remove old Photo-Space relations**

Remove from Photo:
- `space_id` field
- `space` relation  
- `coverForSpaces` relation

Remove from User:
- `ownedSpaces` relation
- `memberships` (SpaceMember) relation
- `invitesSent` (SpaceInvite) relation

- [ ] **Step 7: Keep Space models for migration (mark deprecated)**

Keep Space, SpaceMember, SpaceInvite but add comment: `// DEPRECATED: to be removed after data migration`

- [ ] **Step 8: Run migration**

```bash
cd /Users/zyq/project/photo && npx prisma migrate dev --name album_first_refactor
```

Expected: Migration created successfully. Verify with `npx prisma db push --accept-data-loss` if needed for dev.

- [ ] **Step 9: Run Prisma generate**

```bash
npx prisma generate
```

- [ ] **Step 10: Commit schema**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add AlbumMember, AlbumInvite models; refactor Album/Photo for album-first"
```

---

### Task 2: Shared Membership Assertion Library

**Files:**
- Create: `lib/membership.ts`

- [ ] **Step 1: Create membership assertion functions**

```typescript
import type { PrismaClient } from "@prisma/client";

export async function assertAlbumMembership(
  prisma: PrismaClient,
  albumId: string,
  userId: string
) {
  const membership = await prisma.albumMember.findUnique({
    where: {
      album_id_user_id: {
        album_id: albumId,
        user_id: userId,
      },
    },
  });

  if (!membership) {
    throw new Error("User is not a member of this album");
  }

  return membership;
}

export async function assertAlbumOwner(
  prisma: PrismaClient,
  albumId: string,
  userId: string
) {
  const membership = await assertAlbumMembership(prisma, albumId, userId);

  if (membership.role !== "owner") {
    throw new Error("Only the album owner can perform this action");
  }

  return membership;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/membership.ts
git commit -m "feat: add shared album membership assertion helpers"
```

---

### Task 3: Rewrite Album Service Library

**Files:**
- Modify: `lib/albums/library.ts`

- [ ] **Step 1: Rewrite with album-first functions**

```typescript
import type { PrismaClient } from "@prisma/client";
import { assertAlbumMembership, assertAlbumOwner } from "@/lib/membership";

// ── Album CRUD ──

export type AlbumSummary = {
  id: string;
  name: string;
  description: string | null;
  coverPhotoId: string | null;
  coverUrl: string | null;
  isDefault: boolean;
  isImmutable: boolean;
  photoCount: number;
  memberCount: number;
  role: string;
  updatedAt: Date;
};

export async function getUserAlbums(
  prisma: PrismaClient,
  userId: string
): Promise<AlbumSummary[]> {
  const memberships = await prisma.albumMember.findMany({
    where: { user_id: userId },
    include: {
      album: {
        include: {
          _count: {
            select: {
              photos: true,
              members: true,
            },
          },
          coverPhoto: {
            select: { thumbnail_url: true },
          },
        },
      },
    },
    orderBy: { album: { updated_at: "desc" } },
  });

  return memberships.map((m) => ({
    id: m.album.id,
    name: m.album.name,
    description: m.album.description,
    coverPhotoId: m.album.cover_photo_id,
    coverUrl: m.album.coverPhoto?.thumbnail_url ?? null,
    isDefault: m.album.is_default,
    isImmutable: m.album.is_immutable,
    photoCount: m.album._count.photos,
    memberCount: m.album._count.members,
    role: m.role,
    updatedAt: m.album.updated_at,
  }));
}

export async function createAlbum(
  prisma: PrismaClient,
  context: {
    userId: string;
    name: string;
    description?: string;
  }
) {
  const album = await prisma.album.create({
    data: {
      creator_id: context.userId,
      name: context.name,
      description: context.description,
    },
  });

  // Creator is automatically the owner
  await prisma.albumMember.create({
    data: {
      album_id: album.id,
      user_id: context.userId,
      role: "owner",
    },
  });

  return album;
}

export async function getAlbumDetail(
  prisma: PrismaClient,
  context: { albumId: string; userId: string }
) {
  const membership = await assertAlbumMembership(prisma, context.albumId, context.userId);

  const album = await prisma.album.findUnique({
    where: { id: context.albumId },
    include: {
      coverPhoto: {
        select: { thumbnail_url: true, preview_url: true },
      },
      _count: {
        select: { photos: true, members: true },
      },
    },
  });

  if (!album) throw new Error("Album not found");

  return {
    id: album.id,
    name: album.name,
    description: album.description,
    coverPhotoId: album.cover_photo_id,
    coverUrl: album.coverPhoto?.thumbnail_url ?? null,
    previewUrl: album.coverPhoto?.preview_url ?? null,
    isDefault: album.is_default,
    isImmutable: album.is_immutable,
    photoCount: album._count.photos,
    memberCount: album._count.members,
    role: membership.role,
    createdAt: album.created_at,
    updatedAt: album.updated_at,
  };
}

export async function updateAlbum(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; name?: string; description?: string }
) {
  const album = await prisma.album.findUnique({ where: { id: context.albumId } });
  if (!album) throw new Error("Album not found");
  if (album.is_immutable) throw new Error("This album cannot be edited");

  await assertAlbumMembership(prisma, context.albumId, context.userId);

  return prisma.album.update({
    where: { id: context.albumId },
    data: {
      ...(context.name !== undefined ? { name: context.name } : {}),
      ...(context.description !== undefined ? { description: context.description } : {}),
    },
  });
}

export async function deleteAlbum(
  prisma: PrismaClient,
  context: { albumId: string; userId: string }
) {
  const album = await prisma.album.findUnique({ where: { id: context.albumId } });
  if (!album) throw new Error("Album not found");
  if (album.is_immutable) throw new Error("This album cannot be deleted");

  await assertAlbumOwner(prisma, context.albumId, context.userId);

  await prisma.album.delete({ where: { id: context.albumId } });
}

// ── Cover Management ──

export async function setAlbumCover(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; photoId: string }
) {
  await assertAlbumMembership(prisma, context.albumId, context.userId);

  // Verify the photo is referenced by this album
  const ref = await prisma.albumPhoto.findUnique({
    where: {
      album_id_photo_id: {
        album_id: context.albumId,
        photo_id: context.photoId,
      },
    },
  });

  if (!ref) throw new Error("Photo is not in this album");

  return prisma.album.update({
    where: { id: context.albumId },
    data: { cover_photo_id: context.photoId },
  });
}

// ── Album Photos (references) ──

export type AlbumPhotoItem = {
  id: string;
  originalName: string;
  thumbnailUrl: string;
  previewUrl: string;
  mimeType: string;
  width: number;
  height: number;
  uploadedAt: Date;
};

export async function getAlbumPhotos(
  prisma: PrismaClient,
  context: {
    albumId: string;
    userId: string;
    page: number;
    pageSize: number;
    keyword?: string;
    sortBy?: string;
    sortOrder?: string;
  }
) {
  await assertAlbumMembership(prisma, context.albumId, context.userId);

  const page = Math.max(1, Math.floor(context.page));
  const pageSize = Math.min(Math.max(Math.floor(context.pageSize), 1), 50);

  const where = {
    album_id: context.albumId,
    photo: {
      status: "normal" as const,
      ...(context.keyword
        ? {
            OR: [
              { original_name: { contains: context.keyword, mode: "insensitive" as const } },
              { file_name: { contains: context.keyword, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
  };

  const [total, refs] = await Promise.all([
    prisma.albumPhoto.count({ where }),
    prisma.albumPhoto.findMany({
      where,
      include: { photo: true },
      orderBy: { added_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    page,
    pageSize,
    total,
    items: refs.map((ref) => ({
      id: ref.photo.id,
      originalName: ref.photo.original_name,
      thumbnailUrl: ref.photo.thumbnail_url,
      previewUrl: ref.photo.preview_url,
      mimeType: ref.photo.mime_type,
      width: ref.photo.width,
      height: ref.photo.height,
      uploadedAt: ref.photo.uploaded_at,
    })),
  };
}

export async function addPhotosToAlbum(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; photoIds: string[] }
) {
  const album = await prisma.album.findUnique({ where: { id: context.albumId } });
  if (!album) throw new Error("Album not found");

  await assertAlbumMembership(prisma, context.albumId, context.userId);

  for (const photoId of context.photoIds) {
    await prisma.albumPhoto.upsert({
      where: {
        album_id_photo_id: {
          album_id: context.albumId,
          photo_id: photoId,
        },
      },
      update: {},
      create: {
        album_id: context.albumId,
        photo_id: photoId,
        added_by: context.userId,
      },
    });
  }

  // Touch updated_at
  await prisma.album.update({
    where: { id: context.albumId },
    data: { updated_at: new Date() },
  });
}

export async function removePhotoFromAlbum(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; photoId: string }
) {
  const album = await prisma.album.findUnique({ where: { id: context.albumId } });
  if (!album) throw new Error("Album not found");

  await assertAlbumMembership(prisma, context.albumId, context.userId);

  // Clear cover if the removed photo was the cover
  if (album.cover_photo_id === context.photoId) {
    await prisma.album.update({
      where: { id: context.albumId },
      data: { cover_photo_id: null },
    });
  }

  await prisma.albumPhoto.deleteMany({
    where: {
      album_id: context.albumId,
      photo_id: context.photoId,
    },
  });

  await prisma.album.update({
    where: { id: context.albumId },
    data: { updated_at: new Date() },
  });
}

// ── Members ──

export async function getAlbumMembers(
  prisma: PrismaClient,
  context: { albumId: string; userId: string }
) {
  await assertAlbumMembership(prisma, context.albumId, context.userId);

  return prisma.albumMember.findMany({
    where: { album_id: context.albumId },
    include: {
      user: {
        select: { id: true, email: true, nickname: true, avatar_url: true },
      },
    },
    orderBy: { joined_at: "asc" },
  });
}

export async function removeAlbumMember(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; targetUserId: string }
) {
  await assertAlbumOwner(prisma, context.albumId, context.userId);

  if (context.userId === context.targetUserId) {
    throw new Error("Owner cannot remove themselves");
  }

  await prisma.albumMember.deleteMany({
    where: {
      album_id: context.albumId,
      user_id: context.targetUserId,
    },
  });
}

// ── Invites ──

export type AlbumInviteItem = {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  createdAt: Date;
  expiredAt: Date;
};

export async function getAlbumInvites(
  prisma: PrismaClient,
  context: { albumId: string; userId: string }
) {
  await assertAlbumMembership(prisma, context.albumId, context.userId);

  return prisma.albumInvite.findMany({
    where: { album_id: context.albumId },
    orderBy: { created_at: "desc" },
  });
}

export async function createAlbumInvite(
  prisma: PrismaClient,
  context: { albumId: string; userId: string; email: string }
) {
  await assertAlbumMembership(prisma, context.albumId, context.userId);

  // Check for existing pending invite
  const existing = await prisma.albumInvite.findFirst({
    where: {
      album_id: context.albumId,
      email: context.email,
      status: "pending",
    },
  });

  if (existing) {
    throw new Error("An active invite already exists for this email");
  }

  // Check if already a member
  const user = await prisma.user.findUnique({ where: { email: context.email } });
  if (user) {
    const membership = await prisma.albumMember.findUnique({
      where: {
        album_id_user_id: {
          album_id: context.albumId,
          user_id: user.id,
        },
      },
    });
    if (membership) throw new Error("User is already a member of this album");
  }

  const token = crypto.randomUUID();
  const expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return prisma.albumInvite.create({
    data: {
      album_id: context.albumId,
      email: context.email,
      role: "member",
      invited_by: context.userId,
      token,
      status: "pending",
      expired_at: expiredAt,
    },
  });
}

export async function acceptAlbumInvite(
  prisma: PrismaClient,
  context: { token: string; userId: string }
) {
  const invite = await prisma.albumInvite.findUnique({
    where: { token: context.token },
  });

  if (!invite) throw new Error("Invite not found");
  if (invite.status !== "pending") throw new Error("Invite is no longer valid");
  if (invite.expired_at < new Date()) {
    await prisma.albumInvite.update({
      where: { id: invite.id },
      data: { status: "expired" },
    });
    throw new Error("Invite has expired");
  }

  // Verify email matches
  const user = await prisma.user.findUnique({ where: { id: context.userId } });
  if (!user || user.email !== invite.email) {
    throw new Error("This invite is for a different email address");
  }

  await prisma.$transaction([
    prisma.albumMember.create({
      data: {
        album_id: invite.album_id,
        user_id: context.userId,
        role: invite.role,
      },
    }),
    prisma.albumInvite.update({
      where: { id: invite.id },
      data: { status: "accepted" },
    }),
  ]);

  return { albumId: invite.album_id };
}

// ── Default Album Creation (on user registration) ──

export async function createDefaultAlbum(
  prisma: PrismaClient,
  userId: string
) {
  const album = await prisma.album.create({
    data: {
      creator_id: userId,
      name: "全部照片",
      description: "所有上传的照片",
      is_default: true,
      is_immutable: true,
    },
  });

  await prisma.albumMember.create({
    data: {
      album_id: album.id,
      user_id: userId,
      role: "owner",
    },
  });

  return album;
}

export async function getUserDefaultAlbumId(
  prisma: PrismaClient,
  userId: string
): Promise<string> {
  const membership = await prisma.albumMember.findFirst({
    where: {
      user_id: userId,
      album: { is_default: true },
    },
    include: { album: true },
  });

  if (!membership) throw new Error("Default album not found");
  return membership.album.id;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/albums/library.ts
git commit -m "feat: rewrite album library for album-first model with membership, invites, default album"
```

---

### Task 4: Update Photo Upload Service

**Files:**
- Modify: `lib/photos/upload.ts`

- [ ] **Step 1: Rewrite uploadPhotoToAlbum**

Replace `uploadPhotoToSpace` with `uploadPhotoToAlbum`. Changes:
- Replace space membership check → `assertAlbumMembership`
- Update photo creation to use `album_id` instead of `space_id`
- Update storage quota check to use album-level (skip space check)
- Add the uploaded photo to the album's AlbumPhoto reference

Key changes in the function signature and body:
- `spaceId` → `albumId`
- Remove `prisma.space.findUnique` / `prisma.space.update` calls
- After photo creation, also call `addPhotosToAlbum` to create the reference

- [ ] **Step 2: Commit**

```bash
git add lib/photos/upload.ts
git commit -m "feat: refactor upload to album-first model"
```

---

### Task 5: Update Photo Library Service

**Files:**
- Modify: `lib/photos/library.ts`

- [ ] **Step 1: Replace space membership checks with album membership checks**

Key changes:
- `assertSpaceMembership` → `assertAlbumMembership`
- `loadAccessiblePhoto`: validate via `photo.album_id` instead of `photo.space_id`
- `loadAccessiblePhotos`: validate via `spaceId` → `albumId`
- `loadTrashAccessiblePhotos`: update to use album membership
- `canManagePhoto`: replace `photo.space.owner_id` check with album membership check
- `getSpacePhotos` → `getAlbumPhotos` (or keep as `getPhotosByAlbum`)
- `getTrashPhotos`: update to query by album membership
- `softDeletePhoto` / `softDeletePhotos`: update context from `spaceId` → `albumId`
- `restorePhoto` / `restorePhotos`: update context; after restore, re-create AlbumPhoto references for all albums that referenced this photo before deletion
- `permanentlyDeletePhoto` / `permanentlyDeletePhotos`: update context; remove space storage tracking → album-level only
- `permanentlyDeleteTrashPhotos`: same changes

The trash restore must re-create AlbumPhoto references. Store remembered references in a separate approach or query AlbumPhoto for deleted photos (they cascade-delete with photo which is a problem — so don't cascade; instead we handle references manually).

Actually, we need to NOT cascade-delete Photo from AlbumPhoto. Instead, on permanent delete, manually delete AlbumPhoto refs first.

- [ ] **Step 2: Commit**

```bash
git add lib/photos/library.ts
git commit -m "feat: refactor photo library to album-first membership checks"
```

---

### Task 6: Update Photo Shares

**Files:**
- Modify: `lib/photos/shares.ts`

- [ ] **Step 1: Update space references**

In `getPublicPhotoShare`, change `photo.space.name` → `photo.album.name` (update the include). This function delegates to `getPhotoDetails` which already handles auth.

- [ ] **Step 2: Commit**

```bash
git add lib/photos/shares.ts
git commit -m "fix: update shares for album-first model"
```

---

### Task 7: Update Auth Redirects

**Files:**
- Modify: `lib/auth/redirects.ts`

- [ ] **Step 1: Update redirect path**

```typescript
export function getAuthenticatedRedirectPath(isAuthenticated: boolean) {
  return isAuthenticated ? "/albums" : null;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth/redirects.ts
git commit -m "feat: redirect authenticated users to /albums"
```

---

### Task 8: New Album API Routes

**Files:**
- Create: `app/api/albums/route.ts`
- Create: `app/api/albums/[id]/route.ts`
- Create: `app/api/albums/[id]/photos/route.ts`
- Create: `app/api/albums/[id]/photos/upload/route.ts`
- Create: `app/api/albums/[id]/photos/batch-delete/route.ts`
- Create: `app/api/albums/[id]/cover/route.ts`
- Create: `app/api/albums/[id]/members/route.ts`
- Create: `app/api/albums/[id]/invites/route.ts`
- Create: `app/api/album-invites/[token]/accept/route.ts`

- [ ] **Step 1: Create GET/POST /api/albums**

`GET` returns `getUserAlbums(prisma, user.id)`. `POST` creates album from `{ name, description }`.

- [ ] **Step 2: Create GET/PATCH/DELETE /api/albums/[id]**

`GET` returns `getAlbumDetail`. `PATCH` updates album name/description. `DELETE` deletes album (with is_immutable check).

- [ ] **Step 3: Create GET /api/albums/[id]/photos**

Returns `getAlbumPhotos` with pagination, keyword, sort params.

- [ ] **Step 4: Create POST /api/albums/[id]/photos/upload**

Calls `uploadPhotoToAlbum` then adds photo to the default album + current album.

- [ ] **Step 5: Create POST /api/albums/[id]/photos/batch-delete**

Calls `softDeletePhotos` with album context.

- [ ] **Step 6: Create PATCH /api/albums/[id]/cover**

Calls `setAlbumCover` with `{ photoId }` from body.

- [ ] **Step 7: Create GET/DELETE /api/albums/[id]/members**

`GET` returns `getAlbumMembers`. `DELETE` removes member by `{ userId }` body.

- [ ] **Step 8: Create GET/POST /api/albums/[id]/invites**

`GET` returns `getAlbumInvites`. `POST` creates invite from `{ email }` body.

- [ ] **Step 9: Create POST /api/album-invites/[token]/accept**

Calls `acceptAlbumInvite`.

- [ ] **Step 10: Commit**

```bash
git add app/api/albums/ app/api/album-invites/
git commit -m "feat: add album-first API routes for albums, photos, members, invites"
```

---

### Task 9: Deprecate Old Space API Routes

**Files:**
- Modify: `app/api/spaces/route.ts`
- Modify: `app/api/spaces/[id]/route.ts`
- Modify: `app/api/spaces/[id]/photos/route.ts`
- Modify: `app/api/spaces/[id]/photos/upload/route.ts`
- Modify: `app/api/spaces/[id]/photos/batch-delete/route.ts`
- Modify: `app/api/spaces/[id]/albums/route.ts`

- [ ] **Step 1: Replace all space API routes with 410 Gone response**

Each route returns:
```typescript
return NextResponse.json({ error: "Space API has been deprecated. Use /api/albums instead." }, { status: 410 });
```

- [ ] **Step 2: Commit**

```bash
git add app/api/spaces/
git commit -m "feat: deprecate space API routes with 410 Gone"
```

---

### Task 10: Update Existing Photo API Routes

**Files:**
- Modify: `app/api/photos/[id]/route.ts`
- Modify: `app/api/photos/[id]/download/route.ts`
- Modify: `app/api/photos/[id]/favorite/route.ts`
- Modify: `app/api/photos/[id]/restore/route.ts`
- Modify: `app/api/photos/[id]/permanent-delete/route.ts`
- Modify: `app/api/files/[variant]/[fileName]/route.ts`
- Modify: `app/api/trash/photos/route.ts`
- Modify: `app/api/trash/photos/[id]/route.ts`
- Modify: `app/api/trash/photos/[id]/restore/route.ts`
- Modify: `app/api/trash/photos/batch-delete/route.ts`
- Modify: `app/api/trash/photos/batch-restore/route.ts`

- [ ] **Step 1: Update file serving auth check**

In `app/api/files/[variant]/[fileName]/route.ts`, replace:
```typescript
space: {
  members: {
    some: {
      user_id: user.id
    }
  }
}
```
With checking if the user is a member of the photo's album.

- [ ] **Step 2: Verify other photo routes work with updated library**

The photo routes (`/api/photos/[id]/*`) call library functions which now use album membership checks. No route-level changes needed as long as library handles auth correctly.

- [ ] **Step 3: Update trash routes**

Trash routes call library functions that now use album membership. The `getTrashPhotos` needs to list deleted photos from albums the user belongs to. Update the trash query accordingly.

- [ ] **Step 4: Commit**

```bash
git add app/api/photos/ app/api/files/ app/api/trash/
git commit -m "fix: update existing photo/file/trash routes for album-first auth"
```

---

### Task 11: New Album UI Components

**Files:**
- Create: `components/albums/album-card.tsx`
- Create: `components/albums/album-create-form.tsx`
- Create: `components/albums/album-members.tsx`
- Create: `components/albums/album-invite-form.tsx`

- [ ] **Step 1: Create AlbumCard component**

A card component with:
- Cover image (from `coverUrl`, with placeholder for empty)
- Album name
- Photo count + member count
- Updated time
- Fixed aspect ratio cover, stable dimensions
- Link to `/albums/[id]`

Use the existing dark editorial visual system (matching SpaceCard style).

- [ ] **Step 2: Create AlbumCreateForm component**

Modal or inline form with:
- Name input (required)
- Submit button
- Fast minimal flow

- [ ] **Step 3: Create AlbumMembers component**

List of members with:
- Nickname + email
- Role badge
- Remove button (for owner only, on non-owner members)

- [ ] **Step 4: Create AlbumInviteForm component**

Invite form with:
- Email input
- "发送邀请" button
- "复制邀请链接" button for each pending invite
- Pending invites list with status

- [ ] **Step 5: Commit**

```bash
git add components/albums/
git commit -m "feat: add album card, create form, members, invite form components"
```

---

### Task 12: Rewrite Album List Component

**Files:**
- Modify: `components/albums/album-list.tsx`

- [ ] **Step 1: Rewrite album list**

Replace current implementation. New version:
- Fetches from `/api/albums`
- Shows AlbumCard grid
- Includes "创建新相册" button that opens AlbumCreateForm
- Active "全部照片" album with special indicator
- Loading/empty/error states
- Auth-required state with login link

- [ ] **Step 2: Commit**

```bash
git add components/albums/album-list.tsx
git commit -m "feat: rewrite album list for album-first model"
```

---

### Task 13: Rewrite Album Detail Component

**Files:**
- Modify: `components/albums/album-detail.tsx`

- [ ] **Step 1: Rewrite album detail**

Full album detail page component:
- Album header: name, description, cover, member count, photo count
- Edit name button (unless immutable)
- Delete album button (owner only, unless immutable)
- Cover management: set cover from album photos
- Tab/section: Photos (PhotoGallery with albumId), Members (AlbumMembers), Invites (AlbumInviteForm)
- Upload form integration

- [ ] **Step 2: Commit**

```bash
git add components/albums/album-detail.tsx
git commit -m "feat: rewrite album detail with full management UI"
```

---

### Task 14: New Album Page Routes

**Files:**
- Create: `app/albums/page.tsx`
- Create: `app/albums/[albumId]/page.tsx`

- [ ] **Step 1: Create /albums page**

```tsx
import { AlbumList } from "@/components/albums/album-list";

export default function AlbumsPage() {
  return (
    <main className="min-h-dvh px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="border-b border-[var(--border)] py-10 sm:py-14">
          <p className="text-sm font-medium text-[var(--film)]">ALBUMS</p>
          <h1 className="mt-3 max-w-4xl text-5xl font-black leading-none text-[var(--text)] sm:text-7xl">
            相册
          </h1>
        </section>
        <AlbumList />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create /albums/[albumId] page**

```tsx
import { AlbumDetail } from "@/components/albums/album-detail";

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  return (
    <main className="min-h-dvh px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <AlbumDetail albumId={albumId} />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/albums/
git commit -m "feat: add /albums and /albums/[id] page routes"
```

---

### Task 15: Update Home Page & Navigation

**Files:**
- Modify: `components/home/home-actions.tsx`
- Modify: `components/layout/app-shell.tsx`

- [ ] **Step 1: Update HomeActions**

Change:
- "进入空间" → "进入相册"
- `href="/spaces"` → `href="/albums"`
- Unauthenticated "空间" link → "相册" with `href="/albums"`

- [ ] **Step 2: Update AppShell navigation**

Change:
- `{ href: "/spaces", label: "空间" }` → `{ href: "/albums", label: "相册" }`

- [ ] **Step 3: Commit**

```bash
git add components/home/home-actions.tsx components/layout/app-shell.tsx
git commit -m "feat: update home and nav to use 相册/albums"
```

---

### Task 16: Update Favorites & Trash Pages

**Files:**
- Modify: `app/favorites/page.tsx`
- Modify: `app/trash/page.tsx`

- [ ] **Step 1: Update Favorites page links**

Change "空间" link to "相册", `href="/spaces"` → `href="/albums"`.

- [ ] **Step 2: Update Trash page links**

Change "空间" link to "相册", `href="/spaces"` → `href="/albums"`.

- [ ] **Step 3: Commit**

```bash
git add app/favorites/page.tsx app/trash/page.tsx
git commit -m "feat: update favorites/trash pages to link /albums"
```

---

### Task 17: Redirect Old Space Pages

**Files:**
- Modify: `app/spaces/page.tsx`
- Modify: `app/spaces/[spaceId]/page.tsx`
- Modify: `app/spaces/[spaceId]/photos/page.tsx`
- Modify: `app/spaces/[spaceId]/albums/page.tsx`
- Modify: `app/spaces/[spaceId]/albums/[albumId]/page.tsx`

- [ ] **Step 1: Add redirects to all space pages**

Each page imports `redirect` from `next/navigation` and calls `redirect("/albums")` or `redirect(\`/albums/${albumId}\`)` for the album detail case.

- [ ] **Step 2: Commit**

```bash
git add app/spaces/
git commit -m "feat: redirect old space pages to /albums"
```

---

### Task 18: Update Photo Gallery & Upload Components

**Files:**
- Modify: `components/photos/photo-gallery.tsx`
- Modify: `components/upload/photo-upload-form.tsx`

- [ ] **Step 1: Update PhotoGallery**

Change props from `spaceId` to `albumId`. Update API calls:
- Photo list: `/api/spaces/${spaceId}/photos` → `/api/albums/${albumId}/photos`
- Batch delete: `/api/spaces/${spaceId}/photos/batch-delete` → `/api/albums/${albumId}/photos/batch-delete`
- Individual photo ops remain at `/api/photos/[id]/*`

- [ ] **Step 2: Update PhotoUploadForm**

Change props from `spaceId` to `albumId`. Update upload endpoint:
- `/api/spaces/${spaceId}/photos/upload` → `/api/albums/${albumId}/photos/upload`

- [ ] **Step 3: Commit**

```bash
git add components/photos/photo-gallery.tsx components/upload/photo-upload-form.tsx
git commit -m "feat: update photo gallery and upload for album-based routing"
```

---

### Task 19: Update Share Page

**Files:**
- Modify: `app/share/[token]/page.tsx`

- [ ] **Step 1: Update space name reference**

In the share page, `share.spaceName` won't exist anymore. Replace with album name or remove. The `getPublicPhotoShare` function returns `spaceName` — update it to include album info instead.

- [ ] **Step 2: Commit**

```bash
git add app/share/[token]/page.tsx lib/photos/shares.ts
git commit -m "fix: update share page for album-first model"
```

---

### Task 20: Update Tests

**Files:**
- Modify: `tests/auth-navigation.test.ts`
- Modify: `tests/spaces.test.ts` (rename to album membership tests)
- Modify: `tests/albums.test.ts`
- Modify: `tests/photo-library.test.ts`
- Modify: `tests/photo-upload.test.ts`
- Modify: `tests/space-presentations.test.ts` (rewrite for album cards)

- [ ] **Step 1: Update auth-navigation test**

Change assertions:
- `'href="/spaces"'` → `'href="/albums"'`
- `"进入空间"` → `"进入相册"`
- `getAuthenticatedRedirectPath(true)` → `"/albums"`

- [ ] **Step 2: Rewrite spaces test as album membership test**

Rename to `tests/album-membership.test.ts`. Test:
- `getUserAlbums` returns albums the user is a member of
- Album creation creates membership + owner role
- Default album is created with is_default/is_immutable

- [ ] **Step 3: Rewrite album library test**

Update to test new album-first functions:
- `createAlbum`, `getUserAlbums`, `getAlbumDetail`
- `addPhotosToAlbum`, `removePhotoFromAlbum`, `getAlbumPhotos`
- `createAlbumInvite`, `acceptAlbumInvite`
- `setAlbumCover`

- [ ] **Step 4: Update photo library test**

Update to use album-based context:
- Replace `spaceId` with `albumId`
- Test that soft-deleted photos appear in global trash
- Test that restore recreates album references

- [ ] **Step 5: Update photo upload test**

Change `uploadPhotoToSpace` → `uploadPhotoToAlbum`, use album membership setup.

- [ ] **Step 6: Rewrite space presentation test**

Rename to album card test. Test AlbumCard rendering with cover/name/metadata.

- [ ] **Step 7: Commit**

```bash
git add tests/
git commit -m "test: update tests for album-first model"
```

---

### Task 21: Update User Registration to Create Default Album

**Files:**
- Modify: `app/api/auth/register/route.ts`
- Modify: `lib/users/auth.ts` (if exists)

- [ ] **Step 1: Add default album creation on registration**

After user creation in register route, call `createDefaultAlbum(prisma, user.id)`.

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/register/route.ts
git commit -m "feat: create default '全部照片' album on user registration"
```

---

### Task 22: Final Integration & Build Verification

- [ ] **Step 1: Run TypeScript check**

```bash
cd /Users/zyq/project/photo && npx tsc --noEmit
```

Expected: No type errors. Fix any that appear.

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: final integration fixes for album-first refactor"
```

---

### Task 23: Remove Deprecated Space Code (post-verification)

**Files to delete:**
- `components/spaces/space-chrome.tsx`
- `components/spaces/space-detail-header.tsx`
- `components/spaces/space-list.tsx`
- `lib/spaces/library.ts`
- `app/api/albums/[id]/photos/[photoId]/route.ts` (old remove-from-album)

- [ ] **Step 1: Remove deprecated files**

```bash
rm components/spaces/space-chrome.tsx
rm components/spaces/space-detail-header.tsx
rm components/spaces/space-list.tsx
rm lib/spaces/library.ts
rm -rf app/api/albums/\[id\]/photos/\[photoId\]
```

- [ ] **Step 2: Verify build still passes**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated space components and library"
```
