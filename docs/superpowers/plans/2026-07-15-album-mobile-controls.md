# Album Mobile Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compress the album detail page on mobile by consolidating album actions, collapsing search, and moving photo selection into an explicit mode without changing desktop behavior.

**Architecture:** Keep responsive presentation inside the existing `AlbumDetailHeader`, `GalleryToolbar`, and `PhotoGalleryCard` components. `PhotoGallery` becomes the owner of an explicit selection-mode boolean, separate from selected IDs, while existing `Menu`, query state, batch actions, and photo controls are reused.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Lucide React, Vitest, Playwright

---

## Baseline and runtime

- Worktree: `/Users/zyq/project/photo/.worktrees/album-mobile-controls`
- Branch: `codex/album-mobile-controls`
- Use the bundled Node 22 runtime:

```bash
export PATH=/Users/zyq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/zyq/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override:/Users/zyq/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH
```

- Baseline `pnpm run test:unit`: 196 passed, 9 failed. The user authorized continuing with scoped tests. Do not broaden this task to fix unrelated baseline failures.
- `pnpm-lock.yaml` was mechanically rewritten by the available pnpm version during worktree setup. Do not stage or commit that file.

## File map

| File | Responsibility |
|---|---|
| `components/albums/album-detail-header.tsx` | Responsive album-level actions and mobile overflow menu |
| `components/photos/gallery-toolbar.tsx` | Responsive search, filter/sort controls, and selection-mode entry |
| `components/photos/photo-gallery.tsx` | Explicit selection-mode state and transitions |
| `components/photos/photo-gallery-card.tsx` | Card click behavior and responsive corner controls |
| `tests/album-detail-header.test.ts` | Album header responsive markup and menu coverage |
| `tests/gallery-toolbar.test.ts` | Toolbar responsive rendering contract |
| `tests/gallery-toolbar-behavior.test.tsx` | Search expansion, focus, Escape, and selection toggle behavior |
| `tests/photo-gallery-card.test.ts` | Default versus selection-mode card controls |
| `tests/photo-gallery-selection.test.ts` | Selection transition helpers and partial failure behavior |
| `tests/e2e/photo-ux-p0.spec.ts` | Authenticated 375px acceptance flow and desktop regression |

### Task 1: Compact mobile album header

**Files:**
- Modify: `tests/album-detail-header.test.ts`
- Modify: `components/albums/album-detail-header.tsx`

- [ ] **Step 1: Write the failing responsive-header test**

Extend the first `AlbumDetailHeader` test with assertions for separate mobile and desktop action groups and accessible menu labels:

```ts
expect(html).toContain("sm:hidden");
expect(html).toContain("hidden sm:flex");
expect(html).toContain('aria-label="从全部照片添加"');
expect(html).toContain('aria-label="更多相册操作"');
expect(html).toContain("管理相册");
expect(html).toContain("公开分享");
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm vitest run --project unit tests/album-detail-header.test.ts
```

Expected: FAIL because no responsive groups or mobile menu exist.

- [ ] **Step 3: Implement the responsive action groups**

In `AlbumDetailHeader`, import `Menu` and render:

```tsx
<div className="flex items-center gap-2 sm:hidden">
  <button type="button" onClick={onUploadNew} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-bold text-black">
    <Upload aria-hidden="true" size={17} />
    上传照片
  </button>
  <button type="button" onClick={onAddFromAllPhotos} aria-label="从全部照片添加" title="从全部照片添加" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border-strong)] text-[var(--text)]">
    <FolderPlus aria-hidden="true" size={18} />
  </button>
  <Menu
    label="更多相册操作"
    title="更多相册操作"
    triggerContent={<Ellipsis aria-hidden="true" size={18} />}
    items={[
      { key: "manage", label: "管理相册", icon: <Settings size={16} />, onSelect: onManage },
      { key: "share", label: "公开分享", icon: <Share2 size={16} />, onSelect: onShare },
    ]}
  />
</div>
<div className="hidden gap-2 sm:flex lg:shrink-0">
  {/* Preserve the existing four desktop buttons and callbacks. */}
</div>
```

Use Lucide `Ellipsis`, preserve 44px touch targets, and retain current hover/focus styling.

- [ ] **Step 4: Run the focused test**

Run: `pnpm vitest run --project unit tests/album-detail-header.test.ts`

Expected: 2 tests PASS.

- [ ] **Step 5: Commit the header change**

