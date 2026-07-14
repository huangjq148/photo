# Photo Management App 用户操作体验改进 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留现有 Noir 视觉与业务模型的前提下，完整实现上传、图库查询与选择、删除安全、状态反馈、导航、预览和无障碍体验改进。

**Architecture:** 先收紧媒体权限并建立公共交互基础设施，再把超大的图库和上传组件拆为数据控制器、展示组件和状态组件。P0、P1、P2 各自具备独立发布门；查询条件写入 URL，显示偏好写入版本化 localStorage，批量操作统一使用结构化部分成功响应。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、Prisma/PostgreSQL、Tailwind CSS 4、Vitest、Playwright、Lucide React、XMLHttpRequest 上传进度。

---

## 0. 执行约束与文件边界

- 实施前使用 `superpowers:using-git-worktrees` 创建 `codex/photo-ux-improvement` 独立工作树。
- 当前默认 shell 可能落到 Node 14。进入工作树后先执行 `source "$HOME/.nvm/nvm.sh" && nvm use 22.23.1 && node --version`，预期 `v22.23.1`；后续每个新 shell 都先激活 Node 22。若该版本目录不存在，停止执行并先准备满足 `package.json` `>=22` 的运行时。
- 每个功能任务严格执行红—绿—重构：先写失败测试、确认失败、实现最小改动、确认通过、再提交。
- 每个阶段结束执行该阶段完整回归，不把 P2 验收强加给 P0。
- 不提交 `.agents/**/__pycache__`、测试报告、截图临时文件和 `.env*`。
- 设计依据：`docs/superpowers/specs/2026-07-13-photo-ux-improvement-design.md`。

### 目标文件结构

```text
components/
  layout/mobile-navigation.tsx
  photos/
    batch-action-bar.tsx
    gallery-empty-state.tsx
    gallery-grid.tsx
    gallery-toolbar.tsx
  ui/
    async-state.tsx
    confirmation-dialog.tsx
    menu.tsx
    skeleton.tsx
  upload/
    global-upload-dialog.tsx
    upload-dropzone.tsx
    upload-queue.tsx
hooks/
  use-album-media.ts
  use-focus-trap.ts
  use-gallery-query.ts
  use-selection.ts
lib/client/
  gallery-preferences.ts
  upload-queue.ts
  upload-request.ts
lib/api/
  batch-result.ts
  errors.ts
```

## P0：阻断、高风险与入口修复

### Task 1: 统一批量响应与稳定错误结构

**Files:**
- Create: `lib/api/batch-result.ts`
- Modify: `lib/api/errors.ts`
- Create: `tests/api-contracts.test.ts`

- [ ] **Step 1: 写失败测试**，覆盖 ID 去重、每个输入 ID 只进入成功或失败一次、稳定错误结构序列化。

```ts
expect(buildBatchResult(["a", "a", "b"], new Map([["b", forbidden]]))).toEqual({
  succeededIds: ["a"],
  failed: [{ id: "b", code: "FORBIDDEN", message: "没有权限" }],
});
```

- [ ] **Step 2: 运行并确认失败**：`npx vitest run --project unit tests/api-contracts.test.ts`；预期因模块不存在失败。
- [ ] **Step 3: 实现** `BatchMutationResult`、`BatchFailure`、`buildBatchResult()`，并扩展现有 `lib/api/errors.ts`；保留 `AppError` 和 `toErrorResponse` 的兼容导出，新增 `ApiError` 类型与 `jsonError(code, message, status, issues?)`；不改业务路由。
- [ ] **Step 4: 运行测试**；预期该文件全部通过。
- [ ] **Step 5: 提交**：`git commit -m "refactor: 统一批量操作和接口错误结构"`。

### Task 2: 拆分相册关系删除权与媒体管理权

**Files:**
- Modify: `lib/membership.ts`
- Modify: `lib/media/library.ts`
- Modify: `lib/albums/library.ts`
- Modify: `app/api/photos/[id]/route.ts`
- Modify: `app/api/photos/[id]/restore/route.ts`
- Modify: `app/api/trash/photos/[id]/restore/route.ts`
- Modify: `app/api/trash/photos/[id]/route.ts`
- Modify: `app/api/photos/[id]/permanent-delete/route.ts`
- Test: `tests/photo-library.integration.test.ts`
- Test: `tests/album-permissions.integration.test.ts`

