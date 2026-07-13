# Photo Management App Adjustment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复当前应用已确认的媒体权限、回收站、上传一致性和测试假通过问题，并补齐私密媒体安全、基础无障碍和工程治理。

**Architecture:** 保持 Next.js App Router、Prisma 和本地文件存储架构。权限判断集中在领域服务，API Route 只负责认证、输入解析和错误映射；单条、批量和清空操作复用同一媒体管理规则。所有任务按 TDD 推进，并以单元测试、数据库集成测试、Playwright 和生产构建作为分层门禁。

**Tech Stack:** Next.js 15、React 19、TypeScript、Prisma 6、PostgreSQL 16、Vitest 3、Playwright、Tailwind CSS 4、Node.js 22、Sharp、FFmpeg

---

## 一、范围与优先级

### P0：数据安全与真实交付

1. 添加照片时校验来源媒体访问权。
2. 上传前校验目标相册权限，失败时不得留下文件、记录或额度占用。
3. 统一回收站单条、批量和清空权限。
4. 清空回收站时真实删除 original、preview、thumbnail。
5. 消除公开分享 E2E 的静默跳过。

### P1：可靠性与安全

1. 私密媒体补齐缓存控制和严格 Range 校验。
2. 补齐应用安全响应头。
3. 原子化上传额度预留，防止并发超额。
4. 覆盖媒体完整生命周期 E2E。

### P2：体验与工程治理

1. 完善 Modal 焦点管理、跳转链接和页面状态。
2. 迁移弃用的 Vitest workspace 配置。
3. 清理错误文档内容并统一 npm 包管理器。

### 暂不包含

- 对象存储、独立消息队列、媒体 Worker、视频多码率转码。
- AI 标签、人脸聚类、自然语言搜索和全站视觉重构。
- 异步处理状态机另立设计与计划，避免与本轮权限修复共同发布。

## 二、目标文件

**新增：**

- `tests/trash-permissions.integration.test.ts`
- `tests/media-security-headers.test.ts`
- `tests/e2e/helpers/auth.ts`
- `tests/e2e/helpers/media.ts`
- `tests/e2e/media-lifecycle.spec.ts`
- `tests/e2e/accessibility.spec.ts`
- `lib/http/range.ts`
- `lib/http/security-headers.ts`
- `app/error.tsx`
- `app/loading.tsx`
- `app/not-found.tsx`

**主要修改：**

- `lib/albums/library.ts`
- `lib/media/library.ts`
- `lib/media/upload.ts`
- `app/api/albums/[id]/photos/route.ts`
- `app/api/albums/[id]/photos/upload/route.ts`
- `app/api/trash/photos/clear/route.ts`
- `app/api/trash/photos/batch-delete/route.ts`
- `app/api/trash/photos/batch-restore/route.ts`
- `app/api/files/[variant]/[fileName]/route.ts`
- `lib/media/public-files.ts`
- `lib/albums/public-files.ts`
- `next.config.ts`
- `prisma/schema.prisma`
- `components/ui/modal.tsx`
- `components/layout/app-shell.tsx`
- `app/layout.tsx`
- `vitest.config.ts`
- `package.json`
- `README.md`
- `docs/superpowers/2026-07-10-photo-reliability-roadmap.md`

## 三、实施任务

### Task 1：锁定添加现有照片的来源权限

**Files:**
- Modify: `lib/albums/library.ts:534-564`
- Modify: `app/api/albums/[id]/photos/route.ts:39-59`
- Test: `tests/album-permissions.integration.test.ts`

- [ ] **Step 1: 写失败测试**：用户 A 对目标相册有上传权限，但不能访问用户 B 的私密媒体；A 添加 B 的媒体 ID 必须抛出“部分媒体文件不可访问”，且不得创建 `AlbumPhoto`。
- [ ] **Step 2: 验证测试失败**

```bash
npm run test:integration -- tests/album-permissions.integration.test.ts
```

Expected: FAIL，当前实现会创建关联。

- [ ] **Step 3: 实现最小修复**：去重 `photoIds`，先校验目标相册 `can_upload`，再一次性查询当前用户能够访问的媒体。“可访问”指用户是媒体 owning album 的成员，或用户是任一 `AlbumPhoto` 关联相册的成员；不是仅指相册创建者。排除 `status=deleted` 的回收站媒体。数量不一致时整批拒绝；全部通过后再在事务中 upsert。
- [ ] **Step 4: 补齐边界测试**：空数组、重复 ID、合法和非法 ID 混合、已存在关联的幂等添加。
- [ ] **Step 5: 运行测试并提交**