```bash
git add components/albums/album-detail-header.tsx tests/album-detail-header.test.ts
git commit -m "feat: 压缩相册详情移动端操作区"
```

### Task 2: Collapsible mobile search and compact toolbar

**Files:**
- Modify: `tests/gallery-toolbar.test.ts`
- Create: `tests/gallery-toolbar-behavior.test.tsx`
- Modify: `components/photos/gallery-toolbar.tsx`

- [ ] **Step 1: Write failing rendering tests**

Add required props to existing renders:

```ts
selectionMode: false,
onToggleSelectionMode: () => undefined,
```

Add assertions to the primary render test:

```ts
expect(html).toContain('aria-label="搜索照片和视频"');
expect(html).toContain("sm:hidden");
expect(html).toContain("hidden sm:block");
expect(html).toContain("min-h-11");
expect(html).toContain("选择");
expect(html).toContain('id="gallery-sort-options"');
```

Add a render case with `selectionMode: true` and assert the toolbar contains “取消”.

- [ ] **Step 2: Write the failing interactive behavior test**

Create `tests/gallery-toolbar-behavior.test.tsx` with `// @vitest-environment jsdom`. Mount `GalleryToolbar` using React `createRoot` and `act`, then assert:

```tsx
const searchTrigger = container.querySelector<HTMLButtonElement>('[aria-label="搜索照片和视频"]')!;
searchTrigger.click();
await act(async () => undefined);
const input = container.querySelector<HTMLInputElement>('input[placeholder="搜索名称或原始文件名"]')!;
expect(document.activeElement).toBe(input);

input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
expect(container.querySelector('input[placeholder="搜索名称或原始文件名"]')).not.toBeNull();
```

Use separate cases for the two collapse paths:

```ts
// Empty blur collapses.
input.value = "";
input.dispatchEvent(new Event("input", { bubbles: true }));
input.blur();
await act(async () => undefined);
expect(container.querySelector('[data-testid="gallery-mobile-search"]')).toBeNull();

// Empty Escape collapses without requiring blur.
input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
await act(async () => undefined);
expect(container.querySelector('[data-testid="gallery-mobile-search"]')).toBeNull();
```

Verify the “选择” button calls `onToggleSelectionMode` once.

- [ ] **Step 3: Run both toolbar test files and verify failure**

Run:

```bash
pnpm vitest run --project unit tests/gallery-toolbar.test.ts tests/gallery-toolbar-behavior.test.tsx
```

Expected: FAIL because responsive search and selection props are absent.

- [ ] **Step 4: Implement mobile search state and focus**

Add props:

```ts
selectionMode: boolean;
onToggleSelectionMode: () => void;
```

Inside `GalleryToolbar` add:

```ts
const [mobileSearchOpen, setMobileSearchOpen] = useState(Boolean(query || searchValue));
const mobileSearchRef = useRef<HTMLInputElement>(null);
const sortSectionRef = useRef<HTMLFieldSetElement>(null);

useEffect(() => {
  if (query || searchValue) setMobileSearchOpen(true);
}, [query, searchValue]);

useEffect(() => {
  if (mobileSearchOpen) window.requestAnimationFrame(() => mobileSearchRef.current?.focus());
}, [mobileSearchOpen]);
```

Render a `sm:hidden` mobile wrapper with `data-testid="gallery-mobile-toolbar"`, containing the icon search, filter, sort, and select/cancel controls. Every mobile toolbar control must use `min-h-11`; icon-only controls must also use `min-w-11` so their interactive box is at least 44 × 44px. Render the mobile input directly below the row in a `data-testid="gallery-mobile-search"` wrapper only when `mobileSearchOpen`; its blur and Escape behavior is:

```ts
onBlur={(event) => {
  if (!event.currentTarget.value) setMobileSearchOpen(false);
}}
if (event.key === "Escape") {
  if (event.currentTarget.value) {
    event.currentTarget.blur();
  } else {
    setMobileSearchOpen(false);
  }
}
```

Keep the existing full search and filter/sort/group/clear row inside `hidden sm:block`. Hide the photo-size block on mobile with `hidden sm:block`.

- [ ] **Step 5: Make sort focus deterministic**

Pass `sortSectionRef` to `FilterPanel`, set the sort fieldset to:

```tsx
<fieldset id="gallery-sort-options" ref={sortSectionRef} tabIndex={-1}>
```