- [ ] **Step 1: 写集成测试**：成员上传媒体后，相册拥有者可移除当前相册关系，但不能软删除、恢复或永久删除该媒体；上传者可执行媒体实体操作；回收站只返回当前上传者媒体。
- [ ] **Step 2: 启动测试库并确认失败**：`npm run test:db:up && npm run test:db:migrate && npx vitest run --project integration tests/photo-library.integration.test.ts tests/album-permissions.integration.test.ts`。
- [ ] **Step 3: 实现**：保留 `assertCanDelete()` 只控制 AlbumPhoto 关系；新增 `assertMediaUploader(media, userId)`；`softDeletePhoto`、restore、permanent delete 只认 `uploader_id`；`getTrashPhotos` 增加 `uploader_id=userId`。
- [ ] **Step 4: 所有兼容路由改用同一服务函数和稳定 code**：两条 restore 路由行为一致；两条 permanent-delete 路由行为一致；权限不足返回 `403 MEDIA_UPLOADER_REQUIRED`，非回收站返回 `409 MEDIA_NOT_TRASHED`。
- [ ] **Step 5: 运行上述集成测试**，再运行 `npx vitest run --project unit tests/album-direct-member.test.ts tests/duplicates.test.ts`。
- [ ] **Step 6: 提交**：`git commit -m "fix: 收紧媒体删除与恢复权限"`。

### Task 3: 建立统一确认弹窗并保护永久删除

**Files:**
- Create: `components/ui/confirmation-dialog.tsx`
- Modify: `components/ui/modal.tsx`
- Modify: `components/photos/trash-gallery.tsx`
- Modify: `components/photos/duplicate-gallery.tsx`
- Modify: `components/photos/photo-gallery.tsx`
- Modify: `components/photos/map-gallery.tsx`
- Modify: `components/albums/album-detail.tsx`
- Modify: `components/albums/album-members.tsx`
- Modify: `components/auth/security-form.tsx`
- Create: `tests/confirmation-dialog.test.ts`
- Modify: `tests/modal.test.ts`

- [ ] **Step 1: 写失败组件测试**：危险主按钮包含具体动作；`requireText="永久删除"` 未匹配时禁用；busy 时不能关闭或重复确认。
- [ ] **Step 2: 运行**：`npx vitest run --project unit tests/confirmation-dialog.test.ts tests/modal.test.ts`；预期失败。
- [ ] **Step 3: 按设计规格实现 `ConfirmationDialogProps`**，`onConfirm` 支持 Promise，错误留在弹窗内。
- [ ] **Step 4: 将回收站单项、批量、清空、相册删除、成员移除/退出、孩子相册关闭、图库与地图位置可见性、重复项删除和退出所有设备的原生确认全部替换为组件状态；清空要求输入“永久删除”。
- [ ] **Step 5: 增加组件测试断言所有永久删除入口均先打开 dialog，再运行相关单测。
- [ ] **Step 6: 提交**：`git commit -m "feat: 统一危险操作确认弹窗"`。

### Task 4: 建立搜索、排除和稳定游标查询契约

**Files:**
- Modify: `lib/media/query-schema.ts`
- Modify: `lib/media/library.ts`
- Modify: `lib/albums/library.ts`
- Modify: `app/api/albums/[id]/photos/route.ts`
- Create: `tests/gallery-query.test.ts`
- Modify: `tests/photo-library.integration.test.ts`

- [ ] **Step 1: 写失败测试**：`q` 搜索显示名称和原始名；`excludeAlbumId` 排除已在目标相册的媒体；默认按有效时间倒序且相同时间用 ID 稳定排序。媒体类型、收藏、上传者、日期和可选排序留到 Task 22。
- [ ] **Step 2: 写游标测试**：编码 `{ sortValue, id }`，连续翻页无重复和遗漏，非法游标返回 `422 INVALID_CURSOR`。
- [ ] **Step 3: 运行单元和集成测试并确认失败**。
- [ ] **Step 4: 为 `q`、`excludeAlbumId` 和默认有效时间排序扩展 Zod schema 与查询上下文**；新增 `encodeMediaCursor`/`decodeMediaCursor`；响应改为 `{ items, nextCursor, total }`，旧 `page` 暂时兼容但新前端不使用。
- [ ] **Step 5: 使用现有索引完成本阶段，不提前为 P2 可选筛选增加数据库迁移。
- [ ] **Step 6: 运行**：`npx vitest run --project unit tests/gallery-query.test.ts && npx vitest run --project integration tests/photo-library.integration.test.ts`。
- [ ] **Step 7: 提交**：`git commit -m "feat: 扩展照片查询和游标分页"`。

### Task 5: 拆出图库查询控制器和常驻工具栏

**Files:**
- Create: `hooks/use-gallery-query.ts`
- Create: `hooks/use-album-media.ts`
- Create: `components/photos/gallery-toolbar.tsx`
- Create: `components/photos/gallery-empty-state.tsx`
- Modify: `components/photos/photo-gallery.tsx`
- Create: `tests/gallery-query-hook.test.ts`
- Create: `tests/gallery-toolbar.test.ts`