```bash
npm run test:integration -- tests/album-permissions.integration.test.ts
git add lib/albums/library.ts 'app/api/albums/[id]/photos/route.ts' tests/album-permissions.integration.test.ts
git commit -m "fix: 校验添加照片的来源访问权限"
```

### Task 2：将上传目标权限检查前置

**Files:**
- Modify: `app/api/albums/[id]/photos/upload/route.ts:10-57`
- Modify: `lib/media/upload.ts:103-307`
- Test: `tests/photo-upload.integration.test.ts`

- [ ] **Step 1: 写零副作用失败测试**：`can_upload=false` 成员上传后，默认相册无新增媒体、`storage_used` 不变、测试存储目录无新增文件。
- [ ] **Step 2: 运行测试，确认当前实现会先上传到默认相册。**
- [ ] **Step 3: 在读取 FormData 和执行 Sharp/FFmpeg 前调用目标相册 `assertCanUpload`；保留领域层对默认相册的防御检查。**
- [ ] **Step 4: 若默认相册上传成功但目标关联异常，调用统一补偿服务删除媒体记录、三种文件并归还额度。**
- [ ] **Step 5: 验证并提交**

```bash
npm run test:integration -- tests/photo-upload.integration.test.ts tests/album-permissions.integration.test.ts
git add 'app/api/albums/[id]/photos/upload/route.ts' lib/media/upload.ts tests/photo-upload.integration.test.ts
git commit -m "fix: 前置校验上传目标并回滚失败媒体"
```

### Task 3：统一回收站权限矩阵

**Files:**
- Modify: `lib/media/library.ts:242-275`
- Modify: `lib/media/library.ts:672-849`
- Modify: `app/api/trash/photos/batch-delete/route.ts`
- Modify: `app/api/trash/photos/batch-restore/route.ts`
- Modify: `app/api/trash/photos/[id]/route.ts`
- Modify: `app/api/trash/photos/[id]/restore/route.ts`
- Modify: `app/api/photos/[id]/permanent-delete/route.ts`
- Modify: `app/api/photos/[id]/restore/route.ts`
- Create: `tests/trash-permissions.integration.test.ts`

- [ ] **Step 1: 写权限矩阵测试**

| 操作者 | 恢复 | 永久删除 |
|---|---:|---:|
| 上传者 | 允许 | 允许 |
| 执行软删除者 | 允许 | 允许 |
| 相册 owner | 允许 | 允许 |
| `can_delete=true` 成员 | 允许 | 允许 |
| 普通成员 | 拒绝 | 拒绝 |
| 非成员 | 拒绝 | 拒绝 |

混合批次中只要一项无权限，整个请求失败且不得部分成功。

- [ ] **Step 2: 运行测试并确认普通成员用例失败。**
- [ ] **Step 3: 提取统一 `canManageTrashMedia`。查询 owning album 及所有关联相册中当前用户的成员记录，并显式允许以下任一条件：媒体上传者、执行软删除者、相册 owner、任一相关相册中 `can_delete=true` 的成员。普通成员必须拒绝；不能仅复用当前不包含 `can_delete` 的 `canManageMedia`。**
- [ ] **Step 4: 单条、批量恢复和永久删除共用规则；同时修改 `/api/trash/photos/[id]`、`/api/trash/photos/[id]/restore`、`/api/photos/[id]/permanent-delete`、`/api/photos/[id]/restore` 及两个批量 Route，将权限、未找到、输入错误分别映射为 403、404、422，并保持统一错误 code。**
- [ ] **Step 5: 验证并提交**

```bash
npm run test:integration -- tests/trash-permissions.integration.test.ts tests/photo-library.integration.test.ts tests/album-permissions.integration.test.ts
git add lib/media/library.ts app/api/trash/photos/batch-delete/route.ts app/api/trash/photos/batch-restore/route.ts 'app/api/trash/photos/[id]/route.ts' 'app/api/trash/photos/[id]/restore/route.ts' 'app/api/photos/[id]/permanent-delete/route.ts' 'app/api/photos/[id]/restore/route.ts' tests/trash-permissions.integration.test.ts
git commit -m "fix: 统一回收站批量操作权限"
```