The mobile sort handler calls `onChangeSort()` and then focuses the fieldset in `requestAnimationFrame`.

- [ ] **Step 6: Run focused toolbar tests**

Run:

```bash
pnpm vitest run --project unit tests/gallery-toolbar.test.ts tests/gallery-toolbar-behavior.test.tsx
```

Expected: all toolbar tests PASS.

- [ ] **Step 7: Commit the toolbar change**

```bash
git add components/photos/gallery-toolbar.tsx tests/gallery-toolbar.test.ts tests/gallery-toolbar-behavior.test.tsx
git commit -m "feat: 折叠相册移动端搜索工具栏"
```

### Task 3: Explicit selection mode and clean photo cards

**Files:**
- Modify: `tests/photo-gallery-selection.test.ts`
- Modify: `tests/photo-gallery-card.test.ts`
- Modify: `components/photos/photo-gallery.tsx`
- Modify: `components/photos/photo-gallery-card.tsx`

- [ ] **Step 1: Write failing selection transition tests**

Expand `tests/photo-gallery-selection.test.ts` to cover these pure helpers exported from `photo-gallery.tsx`:

```ts
expect(retainOnlyFailedSelection(["a", "b"], {
  succeededIds: ["a"],
  failed: [{ id: "b", code: "FORBIDDEN", message: "无权限" }],
})).toEqual(["b"]);

expect(shouldExitSelectionMode({ selectedCount: 0, failedCount: 0 })).toBe(true);
expect(shouldExitSelectionMode({ selectedCount: 2, failedCount: 1 })).toBe(false);

expect(resolveSelectionModeAfterQueryChange({
  selectionMode: true,
  selectedCount: 0,
  confirmed: false,
})).toEqual({ proceed: true, exitSelectionMode: true });
expect(resolveSelectionModeAfterQueryChange({
  selectionMode: true,
  selectedCount: 2,
  confirmed: false,
})).toEqual({ proceed: false, exitSelectionMode: false });
expect(resolveSelectionModeAfterQueryChange({
  selectionMode: true,
  selectedCount: 2,
  confirmed: true,
})).toEqual({ proceed: true, exitSelectionMode: true });
```

- [ ] **Step 2: Write failing photo-card visibility tests**

Update the default card test to assert the selection-control wrapper contains `hidden sm:block`, while the more menu remains present. Update the selection-mode test to assert:

```ts
expect(html).toContain("点击选择");
expect(html).not.toContain('aria-label="更多操作"');
expect(html).toContain('aria-pressed="false"');
```

Add an assertion that the more trigger keeps `h-11 w-11` but its visual child contains `h-7 w-7`.

- [ ] **Step 3: Run only the related test names and verify failure**

The existing file has one unrelated baseline failure, so run scoped names:

```bash
pnpm vitest run --project unit tests/photo-gallery-selection.test.ts
pnpm vitest run --project unit tests/photo-gallery-card.test.ts -t "keeps photo actions visible|renders a selection-first body|renders the selection control|switches the media preview"
```

Expected: new expectations FAIL before implementation.

- [ ] **Step 4: Implement pure selection-result helpers**

Export:

```ts
export function retainOnlyFailedSelection(
  selectedIds: string[],
  result: { failed?: Array<{ id: string }> },
) {
  const failed = new Set((result.failed ?? []).map((item) => item.id));
  return selectedIds.filter((id) => failed.has(id));
}

export function shouldExitSelectionMode({
  selectedCount,
  failedCount,
}: { selectedCount: number; failedCount: number }) {
  return failedCount === 0 || selectedCount === 0;
}

export function resolveSelectionModeAfterQueryChange({
  selectionMode,
  selectedCount,
  confirmed,
}: { selectionMode: boolean; selectedCount: number; confirmed: boolean }) {
  if (!selectionMode) return { proceed: true, exitSelectionMode: false };
  if (selectedCount > 0 && !confirmed) return { proceed: false, exitSelectionMode: false };
  return { proceed: true, exitSelectionMode: true };
}
```

Use the helper in partial batch-result handling rather than duplicating failed-ID logic.

- [ ] **Step 5: Separate selection mode from selected count**

In `PhotoGallery` add `const [selectionMode, setSelectionMode] = useState(false)` and delete the derived `selectedCount > 0` assignment. Add one exit function:

```ts
function exitSelectionMode() {
  selection.clear();
  setSelectionMode(false);
}
```

