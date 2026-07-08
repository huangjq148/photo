# 首页优化设计方案

## 概述

对应用首页进行全面优化：保留品牌调性，新增真实数据展示、快捷操作入口和最近照片预览，登入前后体验差异化。

## 当前问题

- 统计卡片使用硬编码占位值（"Ready" / "Live" / "On"），无实际意义
- 装饰卡片"ARCHIVE EDIT SHARE"纯视觉，无功能
- 首页无任何真实数据展示
- 登录后首页下方空白，无内容承接
- 功能入口仅有 1-2 个按钮

## 设计方案：分区滚动布局

### 页面结构（从上到下）

1. **Hero 品牌区** — 精简现有标题 + 登录/注册引导
2. **统计卡片** — 3 列真实数据（相册数 / 照片数 / 已用空间）
3. **快捷操作区** — 4 个入口卡片（上传 / 新建相册 / 收藏 / 回收站）
4. **最近上传** — 照片缩略图网格（最新 8-12 张）

### 未登录用户

只显示精简 Hero 区 + 登录/注册 CTA，其他区域不渲染。

---

## 各区域详细设计

### 1. Hero 品牌区

- 保留 "PHOTO ARCHIVE" 标签 + "NOIR PHOTO" 大标题
- 移除右侧装饰卡片 ARCHIVE EDIT SHARE（被下方真实数据取代）
- 已登录：显示"欢迎回来，{nickname}" + "进入相册"按钮
- 未登录：显示登录 + 注册按钮
- 布局从 lg: 两列改为单列居中，更聚焦品牌调性

### 2. 统计卡片

- 3 列网格：相册数量 / 照片总数 / 已用空间
- 使用 lucide-react 图标：`Library` / `Image` / `HardDrive`
- 数字使用大号字体，标签使用 muted 色
- 存储空间格式化显示（GB/MB/KB）
- 数据来源：
  - 相册数：`getUserAlbums(prisma, userId)` 的 length
  - 照片数：新建 `getUserPhotoCount` 查询
  - 存储空间：`currentUser.storageUsed` / `currentUser.storageLimit`

### 3. 快捷操作区

- 4 个入口卡片，2 列（移动端）/ 4 列（桌面端）网格
- 每张卡片：lucide 图标 + 标签 + 简短描述
- 入口列表：
  | 入口 | 图标 | 跳转 |
  |---|---|---|
  | 上传照片 | `Upload` | 触发上传弹窗或跳转 /albums |
  | 新建相册 | `FolderPlus` | 触发新建相册弹窗 |
  | 我的收藏 | `Heart` | /favorites |
  | 回收站 | `Trash2` | /trash |

- 卡片 hover：边框高亮 + 轻微缩放

### 4. 最近上传

- 从用户所有相册中取最近 8-12 张照片（按 uploaded_at 倒序）
- 响应式网格：2 列（移动端）/ 4 列（平板）/ 6 列（桌面端）
- 每张缩略图：
  - 使用 `thumbnailUrl`，正方形裁切 `aspect-square`
  - hover 显示文件名覆盖层
  - 点击跳转到对应相册
- 区域标题："最近上传" + "查看全部 →" 链接到 /albums
- 空状态：插图 + "还没有照片，开始上传吧" + 上传引导按钮
- 加载骨架屏：6 个灰色脉冲方块

### 5. 数据加载策略

- 首页使用 Server Component 预取数据（stat、recentPhotos）
- 用户信息通过 `getCurrentUserFromCookieStore` 在服务端获取
- 快捷操作区使用 Client Component（含交互逻辑）
- fallback：任何数据查询失败时，对应区域不渲染（静默降级）

---

## 技术方案

### 涉及文件

| 文件 | 操作 |
|---|---|
| `app/page.tsx` | 重写，引入新组件 |
| `components/home/home-hero.tsx` | 新建 |
| `components/home/home-stats.tsx` | 新建 |
| `components/home/home-quick-actions.tsx` | 新建（Client Component） |
| `components/home/home-recent-photos.tsx` | 新建 |
| `components/home/home-actions.tsx` | 修改（精简，移除到 hero 中） |
| `lib/home/queries.ts` | 新建，统一首页数据查询 |
| `app/globals.css` | 可能新增少量动画样式 |

### 数据查询

```typescript
// lib/home/queries.ts

// 获取用户总照片数
getUserPhotoCount(prisma, userId): number

// 获取最近上传照片（跨所有相册）
getRecentPhotos(prisma, userId, limit): MediaListItem[]
```

实现方式：通过 `AlbumMember` 找到用户所有相册，然后查询 `Media` 表中 `album_id IN (...)` 且 `status = 'normal'` 的照片，按 `uploaded_at desc` 排序，限制数量。

### 组件职责

- `home-hero.tsx`：纯展示组件，接收 `user` prop，渲染品牌标题 + 用户状态
- `home-stats.tsx`：纯展示组件，接收 stats 数据对象
- `home-quick-actions.tsx`：Client Component，处理上传/新建相册交互
- `home-recent-photos.tsx`：展示组件，接收照片列表，含空状态和骨架屏

### 不引入新依赖

复用现有 lucide-react 图标、Tailwind CSS 类和 CSS 变量体系。

---

## 验收标准

1. 未登录用户看到品牌标题 + 登录/注册按钮
2. 已登录用户看到欢迎语 + 真实统计数据 + 快捷操作 + 最近照片
3. 统计数字正确反映实际相册数、照片数、存储使用量
4. 快捷操作卡片可点击跳转到对应页面
5. 最近照片缩略图正确显示，点击可跳转
6. 无照片时显示空状态引导
7. 数据加载中显示骨架屏
8. 任何数据查询失败时对应区域静默隐藏
9. 移动端/平板/桌面端布局适配
10. 不破坏现有其他页面功能