### Task 4：让清空回收站真实删除文件

**Files:**
- Modify: `lib/media/library.ts`
- Modify: `lib/photos/library.ts`
- Modify: `app/api/trash/photos/clear/route.ts`
- Modify: `components/photos/trash-gallery.tsx:131-146`
- Test: `tests/trash-permissions.integration.test.ts`
- Test: `tests/storage-audit.integration.test.ts`

- [ ] **Step 1: 写文件删除测试**：在临时存储根创建图片/视频三种变体；清空后记录和文件均消失、上传者额度正确减少、普通成员不能清空他人项目。
- [ ] **Step 2: 运行测试并确认当前路由只删除数据库记录。**
- [ ] **Step 3: 新增 `clearManageableTrash` 服务**：查询用户可管理项目；事务内删除记录并按 uploader 聚合扣减额度；事务后删除文件；返回 `{ cleared, fileCleanupFailures }`。
- [ ] **Step 4: Route 禁止直接操作 Prisma；文件清理失败时记录结构化日志并由存储审计发现。**
- [ ] **Step 5: 前端只有在零清理失败时显示“已永久删除”；否则提示需要巡检。**
- [ ] **Step 6: 验证并提交**

```bash
npm run test:integration -- tests/trash-permissions.integration.test.ts tests/storage-audit.integration.test.ts
git add lib/media/library.ts lib/photos/library.ts app/api/trash/photos/clear/route.ts components/photos/trash-gallery.tsx tests/trash-permissions.integration.test.ts tests/storage-audit.integration.test.ts
git commit -m "fix: 清空回收站时删除实际媒体文件"
```

### Task 5：消除公开分享 E2E 假通过

**Files:**
- Create: `tests/e2e/helpers/auth.ts`
- Create: `tests/e2e/helpers/media.ts`
- Modify: `tests/e2e/public-share.spec.ts`
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: 提取基于 `getByLabel`/`getByRole` 的注册助手。**
- [ ] **Step 2: 创建固定小 PNG fixture，通过页面上传并返回实际媒体 ID。**
- [ ] **Step 3: 删除两个 `no photos` 提前 return；每个分享用例自行创建媒体。**
- [ ] **Step 4: 验证匿名预览、撤销后三个文件变体失效、过期分享失效、关闭下载后 original 返回 403。**
- [ ] **Step 5: 验证输出不再包含 `No photos available` 并提交。**

```bash
npm run test:e2e -- tests/e2e/public-share.spec.ts
git add tests/e2e/helpers/auth.ts tests/e2e/helpers/media.ts tests/e2e/public-share.spec.ts tests/e2e/smoke.spec.ts
git commit -m "test: 为公开分享建立确定性媒体数据"
```

### Task 6：加固缓存、Range 和安全响应头

**Files:**
- Create: `lib/http/range.ts`
- Create: `lib/http/security-headers.ts`
- Create: `tests/media-security-headers.test.ts`
- Modify: `app/api/files/[variant]/[fileName]/route.ts:118-153`
- Modify: `lib/media/public-files.ts:69-111`
- Modify: `lib/albums/public-files.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: 为 Range 写失败测试**：正常、开放结尾、后缀范围、超界、NaN、多范围、终点小于起点。
- [ ] **Step 2: 实现 `parseSingleRange(header, fileSize)`；裁剪终点，无效请求统一返回 416 和 `Content-Range: bytes */<size>`。**
- [ ] **Step 3: 三类媒体文件服务复用解析器，禁止 `NaN` 进入 `createReadStream`。**
- [ ] **Step 4: 认证媒体的 200/206/416 都设置 `Cache-Control: private, no-store` 和 `X-Content-Type-Options: nosniff`。**
- [ ] **Step 5: 在 `next.config.ts` 配置 nosniff、Referrer Policy、DENY frame、Permissions Policy 和以 `default-src 'self'` 为基线的 CSP；不得使用无法解释的 `*`。**
- [ ] **Step 6: 验证并提交**

```bash
npm run test:unit -- tests/media-security-headers.test.ts
npm run test:integration -- tests/public-share-files.integration.test.ts
npm run build
git add lib/http tests/media-security-headers.test.ts 'app/api/files/[variant]/[fileName]/route.ts' lib/media/public-files.ts lib/albums/public-files.ts next.config.ts
git commit -m "fix: 加固私密媒体缓存与范围请求"
```

### Task 7：原子化上传额度预留

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_upload_reservations/migration.sql`
- Modify: `lib/media/upload.ts:121-305`
- Create: `lib/storage/reservations.ts`
- Create: `scripts/release-expired-upload-reservations.ts`
- Modify: `scripts/audit-storage-consistency.ts`
- Test: `tests/photo-upload.integration.test.ts`
- Test: `tests/storage-audit.integration.test.ts`