- [ ] **Step 1: 测试查询解析**：URL 中 `q` 可恢复；300ms 防抖；输入法 composing 不请求；新请求 abort 旧请求。
- [ ] **Step 2: 测试状态分层**：`initialLoading`、`refreshing`、`loadingMore`、`error`、`loadMoreError` 不互相覆盖。
- [ ] **Step 3: 运行测试确认失败**。
- [ ] **Step 4: 实现两个 hook**；`useAlbumMedia` 暴露 `reload()`、`loadMore()`、`hasMore`，并用 request sequence 防止已完成的旧响应覆盖新状态。
- [ ] **Step 5: 实现常驻工具栏和按原因区分的空状态**；搜索无结果时必须渲染“清空搜索”。
- [ ] **Step 6: 重构 `PhotoGallery` 只编排工具栏、网格、批量栏和弹窗；删除搜索变化时的全组件 early return；sentinel 自动加载与始终可见的键盘按钮共用 `loadMore()` 请求锁，按钮文案为“加载更多”，loading 时禁用并显示“正在加载”。
- [ ] **Step 7: 运行新增单测和 `tests/photo-gallery-card.test.ts`。
- [ ] **Step 8: 提交**：`git commit -m "refactor: 拆分图库查询与常驻工具栏"`。

### Task 6: 重做“从全部照片添加”分页与跨页选择

**Files:**
- Modify: `app/api/albums/[id]/photos/route.ts`
- Modify: `lib/albums/library.ts`
- Modify: `components/albums/add-photos-modal.tsx`
- Create: `hooks/use-selection.ts`
- Modify: `tests/add-photos-modal.test.ts`
- Modify: `tests/albums.integration.test.ts`

- [ ] **Step 1: 写失败 API 测试**：默认全部照片作为数据源，`excludeAlbumId` 排除当前相册关系，超过 50 项仍可由游标访问；单次超过 200 返回 422；不可访问媒体逐项失败且不能越权添加；已有关系幂等成功。
- [ ] **Step 2: 写失败组件测试**：搜索框、加载更多、已选数量、当前已加载全选、跨页选择和放弃选择确认。
- [ ] **Step 3: 运行测试确认失败。
- [ ] **Step 4: 实现 `useSelection`**，使用 `Set<string>`，提供 `toggle`、`selectMany`、`retainOnly(failedIds)`、`clear`。
- [ ] **Step 5: 选择器改用查询控制器；固定页脚；已添加项不返回；`addPhotosToAlbum` 逐项验证媒体属于当前用户可访问的默认“全部照片”，按 `BatchMutationResult` 返回部分成功且不因单项失败中止；前端只保留失败选择。
- [ ] **Step 6: 运行相关单元和集成测试。
- [ ] **Step 7: 提交**：`git commit -m "feat: 支持跨页选择照片添加到相册"`。

### Task 7: 修复触屏照片操作并建立点击式菜单

**Files:**
- Create: `components/ui/menu.tsx`
- Modify: `components/photos/photo-gallery-card.tsx`
- Modify: `tests/photo-gallery-card.test.ts`
- Create: `tests/menu.test.ts`

- [ ] **Step 1: 修改失败测试**：不再断言 `group-hover:opacity-100`；断言操作容器移动端可见，只有 `[@media(hover:hover)_and_(pointer:fine)]` 条件下可隐藏；菜单由按钮点击控制。
- [ ] **Step 2: 写菜单键盘测试**：Enter 打开、上下键移动、Escape 关闭并恢复焦点。
- [ ] **Step 3: 运行测试确认失败。
- [ ] **Step 4: 实现受控 `Menu`/`MenuItem`，加入 `aria-haspopup="menu"`、`aria-expanded`、`role="menu"` 和外部点击关闭。
- [ ] **Step 5: 卡片按权限生成菜单项；媒体主体、选择、更多操作的事件相互隔离；触控目标至少 44px。
- [ ] **Step 6: 运行组件测试。
- [ ] **Step 7: 提交**：`git commit -m "fix: 提升触屏照片操作可发现性"`。

### Task 8: 分离相册页面加载错误与表单错误

**Files:**
- Modify: `components/albums/album-detail.tsx`
- Modify: `components/albums/album-management-modal.tsx`
- Modify: `tests/album-management-modal.test.ts`
- Modify: `tests/album-detail-header.test.ts`

- [ ] **Step 1: 写失败测试**：保存资料返回错误后相册标题和图库仍存在，弹窗输入仍保留；只有首次加载失败替换主体。
- [ ] **Step 2: 运行相关单测确认失败。
- [ ] **Step 3: 将 `error` 拆为 `loadError`、`formError`；`handleSave` 只写 formError，成功后清除；管理弹窗接收并渲染字段区错误。
- [ ] **Step 4: 移除表单错误触发页面 early return 的路径，添加“重新加载相册”。
- [ ] **Step 5: 运行测试并提交**：`git commit -m "fix: 保留相册设置失败时的页面上下文"`。

### Task 9: 建立最小全局上传入口

