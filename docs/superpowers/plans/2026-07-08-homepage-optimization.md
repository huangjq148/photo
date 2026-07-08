# 首页优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构首页为分区滚动布局，展示真实统计数据、快捷操作入口和最近照片预览，保留品牌调性。

**Architecture:** Server Component 预取数据（用户信息、统计、最近照片），Client Component 处理交互（创建相册弹窗）。新增 `lib/home/queries.ts` 统一首页查询，4 个新组件各司其职。

**Tech Stack:** Next.js 15 (Server Components), React 19, TypeScript, Tailwind CSS 4, Prisma, lucide-react

---

## File Structure

| 文件 | 操作 | 职责 |
|---|---|---|
| `lib/home/queries.ts` | 新建 | 首页数据查询（照片数、最近照片） |
| `components/home/home-hero.tsx` | 新建 | Hero 品牌区（标题 + 登录/注册 + 欢迎语） |
| `components/home/home-stats.tsx` | 新建 | 统计卡片（相册数/照片数/存储空间） |
| `components/home/home-quick-actions.tsx` | 新建 | 快捷操作卡片 + 创建相册弹窗（Client Component） |
| `components/home/home-recent-photos.tsx` | 新建 | 最近照片缩略图网格（空状态/骨架屏） |
| `app/page.tsx` | 重写 | 组合所有组件，预取数据 |
| `components/home/home-actions.tsx` | 删除 | 功能合并到 home-hero |

---

### Task 1: 创建首页数据查询层

**Files:**
- Create: `lib/home/queries.ts`

- [ ] **Step 1: 创建 `lib/home/queries.ts`**

```typescript
import type { PrismaClient } from "@prisma/client";

type RecentPhoto = {
  id: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalName: string;
  albumId: string;
  albumName: string;
  uploadedAt: Date;
};

export async function getUserAlbumIds(
  prisma: PrismaClient,
  userId: string
): Promise<string[]> {
  const memberships = await prisma.albumMember.findMany({
    where: { user_id: userId },
    select: { album_id: true },
  });
  return memberships.map((m) => m.album_id);
}

export async function getUserPhotoCount(
  prisma: PrismaClient,
  userId: string
): Promise<number> {
  const albumIds = await getUserAlbumIds(prisma, userId);
  if (albumIds.length === 0) return 0;

  return prisma.media.count({
    where: {
      album_id: { in: albumIds },
      status: "normal",
    },
  });
}

export async function getRecentPhotos(
  prisma: PrismaClient,
  userId: string,
  limit = 12
): Promise<RecentPhoto[]> {
  const albumIds = await getUserAlbumIds(prisma, userId);
  if (albumIds.length === 0) return [];

  const media = await prisma.media.findMany({
    where: {
      album_id: { in: albumIds },
      status: "normal",
    },
    orderBy: { uploaded_at: "desc" },
    take: limit,
    include: {
      album: {
        select: { name: true },
      },
    },
  });

  return media.map((m) => ({
    id: m.id,
    thumbnailUrl: m.thumbnail_url,
    previewUrl: m.preview_url,
    originalName: m.original_name,
    albumId: m.album_id,
    albumName: m.album.name,
    uploadedAt: m.uploaded_at,
  }));
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无新增错误

---

### Task 2: 创建 Hero 品牌区组件

**Files:**
- Create: `components/home/home-hero.tsx`

- [ ] **Step 1: 创建 `components/home/home-hero.tsx`**

```typescript
import Link from "next/link";

type HomeHeroProps = {
  user: {
    nickname: string;
  } | null;
};

export function HomeHero({ user }: HomeHeroProps) {
  return (
    <section className="mx-auto max-w-4xl text-center">
      <p className="mb-4 text-sm font-medium tracking-[0.18em] text-[var(--film)]">
        PHOTO ARCHIVE
      </p>
      <h1 className="text-5xl font-black leading-[0.92] text-[var(--text)] sm:text-7xl lg:text-8xl">
        NOIR PHOTO
      </h1>

      {user ? (
        <div className="mt-6 space-y-4">
          <p className="text-lg text-[var(--muted-strong)]">
            欢迎回来，<span className="font-bold text-[var(--text)]">{user.nickname}</span>
          </p>
          <Link
            href="/albums"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--accent)] px-8 text-sm font-bold text-black transition hover:bg-white"
          >
            进入相册
          </Link>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--accent)] px-6 text-sm font-bold text-black transition hover:bg-white sm:w-auto"
          >
            登录
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-6 text-sm font-bold text-[var(--text)] transition hover:border-white/35 sm:w-auto"
          >
            注册
          </Link>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无新增错误

