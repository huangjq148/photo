# Photo Float Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared bottom-right floating tool cluster with a top-level return-to-top button and a `...` button that opens a modal for photo list controls.

**Architecture:** Keep the floating UI global and page-agnostic, but only render it on photo-list routes that already use the shared gallery controls. Move the photo filter toggles into a reusable modal so the gallery can expose them both inline and through the floating `...` entry without duplicating behavior. Preserve the current scroll-to-top logic and make the new `...` action reuse the same show/hide threshold.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, lucide-react

---

### Task 1: Extract a reusable photo controls modal

**Files:**
- Create: `components/photos/photo-gallery-controls-modal.tsx`
- Modify: `components/photos/photo-gallery.tsx`

- [ ] **Step 1: Create the reusable modal component**

Move the `showTakenAt`, `photoSize`, and `layoutMode` controls into a client component that renders them inside the existing `Modal` shell.

- [ ] **Step 2: Keep the gallery behavior unchanged**

Pass the current state and setters into the modal from `PhotoGallery`, and keep the inline controls available only if they are still needed for desktop fallback.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: pass with no TypeScript or JSX errors.

### Task 2: Add a shared floating tools cluster

**Files:**
- Create: `components/layout/floating-photo-tools.tsx`
- Modify: `components/layout/app-shell.tsx`
- Modify: `components/layout/scroll-to-top-button.tsx`

- [ ] **Step 1: Build the floating cluster component**

Render a bottom-right stack with a `...` button above the existing return-to-top button, and drive both visibility and click behavior from one place.

- [ ] **Step 2: Wire the cluster into photo-list routes**

Mount the cluster from `AppShell` only on routes that show photo list controls, so the rest of the app does not get extra UI.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: pass with no new layout or import errors.

### Task 3: Verify the modal opens and scroll-to-top still works

**Files:**
- None

- [ ] **Step 1: Open a photo-list page and scroll downward**

Confirm the floating cluster appears after the existing threshold.

- [ ] **Step 2: Open the `...` modal and switch controls**

Confirm the modal shows the same controls and changing them still updates the gallery.

- [ ] **Step 3: Use the top button**

Confirm the page scrolls back to the top and the floating cluster hides again when near the top.