- [ ] **Step 1: 写并发测试**：额度只容纳一个文件时并行上传两个等大文件，恰好一个成功，最终 `storage_used=fileSize`、`storage_reserved=0`。
- [ ] **Step 2: 增加持久化预留模型和迁移。** `User` 增加 `storage_reserved BigInt @default(0)`；新增 `UploadReservation`，至少包含唯一 `id`（由客户端或服务端生成的 upload ID）、`user_id`、`reserved_size`、`status`（reserved/committed/released/expired）、`media_id?`、`created_at`、`updated_at`、`expires_at`。为 `(user_id, status, expires_at)` 建索引，并为 used、reserved、reserved_size 增加非负约束。
- [ ] **Step 3: 使用 PostgreSQL 原子条件 SQL 创建预留。** 在同一数据库事务中先插入唯一 upload ID 的预留记录，再用 `$executeRaw` 执行带字段算术条件的更新：`UPDATE "User" SET storage_reserved = storage_reserved + $size WHERE id = $userId AND storage_used + storage_reserved + $size <= storage_limit`。必须检查受影响行数恰好为 1；为 0 时回滚事务并返回空间不足。重复 upload ID 读取既有状态，不得重复占用额度。
- [ ] **Step 4: 实现幂等结算和释放。** 成功事务按 reservation ID 将 `reserved` 原子转为 `committed`，同时执行 `storage_reserved -= size, storage_used += size` 并绑定 `media_id`；失败按 ID 从 `reserved` 转为 `released` 并执行 `storage_reserved -= size`。只有状态从 `reserved` 成功迁移的调用才能修改额度，重复回调必须是无副作用成功。
- [ ] **Step 5: 实现超时回收。** `scripts/release-expired-upload-reservations.ts` 分批锁定 `status=reserved AND expires_at < now()` 的记录，使用 `FOR UPDATE SKIP LOCKED` 逐批标为 `expired` 并归还额度；脚本可重复运行。存储审计报告列出超时预留、used、reserved、媒体汇总差异，并验证用户聚合值等于所有 active reservation 汇总。
- [ ] **Step 6: 增加测试**：重复 upload ID、成功后重复结算、失败后重复释放、结算与过期回收竞争、超时批量回收、任意异常后 `storage_reserved` 回到正确值。
- [ ] **Step 7: 验证迁移、失败释放和并发场景后提交。**

```bash
npm run test:db:migrate
npm run test:integration -- tests/photo-upload.integration.test.ts tests/storage-audit.integration.test.ts
git add prisma lib/media/upload.ts lib/storage/reservations.ts scripts/release-expired-upload-reservations.ts scripts/audit-storage-consistency.ts tests/photo-upload.integration.test.ts tests/storage-audit.integration.test.ts
git commit -m "feat: 增加上传存储额度原子预留"
```

### Task 8：补齐媒体生命周期 E2E