Pass `selectionMode` and a toggle callback to `GalleryToolbar`. The callback enters mode when false and calls `exitSelectionMode` when true. Render `BatchActionBar` only when `selectedCount > 0`; its clear callback calls `exitSelectionMode`.

For query changes, show the existing discard confirmation only when `selectedCount > 0`; after confirmation, clear selection and exit mode. Replace the current selection-sensitive helper with a value-aware wrapper and use it for every toolbar query callback, including controls inside the open `FilterPanel`:

```ts
function applySelectionSensitiveQueryChange(action: () => void) {
  if (selectedCount > 0 && !confirmDiscardSelection()) return;
  if (selectionMode) exitSelectionMode();
  action();
}

onMediaTypeChange={(value) => applySelectionSensitiveQueryChange(() => galleryQuery.setMediaType(value))}
onFavoritedOnlyChange={(value) => applySelectionSensitiveQueryChange(() => galleryQuery.setFavoritedOnly(value))}
onUploaderIdChange={(value) => applySelectionSensitiveQueryChange(() => galleryQuery.setUploaderId(value))}
onTakenFromChange={(value) => applySelectionSensitiveQueryChange(() => galleryQuery.setTakenRange(value, urlState.takenTo))}
onTakenToChange={(value) => applySelectionSensitiveQueryChange(() => galleryQuery.setTakenRange(urlState.takenFrom, value))}
onSortByChange={(value) => applySelectionSensitiveQueryChange(() => galleryQuery.setSortBy(value))}
onSortOrderChange={(value) => applySelectionSensitiveQueryChange(() => galleryQuery.setSortOrder(value))}
onGroupByChange={(value) => applySelectionSensitiveQueryChange(() => galleryQuery.setGroupBy(value))}
```

Export a pure `resolveSelectionModeAfterQueryChange({ selectionMode, selectedCount, confirmed })` helper and test that: zero selected items exit without confirmation; selected items remain when confirmation is declined; confirmed changes exit and clear. After a fully successful batch action, exit mode; after partial failure, retain failed IDs and remain in mode.

- [ ] **Step 6: Update photo-card corner controls**

In `PhotoGalleryCard`:

- Default mode: selection-control wrapper uses `hidden sm:block` plus the existing desktop hover/focus rules and `data-photo-select-control`.
- Selection mode: selection-control wrapper is visible on all widths.
- Selection mode: do not render the per-photo `Menu`.
- Default mode: keep a 44 × 44 button and render a 28 × 28 visual chip inside it:

```tsx
triggerClassName="h-11 w-11 border-0 bg-transparent p-0"
triggerContent={
  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full noir-glass-chip">
    <Ellipsis aria-hidden="true" size={15} />
  </span>
}
```

- [ ] **Step 7: Run focused selection and card tests**

Run:

```bash
pnpm vitest run --project unit tests/photo-gallery-selection.test.ts
pnpm vitest run --project unit tests/photo-gallery-card.test.ts -t "keeps photo actions visible|renders a selection-first body|renders the selection control|switches the media preview"
```

Expected: all selected tests PASS.

- [ ] **Step 8: Run all feature unit tests together**

Run:

```bash
pnpm vitest run --project unit tests/album-detail-header.test.ts tests/gallery-toolbar.test.ts tests/gallery-toolbar-behavior.test.tsx tests/photo-gallery-selection.test.ts
```

Expected: all feature test files PASS.

- [ ] **Step 9: Commit selection-mode changes**

```bash
git add components/photos/photo-gallery.tsx components/photos/photo-gallery-card.tsx tests/photo-gallery-selection.test.ts tests/photo-gallery-card.test.ts
git commit -m "feat: 添加相册照片统一选择模式"
```

### Task 4: 375px Playwright acceptance and desktop regression

**Files:**
- Modify: `tests/e2e/photo-ux-p0.spec.ts`

- [ ] **Step 1: Extend the authenticated P0 flow with mobile assertions**

After adding `photo-51` and before deleting it, switch to `{ width: 375, height: 812 }`. Scope all toolbar locators to the mobile wrapper so mounted-but-hidden desktop controls do not create strict-mode conflicts:

