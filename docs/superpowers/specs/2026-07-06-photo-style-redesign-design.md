# Photo Management Editorial Noir Redesign

## Goal

Redesign the photo management app around a full-site black visual system with an editorial photography feel.

The selected direction is **Editorial Noir**:

- Black is the dominant product color across every page.
- The interface should feel like an image magazine, not a conventional admin panel.
- Descriptive text should be reduced aggressively.
- Existing upload, browse, favorite, album, share, restore, and delete flows must keep working.

## Visual Direction

### Overall Feel

The product should read as a high-contrast photo publication:

- Large titles.
- Dark surfaces.
- Strong image-first grids.
- Minimal explanatory copy.
- Clear controls that do not compete with photos.

Management pages still need to be usable, but they should not fall back to a dense dashboard style.

## Visual System

### Color

Use a black-first palette:

- Background: near black, around `#030303`.
- Main surfaces: `#0a0a0a` to `#121212`.
- Elevated surfaces: `#171717` to `#1f1f1f`.
- Primary text: warm white, around `#f4f0e8`.
- Secondary text: muted silver, around `#a8a29e`.
- Borders: low-contrast graphite, around `rgba(255,255,255,0.1)`.
- Primary action: warm white background with black text.
- Accent: restrained film gold, used only for selected states or small metadata.
- Danger: desaturated red for destructive actions.

Do not use the current light glass style or blue primary accent.

### Typography

Keep the current font stack unless the implementation can use an existing local font safely. Emphasize hierarchy through scale and weight:

- Home hero: very large title.
- Page titles: short, bold, editorial.
- Component headings: compact and direct.
- Body copy: minimal and only where needed.
- Letter spacing: default `0`; avoid tight tracking on body text.

### Shape And Surface

Use sharper editorial geometry:

- Page-level sections should be unframed or full-width dark bands.
- Cards should use moderate radius, normally `8px` to `18px`.
- Avoid nested cards.
- Use thin borders and subtle contrast instead of heavy shadows.
- Avoid decorative gradient blobs or light glass panels.

### Motion

Motion should be limited to state changes:

- Card hover lift or image scale.
- Selection state transition.
- Upload queue status.
- Menu open and close.

Respect `prefers-reduced-motion`.

## Page Design

### Home

Make the home page feel like a magazine cover.

Keep:

- Brand-level title.
- Login CTA.
- Spaces CTA.
- A small status strip.

Remove:

- Long product explanations.
- Implementation notes.
- Dense feature lists.

### Authentication

Login and register pages should be black editorial forms:

- Narrow centered form.
- High-contrast fields.
- Visible labels.
- Short title only.
- No implementation description text.

### App Shell

The shell should become a black magazine masthead:

- Compact wordmark.
- Top navigation as a directory.
- Active state with high contrast.
- User menu visually quiet.

### Spaces

Spaces should feel like publication issues or photo collections:

- Large dark cards.
- Strong title.
- Compact metadata: type, role, photo count, storage.
- No paragraph-style explanations unless unauthenticated or empty.

### Space Detail And Section Pages

Space detail, photo, album, favorites, and trash pages should share one structure:

- Short page header.
- Compact action row.
- Content grid.
- Minimal status copy.

Remove the current explanatory side panels where possible.

### Photo Views

Photos are the core visual surface:

- Larger image tiles.
- Dark captions.
- Controls as quiet overlays or compact action rows.
- Selection states must be visible without relying on color alone.
- Batch actions remain accessible and obvious.

### Albums

Album list and detail views should match the photo grid language:

- Album cards as dark collection covers.
- Detail page with compact add-photo control.
- Minimal empty state text.

### Trash

Trash needs clarity despite the visual style:

- Strong destructive action styling.
- Clear selected count.
- Restore and delete actions remain visible.
- Empty state can be a single short line.

### Share Page

The public share page should be the most cinematic page:

- Black background.
- Large image first.
- File title and download actions below.
- No explanatory marketing text.

## Copy Rules

Remove descriptive text unless it is needed for:

- Navigation.
- Form labels.
- Error messages.
- Empty states.
- Loading states.
- Destructive action clarity.

Prefer short labels:

- `空间`
- `照片`
- `相册`
- `收藏`
- `回收站`
- `暂无照片`
- `上传`
- `恢复`
- `永久删除`

## Accessibility

The redesign must preserve:

- Visible focus states.
- Touch targets at least 44px high for primary controls.
- Sufficient text contrast on all dark surfaces.
- Visible labels on forms.
- Text labels for destructive and batch actions.
- Keyboard access for links, buttons, inputs, and menus.

## Implementation Scope

### Must Change

- `app/globals.css`
- `app/page.tsx`
- `app/login/page.tsx`
- `app/register/page.tsx`
- `app/share/[token]/page.tsx`
- `app/spaces/page.tsx`
- `app/spaces/[spaceId]/page.tsx`
- `app/spaces/[spaceId]/photos/page.tsx`
- `app/spaces/[spaceId]/albums/page.tsx`
- `app/spaces/[spaceId]/albums/[albumId]/page.tsx`
- `app/favorites/page.tsx`
- `app/trash/page.tsx`
- `components/layout/app-shell.tsx`
- `components/layout/user-menu.tsx`
- `components/auth/login-form.tsx`
- `components/auth/register-form.tsx`
- `components/spaces/space-chrome.tsx`
- `components/spaces/space-list.tsx`
- `components/spaces/space-detail-header.tsx`
- `components/photos/photo-gallery.tsx`
- `components/photos/favorites-gallery.tsx`
- `components/photos/trash-gallery.tsx`
- `components/upload/photo-upload-form.tsx`
- `components/albums/album-list.tsx`
- `components/albums/album-detail.tsx`

### Must Not Change

- Database schema.
- API behavior.
- Authentication behavior.
- File storage behavior.
- Prisma models.
- Upload processing logic.

## Verification

Run:

- `npm run build`
- `npm test`

Also verify in browser:

- Home page.
- Login.
- Spaces.
- Space photos.
- Albums.
- Favorites.
- Trash.
- Share page.

Check desktop and mobile widths for:

- No horizontal scroll.
- No text overflow.
- Clear focus states.
- Readable dark contrast.
- Functional upload, selection, delete, restore, and share controls.
