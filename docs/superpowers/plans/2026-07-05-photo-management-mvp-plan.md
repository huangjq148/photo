# Photo Management MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first shippable MVP for the photo management app: auth, personal space, photo upload, photo browsing, trash, and storage accounting.

**Architecture:** Start with a single Next.js App Router monolith. Use PostgreSQL via Prisma for persistence, local disk for file storage, and route handlers for API endpoints. Keep domain code split by feature (`auth`, `users`, `spaces`, `photos`, `storage`) so UI, validation, and data access stay isolated and testable.

**Tech Stack:** Next.js, React, TypeScript, Prisma, PostgreSQL, bcrypt/argon2, zod, local filesystem storage.

---

### Task 1: Scaffold the application

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `components/*`
- Create: `lib/*`

- [ ] **Step 1: Scaffold the Next.js app**

Run: `npm create next-app@latest .`
Expected: Next.js app skeleton is created in the repository root.

- [ ] **Step 2: Add base app shell**

Implement:
- global layout
- app-wide styles
- reusable shell for auth and workspace pages

- [ ] **Step 3: Verify the app starts**

Run: `npm run dev`
Expected: App boots locally without build/runtime errors.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: scaffold photo management app"
```

### Task 2: Add data layer and migrations

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/migrations/*`
- Create: `lib/db.ts`
- Create: `lib/env.ts`
- Create: `lib/validation/*`

- [ ] **Step 1: Write the database schema**

Add tables for:
- users
- spaces
- space_members
- photos

- [ ] **Step 2: Generate Prisma client and migration**

Run: `npx prisma migrate dev`
Expected: PostgreSQL schema is created successfully.

- [ ] **Step 3: Add env validation**

Validate:
- `DATABASE_URL`
- `JWT_SECRET`
- storage root path

- [ ] **Step 4: Commit**

```bash
git add prisma lib
git commit -m "feat: add database schema and env validation"
```

### Task 3: Implement auth and user bootstrap

**Files:**
- Create: `app/api/auth/register/route.ts`
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/api/users/me/route.ts`
- Create: `lib/auth/*`
- Create: `lib/users/*`
- Create: `app/login/page.tsx`
- Create: `app/register/page.tsx`

- [ ] **Step 1: Write auth tests**
- [ ] **Step 2: Implement register/login/logout**
- [ ] **Step 3: Auto-create personal space on registration**
- [ ] **Step 4: Wire up login/register pages**
- [ ] **Step 5: Verify auth flow manually**
- [ ] **Step 6: Commit**

### Task 4: Implement spaces and permissions

**Files:**
- Create: `app/api/spaces/route.ts`
- Create: `app/api/spaces/[id]/route.ts`
- Create: `lib/spaces/*`
- Create: `app/spaces/page.tsx`
- Create: `app/spaces/[spaceId]/page.tsx`

- [ ] **Step 1: Implement space listing and details**
- [ ] **Step 2: Add permission checks for membership**
- [ ] **Step 3: Show current user spaces in UI**
- [ ] **Step 4: Commit**

### Task 5: Implement photo upload and storage

**Files:**
- Create: `app/api/spaces/[id]/photos/upload/route.ts`
- Create: `app/api/spaces/[id]/photos/route.ts`
- Create: `lib/storage/*`
- Create: `lib/photos/*`
- Create: `components/upload/*`
- Create: `app/spaces/[spaceId]/photos/page.tsx`

- [ ] **Step 1: Add upload validation**
- [ ] **Step 2: Save original file to local disk**
- [ ] **Step 3: Generate thumbnail and preview images**
- [ ] **Step 4: Persist photo records and update storage usage**
- [ ] **Step 5: Refresh photo list after upload**
- [ ] **Step 6: Commit**

### Task 6: Implement browsing, trash, and restore

**Files:**
- Create: `app/api/photos/[id]/route.ts`
- Create: `app/api/photos/[id]/download/route.ts`
- Create: `app/api/photos/[id]/restore/route.ts`
- Create: `app/api/trash/photos/route.ts`
- Create: `app/api/trash/photos/[id]/route.ts`
- Create: `app/trash/page.tsx`
- Create: `components/photos/*`

- [ ] **Step 1: Implement list/detail/download endpoints**
- [ ] **Step 2: Implement soft delete and trash listing**
- [ ] **Step 3: Implement restore and permanent delete**
- [ ] **Step 4: Verify capacity accounting**
- [ ] **Step 5: Commit**

### Task 7: Add verification and release hardening

**Files:**
- Create: `tests/*`
- Update: `package.json`
- Update: `README.md`

- [ ] **Step 1: Add core API and integration tests**
- [ ] **Step 2: Add lint/build checks**
- [ ] **Step 3: Run full verification**
- [ ] **Step 4: Commit**