---

### Task 3: 创建统计卡片组件

**Files:**
- Create: `components/home/home-stats.tsx`

- [ ] **Step 1: 创建 `components/home/home-stats.tsx`**

```typescript
import { Library, Image, HardDrive } from "lucide-react";

type HomeStatsProps = {
  albumCount: number;
  photoCount: number;
  storageUsed: string;
  storageLimit: string;
};

function formatStorage(bytes: string): string {
  const num = Number(bytes);
  if (!Number.isFinite(num) || num === 0) return "0 B";
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const iconClass = "h-5 w-5 text-[var(--film)]";

export function HomeStats({ albumCount, photoCount, storageUsed, storageLimit }: HomeStatsProps) {
  const stats = [
    {
      icon: <Library className={iconClass} />,
      label: "相册",
      value: albumCount,
    },
    {
      icon: <Image className={iconClass} />,
      label: "照片",
      value: photoCount,
    },
    {
      icon: <HardDrive className={iconClass} />,
      label: "已用空间",
      value: `${formatStorage(storageUsed)} / ${formatStorage(storageLimit)}`,
    },
  ];

  return (
    <section className="mx-auto max-w-4xl">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--border-strong)] sm:p-5"
          >
            {item.icon}
            <p className="text-lg font-black text-[var(--text)] sm:text-2xl">
              {item.value}
            </p>
            <p className="text-xs text-[var(--muted)]">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无新增错误

---

### Task 4: 创建快捷操作区组件

**Files:**
- Create: `components/home/home-quick-actions.tsx`

- [ ] **Step 1: 创建 `components/home/home-quick-actions.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FolderPlus, Heart, Trash2 } from "lucide-react";
import { CreateAlbumModal } from "@/components/albums/create-album-modal";
const iconClass = "h-6 w-6 text-[var(--film)]";

const actions = [
  { key: "upload", icon: <Upload className={iconClass} />, label: "上传照片", desc: "添加新照片", href: "/albums" },
  { key: "album", icon: <FolderPlus className={iconClass} />, label: "新建相册", desc: "创建新相册", href: null },
  { key: "favorites", icon: <Heart className={iconClass} />, label: "我的收藏", desc: "查看收藏的照片", href: "/favorites" },
  { key: "trash", icon: <Trash2 className={iconClass} />, label: "回收站", desc: "管理已删除文件", href: "/trash" },
];