**Files:**
- Create: `components/upload/global-upload-dialog.tsx`
- Create: `components/upload/upload-provider.tsx`
- Modify: `components/upload/photo-upload-form.tsx`
- Modify: `components/home/home-quick-actions.tsx`
- Modify: `components/albums/album-detail-header.tsx`
- Modify: `components/albums/album-detail.tsx`
- Modify: `components/layout/app-shell.tsx`
- Modify: `app/layout.tsx`
- Modify: `lib/albums/library.ts`
- Modify: `app/api/albums/route.ts`
- Modify: `components/albums/create-album-modal.tsx`
- Modify: `tests/albums.integration.test.ts`
- Create: `tests/global-upload-dialog.test.ts`

- [ ] **Step 1: 写失败测试**：`AlbumSummary` 返回 `canUpload`；拥有者和 `can_upload=true` 成员可选，只读成员不可选；首页上传打开 dialog；桌面 AppShell 顶栏显示“上传”按钮并打开 dialog；相册内自动选中当前相册；非相册页默认选中“全部照片”。
- [ ] **Step 2: 运行测试确认失败。
- [ ] **Step 3: 扩展 `AlbumSummary.canUpload`，值为 owner 或成员 `can_upload`；`GET /api/albums` 保持按更新时间倒序，为上传选择器提供最近 5 个、名称客户端搜索和完整可上传列表。
- [ ] **Step 4: 实现 `UploadProvider`，向子树暴露 `openUpload({ albumId? })`，并在 AppShell 内挂载单例 dialog和桌面顶栏“上传”主按钮；非相册页默认选中可上传的“全部照片”，没有可上传相册时嵌入 `CreateAlbumModal`，创建成功后刷新列表、选中新相册并回到文件选择步骤；P0 复用现有 `PhotoUploadForm`，不实现伪进度。
- [ ] **Step 5: 相册头拆成“上传新照片”和“从全部照片添加”；上传不再隐藏在管理页签，旧页签可暂留兼容到 P1。
- [ ] **Step 6: 运行单测、`tests/albums.integration.test.ts` 和 `tests/auth-navigation.test.ts`。
- [ ] **Step 7: 提交**：`git commit -m "feat: 添加全局照片上传入口"`。

### Task 10: P0 验收与发布门

**Files:**
- Create: `tests/e2e/photo-ux-p0.spec.ts`
- Modify: `README.md`（仅在操作入口或测试命令需要说明时）

- [ ] **Step 1: 写 E2E**：搜索无结果后清空；375px 操作入口可见；从首页打开上传；主图库“加载更多”可由键盘聚焦和触发；第 51 项可添加；永久删除必须确认；相册保存失败保留页面。
- [ ] **Step 2: 运行定向 E2E**：`npx playwright test tests/e2e/photo-ux-p0.spec.ts --project chromium`。
- [ ] **Step 3: 运行 P0 回归**：`npm run lint && npm run typecheck && npm run test:unit && npm run test:integration && npm run build`。
- [ ] **Step 4: 修复仅由 P0 引入的回归并重新执行完整命令。
- [ ] **Step 5: 提交**：`git commit -m "test: 补充首阶段体验验收"`。

## P1：上传、批量操作与公共交互基础设施

### Task 11: 实现可取消且有真实进度的上传请求

**Files:**
- Create: `lib/client/upload-request.ts`
- Create: `tests/upload-request.test.ts`

- [ ] **Step 1: 用可注入 XHR factory 写失败测试**：进度取 `loaded/total`、成功解析 JSON、非 2xx 返回业务错误、abort 返回 cancelled。
- [ ] **Step 2: 运行测试确认失败。
- [ ] **Step 3: 实现 `uploadFile({ albumId, file, signal, onProgress })`，只在此模块使用 XHR。
- [ ] **Step 4: 运行测试并提交**：`git commit -m "feat: 支持照片上传进度与取消"`。

### Task 12: 实现上传队列 reducer 与三并发调度

**Files:**
- Create: `lib/client/upload-queue.ts`
- Create: `tests/upload-queue.test.ts`

- [ ] **Step 1: 写 reducer 失败测试**：queued→uploading→success/failed/cancelled；重试回 queued；同文件项不能重复运行。
- [ ] **Step 2: 写调度失败测试**：同时最多 3 项，完成后补位，取消全部只影响 queued/uploading，批次结束只触发一次回调。
- [ ] **Step 3: 运行确认失败，随后实现纯 reducer 和可注入 request 的 scheduler。
- [ ] **Step 4: 验证 URL 预览的 revoke 清理逻辑。
- [ ] **Step 5: 提交**：`git commit -m "feat: 添加三并发上传队列"`。

### Task 13: 完成拖拽、粘贴和上传队列 UI