```ts
await expect(page.getByRole("button", { name: "上传照片" })).toBeVisible();
await expect(page.getByRole("button", { name: "从全部照片添加" })).toBeVisible();
await page.getByRole("button", { name: "更多相册操作" }).click();
await expect(page.getByRole("menuitem", { name: "管理相册" })).toBeVisible();
await page.keyboard.press("Escape");

const mobileToolbar = page.getByTestId("gallery-mobile-toolbar");
await mobileToolbar.getByRole("button", { name: "排序" }).click();
await expect(page.locator("#gallery-sort-options")).toBeFocused();
await expect(mobileToolbar.getByPlaceholder("搜索名称或原始文件名")).toHaveCount(0);
await mobileToolbar.getByRole("button", { name: "搜索照片和视频" }).click();
const mobileSearch = mobileToolbar.getByPlaceholder("搜索名称或原始文件名");
await expect(mobileSearch).toBeFocused();
await mobileSearch.fill("photo-51");
await mobileSearch.fill("");
await page.getByText("PHOTOS", { exact: true }).click();
await expect(mobileToolbar.getByPlaceholder("搜索名称或原始文件名")).toHaveCount(0);

const photoCard = page.locator("article").filter({ hasText: "photo-51" }).first();
await expect(photoCard.locator("[data-photo-select-control]")).toBeHidden();
await mobileToolbar.getByRole("button", { name: "选择" }).click();
await expect(photoCard.locator("[data-photo-select-control]")).toBeVisible();
await expect(photoCard.getByRole("button", { name: "更多操作" })).toHaveCount(0);
await photoCard.getByRole("button", { name: /选择 photo-51/ }).first().click();
await expect(page.getByText("已选择 1 张照片")).toBeVisible();
await mobileToolbar.getByRole("button", { name: "取消" }).click();

const horizontalOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth,
);
expect(horizontalOverflow).toBe(false);
```

Switch back to 1280px before the existing desktop menu, delete, and management assertions.

- [ ] **Step 2: Run the E2E test and verify behavior**

Ensure the test database is available, then run:

```bash
pnpm run test:db:up
pnpm run test:db:migrate
pnpm playwright test tests/e2e/photo-ux-p0.spec.ts --project chromium
```

Expected: the P0 spec PASS. If the environment lacks the Chromium binary, run `pnpm playwright install chromium` and retry.

- [ ] **Step 3: Run static verification**

Run:

```bash
pnpm run lint
pnpm run typecheck
pnpm run build
```

Expected: all commands exit 0. If an existing unrelated baseline failure appears, record the exact command and failure without changing unrelated code.

- [ ] **Step 4: Inspect the 375px page visually**

Capture a Playwright screenshot after the compact toolbar renders. Verify:

- no horizontal scroll;
- the header actions fit one line;
- the search is collapsed by default;
- default cards show only the compact more control;
- selection mode replaces more controls with check controls.

- [ ] **Step 5: Commit acceptance coverage**

```bash
git add tests/e2e/photo-ux-p0.spec.ts
git commit -m "test: 验收相册页移动端紧凑操作"
```

### Task 5: Final scoped verification and delivery notes

**Files:**
- Modify only if needed: `docs/superpowers/plans/2026-07-15-album-mobile-controls.md`

- [ ] **Step 1: Run the complete scoped verification set**

```bash
pnpm vitest run --project unit tests/album-detail-header.test.ts tests/gallery-toolbar.test.ts tests/gallery-toolbar-behavior.test.tsx tests/photo-gallery-selection.test.ts
pnpm vitest run --project unit tests/photo-gallery-card.test.ts -t "keeps photo actions visible|renders a selection-first body|renders the selection control|switches the media preview"
pnpm playwright test tests/e2e/photo-ux-p0.spec.ts --project chromium
pnpm run lint
pnpm run typecheck
pnpm run build
```

Expected: all scoped checks PASS, subject only to explicitly documented unrelated baseline failures.

- [ ] **Step 2: Review the diff for scope and accidental files**

```bash
git status --short
git diff --check
git diff main...HEAD --stat
```

Confirm `pnpm-lock.yaml`, `.next/`, `tsconfig.tsbuildinfo`, screenshots, and `.superpowers/` are not staged.

- [ ] **Step 3: Request code review**

Invoke `superpowers:requesting-code-review` with the design spec, plan, diff, and verification output. Address only blocking findings related to this scope.

- [ ] **Step 4: Finish the branch**

Invoke `superpowers:verification-before-completion`, then `superpowers:finishing-a-development-branch` to present merge/PR/cleanup choices.
