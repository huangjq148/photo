# Photo Card Menu Trigger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a plain trigger variant to the shared `Menu` component and use it on album photo cards so the top-right ellipsis no longer renders a glass chip background.

**Architecture:** Extend `Menu` with a small trigger mode flag instead of hardcoding one visual style. Keep the default chip look for the rest of the app, and opt into the plain mode only where the album card needs a lighter treatment.

**Tech Stack:** Next.js, React, Tailwind CSS, existing shared `Menu` component

---

### Task 1: Add a plain trigger variant to `Menu`

**Files:**
- Modify: `components/ui/menu.tsx`

- [ ] **Step 1: Update the shared trigger API**

Add a `triggerVariant?: "chip" | "plain"` prop to `MenuProps`, default it to `"chip"`, and branch the trigger button classes so the plain mode removes the chip background, border, shadow, and blur while preserving size and accessibility.

- [ ] **Step 2: Keep the default look intact**

Verify the existing trigger behavior stays unchanged for all current call sites that do not opt into the new prop.

### Task 2: Use the plain trigger on album photo cards

**Files:**
- Modify: `components/photos/photo-gallery-card.tsx`

- [ ] **Step 1: Switch the card menu to plain trigger mode**

Pass `triggerVariant="plain"` to the `Menu` instance used in the photo card and simplify the icon content so it reads as a light icon over the image instead of a gray chip.

- [ ] **Step 2: Sanity check the render**

Confirm the photo card still opens the menu and the selection control stays visually distinct.