**Files:**
- Create: `components/upload/upload-dropzone.tsx`
- Create: `components/upload/upload-queue.tsx`
- Modify: `components/upload/global-upload-dialog.tsx`
- Remove after migration: `components/upload/photo-upload-form.tsx`
- Create: `tests/upload-dropzone.test.ts`
- Create: `tests/upload-queue-ui.test.ts`

- [ ] **Step 1: 写失败测试**：点击、drag/drop、dialog 聚焦时 paste；无效格式不入队；中文状态和总进度；失败全部重试。
- [ ] **Step 2: 写关闭保护测试**：queued 或 uploading 时调用 `onBeforeClose`，全部完成可直接关闭。
- [ ] **Step 3: 实现组件并接入 Tasks 11–12；上传批次结束统一刷新一次。
- [ ] **Step 4: 删除旧上传页签和旧表单前，用 `rg "PhotoUploadForm"` 确认无消费者。
- [ ] **Step 5: 运行上传单测和 `tests/photo-upload.integration.test.ts`。
- [ ] **Step 6: 提交**：`git commit -m "feat: 完善拖拽上传与队列反馈"`。

### Task 14: 扩展全局消息系统并支持撤销

**Files:**
- Modify: `components/ui/message.tsx`
- Modify: `app/layout.tsx`
- Modify: `components/home/home-quick-actions.tsx`
- Modify: `tests/message.test.ts`

- [x] **Step 1: 写失败测试**：success/error/warning/info；最多 3 条；1 秒内同文案合并；action 6 秒；error 可关闭且 `role=alert`。
- [x] **Step 2: 运行确认失败。
- [x] **Step 3: 实现 `MessageOptions`、排队、去重、动作 pending 和手动关闭；避免 action Promise 重复执行；删除首页快捷操作自建的固定消息层并改用 `useMessage`。
- [x] **Step 4: 运行测试并提交**：`git commit -m "feat: 扩展消息反馈与撤销操作"`。

### Task 15: 实现全部批量媒体 API

**Files:**
- Create: `app/api/photos/batch-favorite/route.ts`
- Create: `app/api/photos/batch-trash/route.ts`
- Create: `app/api/albums/[id]/photos/batch-remove/route.ts`
- Modify: `app/api/albums/[id]/photos/batch-delete/route.ts`
- Modify: `app/api/photos/[id]/favorite/route.ts`
- Modify: `components/photos/photo-gallery.tsx`
- Modify: `components/photos/favorites-gallery.tsx`
- Modify: `app/api/trash/photos/batch-restore/route.ts`
- Modify: `app/api/trash/photos/batch-delete/route.ts`
- Modify: `app/api/trash/photos/clear/route.ts`
- Modify: `lib/media/library.ts`
- Modify: `lib/albums/library.ts`
- Create: `tests/batch-media-actions.integration.test.ts`

- [x] **Step 1: 写集成测试**：每个输入 ID 进入 succeeded/failed；单项权限失败不回滚其他项；收藏显式 `favorited` 幂等；单次最多 200。
- [x] **Step 2: 写清空测试**：结果 ID 并集等于请求开始时当前上传者回收站媒体，不处理其他上传者。
- [x] **Step 3: 运行确认失败。
- [x] **Step 4: 抽出逐项授权执行器，路由全部返回 `BatchMutationResult`；旧 batch-delete 关系接口转发到 batch-remove 并标记兼容；图库单项收藏改为 POST `{ favorited }`，收藏页取消收藏也调用同一显式接口，不再发送 DELETE。迁移期间服务端可兼容无 body 的 toggle，但 P1 gate 前前端不得再依赖。
- [x] **Step 5: 运行集成测试和存储一致性相关测试。
- [ ] **Step 6: 提交**：`git commit -m "feat: 统一批量媒体操作接口"`。

### Task 16: 建立响应式批量选择操作栏

**Files:**
- Create: `components/photos/batch-action-bar.tsx`
- Create: `components/photos/gallery-grid.tsx`
- Modify: `components/photos/photo-gallery.tsx`
- Modify: `components/photos/photo-gallery-card.tsx`
- Create: `tests/batch-action-bar.test.ts`

- [ ] **Step 1: 写失败测试**：进入选择模式后卡片主体切换选择；桌面 sticky、移动端位于底部导航之上；部分失败只保留失败项。
- [ ] **Step 2: 运行确认失败。
- [ ] **Step 3: 接入 `useSelection` 和 Task 15 API；操作包括添加、收藏/取消、删除、取消；pending 时禁重复提交。
- [ ] **Step 4: 在搜索筛选变化前有选择时显示放弃确认。
- [ ] **Step 5: 运行组件测试并提交**：`git commit -m "feat: 添加响应式照片批量操作栏"`。

### Task 17: 统一移除、回收站和永久删除交互

**Files:**
- Modify: `components/photos/photo-gallery.tsx`
- Modify: `components/photos/photo-gallery-card.tsx`
- Modify: `components/photos/trash-gallery.tsx`
- Modify: `components/photos/timeline-gallery.tsx`
- Modify: `components/photos/duplicate-gallery.tsx`
- Create: `tests/delete-action-policy.test.ts`

