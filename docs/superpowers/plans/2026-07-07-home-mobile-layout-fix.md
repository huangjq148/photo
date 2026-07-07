# Home Mobile Layout Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home page render cleanly on mobile by switching it from a fixed-height desktop hero into a responsive stacked layout.

**Architecture:** Keep the change narrowly scoped to the home route and the app shell wrapper. The shell should stop clipping the home page vertically, and the home page itself should switch to a single-column flow on small screens while preserving the existing two-column desktop composition.

**Tech Stack:** Next.js App Router, React, Tailwind CSS

---

### Task 1: Unblock vertical scrolling on the home route

**Files:**
- Modify: `components/layout/app-shell.tsx`

- [ ] **Step 1: Update the home wrapper classes**

Remove the fixed viewport height / hidden overflow behavior from the home branch so the page can grow naturally on small screens.

- [ ] **Step 2: Verify the shell still preserves non-home behavior**

Run: `npm run lint`
Expected: pass with no new errors from `app-shell.tsx`.

### Task 2: Reflow the home page for mobile

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/home/home-actions.tsx` if needed for spacing only

- [ ] **Step 1: Change the home grid to stack on small screens**

Keep the hero text, actions, stats, and preview in one column on mobile; retain the split layout on large screens.

- [ ] **Step 2: Reduce mobile spacing and typography pressure**

Tighten title sizing, card widths, and preview sizing so the content fits without horizontal overflow.

- [ ] **Step 3: Verify the home page still reads correctly on desktop**

Run: `npm run lint`
Expected: pass with no class name or import errors.

### Task 3: Visual verification

**Files:**
- None

- [ ] **Step 1: Open the home page in the browser and inspect a mobile viewport**

Confirm the content stacks vertically, no sections are clipped, and no horizontal scrolling appears.

- [ ] **Step 2: Compare against a desktop viewport**

Confirm the existing visual direction is preserved on larger screens.