export function HomeQuickActions() {
  const router = useRouter();
  const { success, error: showError } = useMessage();
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [albumName, setAlbumName] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreateAlbum() {
    if (!albumName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: albumName.trim(), description: albumDescription.trim() || undefined }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "创建失败");
      }

      const json = await res.json();
      success("相册创建成功");
      setShowCreateAlbum(false);
      setAlbumName("");
      setAlbumDescription("");
      router.push(`/albums/${json.data.id}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  function handleClick(key: string) {
    if (key === "album") {
      setShowCreateAlbum(true);
    }
  }

  return (
    <>
      <section className="mx-auto max-w-4xl">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {actions.map((action) =>
            action.href ? (
              <Link
                key={action.key}
                href={action.href}
                className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center transition hover:border-[var(--border-strong)] hover:scale-[1.02] sm:p-5"
              >
                {action.icon}
                <p className="text-sm font-bold text-[var(--text)]">{action.label}</p>
                <p className="text-xs text-[var(--muted)]">{action.desc}</p>
              </Link>
            ) : (
              <button
                key={action.key}
                type="button"
                onClick={() => handleClick(action.key)}
                className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center transition hover:border-[var(--border-strong)] hover:scale-[1.02] sm:p-5"
              >
                {action.icon}
                <p className="text-sm font-bold text-[var(--text)]">{action.label}</p>
                <p className="text-xs text-[var(--muted)]">{action.desc}</p>
              </button>
            )
          )}
        </div>
      </section>

      <CreateAlbumModal
        open={showCreateAlbum}
        name={albumName}
        description={albumDescription}
        creating={creating}
        onNameChange={setAlbumName}
        onDescriptionChange={setAlbumDescription}
        onCreate={handleCreateAlbum}
        onClose={() => {
          setShowCreateAlbum(false);
          setAlbumName("");
          setAlbumDescription("");
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无新增错误

---

### Task 5: 创建最近照片组件

**Files:**
- Create: `components/home/home-recent-photos.tsx`

- [ ] **Step 1: 创建 `components/home/home-recent-photos.tsx`**

```typescript
import Link from "next/link";
import type { RecentPhoto } from "@/lib/home/queries";

type HomeRecentPhotosProps = {
  photos: RecentPhoto[];
};

function PhotoSkeleton() {
  return (
    <div className="aspect-square animate-pulse rounded-lg bg-[var(--surface-raised)]" />
  );
}

export function HomeRecentPhotosSkeleton() {
  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-4 h-6 w-32 animate-pulse rounded bg-[var(--surface-raised)]" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <PhotoSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function HomeRecentPhotos({ photos }: HomeRecentPhotosProps) {
  if (photos.length === 0) {
    return (
      <section className="mx-auto max-w-4xl text-center">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">最近上传</h2>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-12">
          <p className="mb-4 text-[var(--muted)]">还没有照片，开始上传吧</p>
          <Link
            href="/albums"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-6 text-sm font-bold text-black transition hover:bg-white"
          >
            上传照片
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--text)]">最近上传</h2>
        <Link
          href="/albums"
          className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
        >
          查看全部 →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {photos.map((photo) => (
          <Link
            key={photo.id}
            href={`/albums/${photo.albumId}`}
            className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] transition hover:border-[var(--border-strong)]"
          >
            <img
              src={photo.thumbnailUrl}
              alt={photo.originalName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="truncate text-xs text-white">{photo.originalName}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无新增错误

---

### Task 6: 重写首页 `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 重写 `app/page.tsx`**

```typescript
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentUserFromCookieStore } from "@/lib/auth/current-user";
import { getUserAlbums } from "@/lib/albums/library";
import { getUserPhotoCount, getRecentPhotos } from "@/lib/home/queries";
import { HomeHero } from "@/components/home/home-hero";
import { HomeStats } from "@/components/home/home-stats";
import { HomeQuickActions } from "@/components/home/home-quick-actions";
import { HomeRecentPhotos, HomeRecentPhotosSkeleton } from "@/components/home/home-recent-photos";
import { Suspense } from "react";

async function AuthenticatedContent({ userId, storageUsed, storageLimit }: {
  userId: string;
  storageUsed: string;
  storageLimit: string;
}) {
  const [albums, photoCount, recentPhotos] = await Promise.all([
    getUserAlbums(prisma, userId).catch(() => []),
    getUserPhotoCount(prisma, userId).catch(() => 0),
    getRecentPhotos(prisma, userId, 12).catch(() => []),
  ]);

  return (
    <>
      <section>
        <HomeStats
          albumCount={albums.length}
          photoCount={photoCount}
          storageUsed={storageUsed}
          storageLimit={storageLimit}
        />
      </section>

      <section>
        <HomeQuickActions />
      </section>

      <section>
        <HomeRecentPhotos photos={recentPhotos} />
      </section>
    </>
  );
}

export default async function HomePage() {
  const user = await getCurrentUserFromCookieStore(await cookies());

  return (
    <main className="overflow-x-hidden px-4 py-6 sm:px-6 sm:py-10 lg:px-12 lg:py-12">
      <div className="space-y-10 sm:space-y-14">
        <HomeHero user={user ? { nickname: user.nickname } : null} />

        {user ? (
          <Suspense fallback={<HomeRecentPhotosSkeleton />}>
            <AuthenticatedContent
              userId={user.id}
              storageUsed={user.storageUsed}
              storageLimit={user.storageLimit}
            />
          </Suspense>
        ) : null}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 无新增错误

---

### Task 7: 清理旧文件

**Files:**
- Delete: `components/home/home-actions.tsx`

- [ ] **Step 1: 删除旧 `home-actions.tsx`**

Run: `rm components/home/home-actions.tsx`

- [ ] **Step 2: 验证无残留引用**

Run: `npx tsc --noEmit`
Expected: 无错误

---

### Task 8: 运行完整验证

- [ ] **Step 1: Lint 检查**

Run: `npm run lint`
Expected: 无新增 lint 错误

- [ ] **Step 2: 构建检查**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 3: 运行测试**

Run: `npm test`
Expected: 现有测试通过

---

### Task 9: Commit

- [ ] **Step 1: 提交所有变更**

```bash
git add lib/home/queries.ts \
  components/home/home-hero.tsx \
  components/home/home-stats.tsx \
  components/home/home-quick-actions.tsx \
  components/home/home-recent-photos.tsx \
  app/page.tsx
git rm components/home/home-actions.tsx
git commit -m "feat: 重构首页 - 真实数据统计、快捷操作、最近照片预览"
```