- [ ] **Step 1: 写策略测试**：默认相册只有移入回收站；普通相册对他人媒体只有移除；本人媒体同时可移除或移入回收站；永久删除总是确认。
- [ ] **Step 2: 运行确认失败。
- [ ] **Step 3: 实现纯函数 `getMediaDeleteActions(context)` 并让各页面复用；移除单项直接执行且提供 6 秒撤销，批量移除确认。
- [ ] **Step 4: 撤销分别调用重新添加关系或 restore；失败时保留错误和恢复入口。
- [ ] **Step 5: 运行组件与集成测试并提交**：`git commit -m "feat: 统一照片删除语义与撤销"`。

### Task 18: 完成 Modal 焦点约束与关闭保护

**Files:**
- Create: `hooks/use-focus-trap.ts`
- Modify: `components/ui/modal.tsx`
- Modify: `components/albums/create-album-modal.tsx`
- Modify: `components/albums/album-management-modal.tsx`
- Modify: `tests/modal.test.ts`
- Create: `tests/e2e/modal-focus.spec.ts`

- [ ] **Step 1: 扩展静态组件失败测试**：Modal 输出可聚焦容器、背景标记、标题关联和新属性对应结构。
- [ ] **Step 2: 写 Playwright 失败测试**：打开聚焦 initial ref；Tab 循环；背景不可操作；Escape 规则；关闭恢复触发器；`onBeforeClose=false` 保持打开。运行 `npx vitest run --project unit tests/modal.test.ts` 和 `npx playwright test tests/e2e/modal-focus.spec.ts --project chromium`，确认至少新增断言失败。
- [ ] **Step 3: 实现 hook 和 Modal 新属性；嵌套弹窗只让最上层响应 Escape。
- [ ] **Step 4: 创建相册和资料编辑改用 `<form>`；名称初始聚焦，Enter 提交，保存失败保留页签。
- [ ] **Step 5: 运行所有弹窗组件测试并提交**：`git commit -m "feat: 完善弹窗焦点与关闭保护"`。

### Task 19: 统一骨架、异步错误与图库偏好

**Files:**
- Create: `components/ui/skeleton.tsx`
- Create: `components/ui/async-state.tsx`
- Create: `lib/client/gallery-preferences.ts`
- Modify: `components/photos/photo-gallery.tsx`
- Modify: `components/photos/photo-gallery-controls-modal.tsx`
- Create: `tests/gallery-preferences.test.ts`
- Create: `tests/async-state.test.ts`

- [ ] **Step 1: 写偏好测试**：v1 默认值、合法持久化、损坏数据回退、未知字段忽略。
- [ ] **Step 2: 写异步状态测试**：首次骨架、刷新保留内容、加载更多错误带重试。
- [ ] **Step 3: 实现并接入图库；偏好只含 size/layout/showTakenAt/groupMode，搜索筛选不写 localStorage。
- [ ] **Step 4: 运行测试并提交**：`git commit -m "feat: 持久化图库偏好并统一加载状态"`。

### Task 20: P1 验收与发布门

**Files:**
- Create: `tests/e2e/photo-ux-p1.spec.ts`

- [ ] **Step 1: E2E 覆盖三并发上传、失败重试、关闭保护、批量部分失败、移除撤销、Modal 键盘和偏好刷新保持。
- [ ] **Step 2: 运行**：`npx playwright test tests/e2e/photo-ux-p0.spec.ts tests/e2e/photo-ux-p1.spec.ts --project chromium`。
- [ ] **Step 3: 运行 `npm run verify`；若测试数据库或浏览器依赖缺失，先恢复环境而不是跳过。
- [ ] **Step 4: 提交**：`git commit -m "test: 补充核心体验流程验收"`。

## P2：导航、筛选、预览与全站一致性

### Task 21: 重构桌面导航与移动端底部导航

**Files:**
- Create: `components/layout/mobile-navigation.tsx`
- Modify: `components/layout/app-shell.tsx`
- Modify: `components/layout/user-menu.tsx`
- Modify: `app/globals.css`
- Modify: `tests/auth-navigation.test.ts`
- Create: `tests/mobile-navigation.test.ts`

- [ ] **Step 1: 写失败测试**：移动端相册/时间线/上传/回忆/更多；更多抽屉含收藏、地图、重复、回收站、安全、退出；当前项双重表达。
- [ ] **Step 2: 运行确认失败。
- [ ] **Step 3: 实现底部导航、安全区 padding 和桌面“更多”点击菜单；移动端移除七项横向滚动导航。
- [ ] **Step 4: 账户退出增加 pending 和失败恢复。
- [ ] **Step 5: 运行测试并提交**：`git commit -m "feat: 优化桌面与移动端主导航"`。