**Files:**
- Create: `tests/e2e/media-lifecycle.spec.ts`
- Modify: `tests/e2e/helpers/media.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: 覆盖注册、上传、创建相册、添加照片、收藏、软删除、恢复、再次删除、永久删除及文件 404。**
- [ ] **Step 2: owner 邀请普通成员，验证 `can_upload=false`、`can_delete=false` 时 UI 和直接 API 请求都拒绝。**
- [ ] **Step 3: CI 设置两次重试、首次重试 trace、失败截图和视频；本地仍零重试。**
- [ ] **Step 4: 运行全部 E2E，确认无静默跳过后提交。**

```bash
npm run test:e2e
git add tests/e2e/media-lifecycle.spec.ts tests/e2e/helpers/media.ts playwright.config.ts
git commit -m "test: 覆盖媒体上传到永久删除主流程"
```

### Task 9：完善 Modal 和页面级可访问性

**Files:**
- Modify: `components/ui/modal.tsx:28-110`
- Modify: `components/layout/app-shell.tsx:19-74`
- Modify: `app/layout.tsx`
- Create: `app/error.tsx`
- Create: `app/loading.tsx`
- Create: `app/not-found.tsx`
- Create: `tests/e2e/accessibility.spec.ts`
- Test: `tests/modal.test.ts`

- [ ] **Step 1: 写测试**：打开后焦点进入弹窗，Tab/Shift+Tab 不离开，Escape 关闭，关闭后回到触发按钮。
- [ ] **Step 2: 用 dialog ref 和 previous focus ref 实现初始焦点、焦点陷阱和恢复。**
- [ ] **Step 3: AppShell 增加聚焦时显示的“跳到主要内容”，用唯一 `<main id="main-content" tabIndex={-1}>` 包裹内容。**
- [ ] **Step 4: RootLayout 增加基础 metadata；新增 loading、error、404 页面及返回入口。**
- [ ] **Step 5: 验证并提交。**

```bash
npm run test:unit -- tests/modal.test.ts
npm run test:e2e -- tests/e2e/accessibility.spec.ts
npm run build
git add components/ui/modal.tsx components/layout/app-shell.tsx app tests/modal.test.ts tests/e2e/accessibility.spec.ts
git commit -m "feat: 完善弹窗与页面键盘可访问性"
```

### Task 10：迁移测试配置并清理文档

**Files:**
- Modify: `vitest.config.ts`
- Delete: `vitest.workspace.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/superpowers/2026-07-10-photo-reliability-roadmap.md`
- Review/Delete if unintended: `pnpm-lock.yaml`
- Review/Delete if unintended: `pnpm-workspace.yaml`

- [ ] **Step 1: 将 unit/integration 项目迁入 `vitest.config.ts` 的 `test.projects`，保留 include、exclude、alias、串行和 setup 配置。**
- [ ] **Step 2: 运行两层测试并确认不再出现 workspace deprecated。**
- [ ] **Step 3: 以现有 README 和 CI 为准统一 npm：保留 `package-lock.json`，设置 `packageManager`；若 pnpm 文件不是明确迁移则删除。若决定迁移 pnpm，必须另行同步 CI、README 和所有命令。**
- [ ] **Step 4: 删除路线图第 63 行以后无关的 MSYS/funnydb 文本；把重复媒体、时间线、地图和回忆同步为已完成。**
- [ ] **Step 5: README 补充功能、环境、FFmpeg、测试数据库端口冲突、存储审计和 verify 说明。**
- [ ] **Step 6: 完整验证并提交。**

```bash
npm run verify
git diff --check
git add vitest.config.ts package.json package-lock.json README.md docs/superpowers/2026-07-10-photo-reliability-roadmap.md
git add -u -- vitest.workspace.ts
git commit -m "chore: 统一测试配置与项目文档"
```

## 四、发布门禁

P0 每个任务完成后：

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
```

P0 合并前：

```bash
npm run test:e2e
npm run build
npm run audit:storage
git diff --check
```

全部完成后：

```bash
npm run verify
```

验收要求：Lint 零错误零警告；单元/集成/E2E/构建全部通过；E2E 不得提前 return；无权限成员不能操作他人回收站媒体；清空同时处理数据库、额度和磁盘；失败上传不残留预留额度；私密媒体不可被公共缓存保存。

## 五、发布与回滚

1. 先发布 Task 1-5 的权限、回收站和真实 E2E 修复。
2. 再发布 Task 6 的无数据库结构安全修复。
3. Task 7 数据迁移单独发布，部署前备份数据库。
4. Task 8-10 最后合并。

Task 7 回滚前必须暂停新上传并结算或释放全部 `storage_reserved`；不得直接删除字段。权限修复不提供降低权限的回滚开关，兼容问题应修复调用方，不能恢复不安全行为。

## 六、完成定义

- P0 每个问题都有失败前和修复后测试证据。
- 回收站单条、批量和清空使用同一服务端权限矩阵。
- 添加照片不能跨越来源媒体访问边界。
- 目标无权限上传不产生任何持久化副作用。
- 分享 E2E 使用真实媒体并验证撤销后的文件不可访问。
- 并发上传不能突破存储额度。
- Modal 和页面满足基础键盘操作要求。
- npm、CI、README 与 lockfile 一致。
- `npm run verify` 在本地和 CI 可重复通过。
