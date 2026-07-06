# Photo Editorial Noir Redesign Implementation Plan

**Goal:** Convert the app from a light gallery/admin hybrid into a full-site black Editorial Noir photo experience with minimal descriptive copy and preserved product behavior.

**Architecture:** Keep business logic unchanged. Concentrate the redesign in global tokens, shared shell components, page hero/header structures, and existing view components.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, TypeScript, existing local components and APIs.

## Task 1: Establish the black visual system

**Files:**

- Modify: `app/globals.css`
- Modify: `components/layout/app-shell.tsx`
- Modify: `components/layout/user-menu.tsx`

**Steps:**

- [ ] Replace light tokens with black-first semantic tokens.
- [ ] Remove warm-white/light glass page background.
- [ ] Add dark focus, selection, button, input, and reduced-motion defaults.
- [ ] Redesign the app shell as a black magazine masthead.
- [ ] Keep navigation readable and touch-friendly.

**Verify:**

- `npm run build`

## Task 2: Redesign public entry pages

**Files:**

- Modify: `app/page.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/register/page.tsx`
- Modify: `app/share/[token]/page.tsx`
- Modify: `components/auth/login-form.tsx`
- Modify: `components/auth/register-form.tsx`

**Steps:**

- [ ] Convert home into an Editorial Noir cover.
- [ ] Remove long homepage and auth descriptions.
- [ ] Restyle login/register forms for high-contrast black surfaces.
- [ ] Make share page image-first and cinematic.
- [ ] Preserve form labels, errors, links, and submit behavior.

**Verify:**

- `npm run build`

## Task 3: Redesign space and section frames

**Files:**

- Modify: `components/spaces/space-chrome.tsx`
- Modify: `components/spaces/space-list.tsx`
- Modify: `components/spaces/space-detail-header.tsx`
- Modify: `app/spaces/page.tsx`
- Modify: `app/spaces/[spaceId]/page.tsx`
- Modify: `app/spaces/[spaceId]/photos/page.tsx`
- Modify: `app/spaces/[spaceId]/albums/page.tsx`
- Modify: `app/spaces/[spaceId]/albums/[albumId]/page.tsx`
- Modify: `app/favorites/page.tsx`
- Modify: `app/trash/page.tsx`

**Steps:**

- [ ] Make page headers short, dark, and editorial.
- [ ] Remove or compress explanatory side-panel copy.
- [ ] Style spaces as large collection cards.
- [ ] Keep metadata compact and scannable.
- [ ] Keep navigation actions visible.

**Verify:**

- `npm run build`

## Task 4: Redesign gallery, upload, album, and trash components

**Files:**

- Modify: `components/photos/photo-gallery.tsx`
- Modify: `components/photos/favorites-gallery.tsx`
- Modify: `components/photos/trash-gallery.tsx`
- Modify: `components/upload/photo-upload-form.tsx`
- Modify: `components/albums/album-list.tsx`
- Modify: `components/albums/album-detail.tsx`

**Steps:**

- [ ] Make photo grids larger and darker.
- [ ] Restyle selection, favorite, share, restore, and delete controls.
- [ ] Restyle upload queue while preserving retry/cancel/remove behavior.
- [ ] Convert album cards and detail tiles into dark collection views.
- [ ] Keep empty, loading, success, and error states concise.

**Verify:**

- `npm run build`

## Task 5: Final verification and browser QA

**Files:**

- Inspect all modified files.

**Steps:**

- [ ] Run full test suite.
- [ ] Run production build.
- [ ] Start dev server.
- [ ] Check home, login, spaces, photos, albums, favorites, trash, and share pages.
- [ ] Check mobile and desktop widths for overflow or text collisions.

**Verify:**

- `npm test`
- `npm run build`
- Browser inspection on local dev server.