### Task 22: 完成筛选、排序和 URL 状态

**Files:**
- Modify: `components/photos/gallery-toolbar.tsx`
- Modify: `components/albums/add-photos-modal.tsx`
- Modify: `hooks/use-gallery-query.ts`
- Modify: `lib/media/query-schema.ts`
- Modify: `lib/media/library.ts`
- Modify: `lib/albums/library.ts`
- Modify: `app/api/albums/[id]/photos/route.ts`
- Modify: `tests/gallery-query.test.ts`
- Modify: `tests/gallery-toolbar.test.ts`

- [ ] **Step 1: 写失败测试**：媒体类型、仅收藏、上传者、起止日期、排序和分组；结束日期转换下一日本地零点 ISO；清空筛选不清搜索。
- [ ] **Step 2: 运行确认失败。
- [ ] **Step 3: 工具栏实现筛选面板、已启用数量和排序；查询 hook 负责 URL 序列化；分组仅影响展示；“从全部照片添加”选择器复用媒体类型与日期筛选控件和相同查询参数，但不显示收藏、上传者与排序控件。
- [ ] **Step 4: 协作相册才请求并显示上传者筛选。
- [ ] **Step 5: 运行单元和查询集成测试并提交**：`git commit -m "feat: 完善照片筛选排序与链接状态"`。

### Task 23: 完善图片和视频预览器

**Files:**
- Modify: `components/ui/image-viewer/index.tsx`
- Modify: `components/ui/image-viewer/interactions.ts`
- Modify: `components/ui/video-viewer/index.tsx`
- Modify: `components/photos/image-viewer-navigation.ts`
- Modify: `tests/image-viewer-navigation.test.ts`
- Modify: `tests/image-viewer-zoom.test.ts`
- Create: `tests/image-viewer-accessibility.test.ts`

- [ ] **Step 1: 写失败测试**：焦点约束和恢复；`+/-/0`；未放大横滑、放大拖动和双指缩放状态；切走视频触发 pause。
- [ ] **Step 2: 写分页边界测试**：最后一项触发 `onLoadMore`，合并新 items 后继续下一张，失败保留当前项并可重试。
- [ ] **Step 3: 运行确认失败。
- [ ] **Step 4: 复用 `useFocusTrap`；把手势状态计算拆到 interactions；只在放大拖动时阻止默认触摸。
- [ ] **Step 5: 预览器新增 `{ hasMore, loadingMore, onLoadMore }`；图库控制器保证请求锁和去重。
- [ ] **Step 6: 运行图片、视频相关单测并提交**：`git commit -m "feat: 完善媒体预览导航与触摸交互"`。

### Task 24: 重做媒体信息面板

**Files:**
- Create: `components/photos/media-info-dialog.tsx`
- Modify: `components/photos/photo-gallery-card.tsx`
- Modify: `lib/albums/library.ts`
- Modify: `app/api/albums/[id]/photos/route.ts`
- Create: `tests/media-info-dialog.test.ts`
- Modify: `tests/photo-gallery-card.test.ts`

- [ ] **Step 1: 写失败测试**：卡片不再渲染可点击整面遮罩；信息 dialog 展示显示名称、原始文件名、尺寸、格式、文件大小、视频时长、拍摄时间、上传时间、所在相册数和位置隐藏状态。
- [ ] **Step 2: 写关闭测试**：有明确关闭按钮，Escape 通过公共 Modal 关闭并恢复到菜单触发器。
- [ ] **Step 3: 运行 `npx vitest run --project unit tests/media-info-dialog.test.ts tests/photo-gallery-card.test.ts`，确认失败。
- [ ] **Step 4: 查询 DTO 增加 `size`、`albumCount` 和信息面板所需已有字段；实现 `MediaInfoDialog` 并从菜单打开，不为信息面板新增独立请求。
- [ ] **Step 5: 运行组件和相册查询集成测试并提交**：`git commit -m "feat: 完善照片媒体信息面板"`。

### Task 25: 统一首页和相册卡片入口

**Files:**
- Modify: `components/home/home-recent-photos.tsx`
- Modify: `components/home/home-hero.tsx`
- Modify: `components/albums/album-card.tsx`
- Modify: `components/albums/album-list.tsx`
- Modify: `tests/auth-navigation.test.ts`
- Modify: `tests/album-detail-header.test.ts`

- [ ] **Step 1: 写失败测试**：最近照片使用统一预览而非原图链接；空封面使用 Lucide 图标，无 emoji；空相册 CTA 创建后进入详情并打开上传。
- [ ] **Step 2: 运行确认失败。
- [ ] **Step 3: 实现统一行为；整卡进入相册，信息按钮事件隔离并支持触摸点击。
- [ ] **Step 4: 运行测试并提交**：`git commit -m "refactor: 统一首页与相册卡片交互"`。

### Task 26: 改善认证表单字段反馈

**Files:**
- Modify: `components/auth/login-form.tsx`
- Modify: `components/auth/register-form.tsx`
- Modify: `components/auth/security-form.tsx`
- Create: `components/auth/password-field.tsx`
- Modify: `tests/login-user.test.ts`
- Modify: `tests/auth-navigation.test.ts`

- [ ] **Step 1: 写失败测试**：issues 按 path 映射字段；输入关联 `aria-describedby`；密码显示/隐藏有可访问名称；成功导航前防重复提交。
- [ ] **Step 2: 运行确认失败。
- [ ] **Step 3: 实现复用 PasswordField 和字段错误 map；全局错误只显示非字段问题。
- [ ] **Step 4: 运行认证单测并提交**：`git commit -m "feat: 优化认证表单字段反馈"`。

### Task 27: 完成全站语义、图片稳定性和响应式检查

**Files:**
- Modify: `app/layout.tsx`
- Modify: `components/layout/app-shell.tsx`
- Modify: `app/page.tsx`
- Modify: `app/albums/page.tsx`
- Modify: `app/albums/[albumId]/page.tsx`
- Modify: `app/timeline/page.tsx`
- Modify: `app/favorites/page.tsx`
- Modify: `app/trash/page.tsx`
- Modify: `app/map/page.tsx`
- Modify: `app/duplicates/page.tsx`
- Modify: `app/memory/page.tsx`
- Modify: `components/home/home-hero.tsx`
- Modify: `components/home/home-recent-photos.tsx`
- Modify: `components/albums/album-card.tsx`
- Modify: `components/photos/photo-gallery-card.tsx`
- Modify: `components/photos/timeline-gallery.tsx`
- Modify: `components/photos/favorites-gallery.tsx`
- Modify: `components/photos/map-gallery.tsx`
- Modify: `components/photos/trash-gallery.tsx`
- Create: `tests/accessibility-structure.test.ts`
- Create: `tests/e2e/photo-ux-responsive.spec.ts`

- [ ] **Step 1: 写结构测试**：跳到 `#main-content`；页面单一 h1；图标按钮 aria-label；switch 有名称；无关键透明点击区。
- [ ] **Step 2: 运行确认失败。
- [ ] **Step 3: 添加 skip link 和统一 main id；修复 heading 层级、label、44px 触控目标。
- [ ] **Step 4: 为原生图片补 width/height 或 aspect-ratio，首屏优先、其余 lazy；不能使用 Next Image 的受保护资源记录原因。
- [ ] **Step 5: 在 `photo-ux-responsive.spec.ts` 中为 320/375/414/768/1024/1440 参数化视口，断言 `document.documentElement.scrollWidth <= window.innerWidth`、底部导航与批量栏不重叠并保存截图；运行 `npx playwright test tests/e2e/photo-ux-responsive.spec.ts --project chromium`。
- [ ] **Step 6: 运行 lint、类型和相关测试并提交**：`git commit -m "fix: 完善全站无障碍与响应式细节"`。

### Task 28: 最终 E2E、文档和完整验证

**Files:**
- Create: `tests/e2e/photo-ux-final.spec.ts`
- Modify: `README.md`
- Create: `docs/release-notes/2026-07-13-photo-ux-improvement.md`

- [ ] **Step 1: 按设计文档 19.4 的 9 条场景补齐最终 E2E；不要复制 P0/P1 已覆盖断言。
- [ ] **Step 2: 增加 375/768/1440 三个视觉项目或截图断言，覆盖导航、四类图库状态、选择栏、上传、确认和预览。
- [ ] **Step 3: 更新 README，说明全局上传、筛选 URL、回收站权限和偏好键 `photo:gallery-preferences:v1`。
- [ ] **Step 4: 新建发布说明，列出 API 兼容接口和迁移页面。
- [ ] **Step 5: 运行完整验证**：`npm run verify`；预期 lint、typecheck、unit、integration、E2E、build 全部退出 0。
- [ ] **Step 6: 运行工作树检查**：`git status --short`；预期只有计划内文档或为空，不包含 pycache、报告、环境文件。
- [ ] **Step 7: 使用 `superpowers:requesting-code-review` 进行最终代码审查；修复阻断问题后重新执行 `npm run verify`。
- [ ] **Step 8: 提交**：`git commit -m "test: 完成用户体验改进全链路验收"`。

## 提交与发布顺序

```text
Tasks 1–9  → Task 10 P0 gate → 可发布 P0
Tasks 11–19 → Task 20 P1 gate → 可发布 P1
Tasks 21–27 → Task 28 final gate → 可发布 P2 / 完整版本
```

每个 gate 通过后再开始下一阶段。任何权限、永久删除或数据一致性测试失败都属于发布阻断；纯视觉差异只有在遮挡操作、破坏对比度或造成布局溢出时阻断。
