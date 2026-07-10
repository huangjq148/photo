# 媒体库可靠性与遗留清理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一媒体、收藏和回收站分页筛选体验，提供可靠清空能力，并安全移除废弃 Space 模型与路由。

**Architecture:** 列表查询使用统一 schema 和 `PageResult`，UI 共享加载更多状态模型。领域错误改为稳定 code。Space 清理分成只读迁移审计和删除迁移两个步骤，审计不通过时禁止执行删除。

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, Zod, Vitest, Playwright, ESLint

---

## File Structure

| 文件 | 操作 | 职责 |
|---|---|---|
| `lib/api/errors.ts` | 新建 | 领域错误和 HTTP 映射 |
| `lib/media/query-schema.ts` | 新建 | 分页、筛选和排序校验 |
| `lib/media/library.ts` | 修改 | 收藏、回收站和媒体查询 |
| `app/api/favorites/route.ts` | 修改 | 分页收藏 |
| `app/api/trash/photos/route.ts` | 修改 | 分页回收站 |
| `app/api/trash/photos/clear/route.ts` | 新建 | 清空回收站 |
| `components/photos/favorites-gallery.tsx` | 修改 | 分页和加载更多 |
| `components/photos/trash-gallery.tsx` | 修改 | 分页、保留期和清空 |
| `components/photos/photo-gallery.tsx` | 修改 | 筛选和排序 |
| `scripts/audit-space-migration.ts` | 新建 | 旧数据只读审计 |
| `prisma/schema.prisma` | 修改 | 删除废弃 Space 模型 |
| `app/spaces/**`、`app/api/spaces/**` | 删除 | 移除兼容路由 |

### Task 1: 建立统一查询和错误契约

**Files:**
- Create: `lib/api/errors.ts`
- Create: `lib/media/query-schema.ts`
- Create: `tests/media-query-schema.test.ts`
- Create: `tests/api-errors.test.ts`

- [ ] **Step 1: 编写失败测试**

覆盖分页上下界、媒体类型、日期、排序字段、排序方向，以及领域错误到 400/401/403/404/409/422 的映射。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/media-query-schema.test.ts tests/api-errors.test.ts`
Expected: FAIL because modules are missing.

- [ ] **Step 3: 实现 Zod 查询 schema**

默认 `page=1`、`pageSize=24`，最大 50；日期要求合法 ISO 日期；不识别的枚举返回 422 issues。

- [ ] **Step 4: 实现领域错误**

定义 `AppError(code, message, status, issues?)` 和统一 `toErrorResponse`，后续路由不再检查错误文案。

- [ ] **Step 5: 运行测试并提交**

Run: `npm test -- tests/media-query-schema.test.ts tests/api-errors.test.ts`
Expected: PASS.

```bash
git add lib/api lib/media/query-schema.ts tests/media-query-schema.test.ts tests/api-errors.test.ts
git commit -m "refactor: add stable media query and error contracts"
```

### Task 2: 完成相册媒体筛选和排序

**Files:**
- Modify: `lib/albums/library.ts`
- Modify: `app/api/albums/[id]/photos/route.ts`
- Modify: `components/photos/photo-gallery.tsx`
- Create: `components/photos/photo-filter-bar.tsx`
- Create: `tests/media-filters.integration.test.ts`

- [ ] **Step 1: 编写查询失败测试**

覆盖 keyword、image/video、uploader、日期区间和四种排序，验证翻页无重复且顺序稳定。

- [ ] **Step 2: 扩展服务和路由**

使用经过 schema 校验的参数构建 Prisma where/orderBy；相同排序值时追加稳定 `id` 排序。

- [ ] **Step 3: 实现筛选栏**

筛选变化重置第一页并使用 AbortController 取消旧请求。移动端使用现有 Modal，桌面显示紧凑工具栏。

- [ ] **Step 4: 运行测试**

Run: `npm run test:integration -- tests/media-filters.integration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/albums app/api/albums components/photos tests/media-filters.integration.test.ts
git commit -m "feat: add media filtering and stable sorting"
```

### Task 3: 分页收藏

**Files:**
- Modify: `lib/media/library.ts`
- Modify: `app/api/favorites/route.ts`
- Modify: `components/photos/favorites-gallery.tsx`
- Create: `tests/favorites-pagination.integration.test.ts`

- [ ] **Step 1: 编写 30 条收藏分页测试**

断言第一页 24 条、第二页 6 条、无重复、按收藏时间倒序、已删除媒体不显示。

- [ ] **Step 2: 实现 PageResult 查询和 API**

路由统一返回 `{ data: { items, page, pageSize, total } }`。

- [ ] **Step 3: 更新收藏 UI**

增加加载更多和加载状态；取消收藏后维护 total，并在当前页不足时补载下一条。

- [ ] **Step 4: 验证并提交**

Run: `npm run test:integration -- tests/favorites-pagination.integration.test.ts`
Expected: PASS.

```bash
git add lib/media/library.ts app/api/favorites components/photos/favorites-gallery.tsx tests/favorites-pagination.integration.test.ts
git commit -m "feat: paginate favorite media"
```

### Task 4: 完善回收站

**Files:**
- Modify: `lib/media/library.ts`
- Modify: `app/api/trash/photos/route.ts`
- Create: `app/api/trash/photos/clear/route.ts`
- Modify: `components/photos/trash-gallery.tsx`
- Create: `tests/trash-pagination.integration.test.ts`
- Create: `tests/trash-clear.integration.test.ts`

- [ ] **Step 1: 编写分页与清空失败测试**

覆盖超过 24 条、跨用户隔离、批量清空、存储扣减、文件不存在时幂等清理和数据库失败时不先删文件。

- [ ] **Step 2: 实现分页和清空服务**

先在事务中删除数据库记录并更新各上传者存储计数，再尽力删除文件；文件清理失败记录错误但不恢复已提交数据库事务。

- [ ] **Step 3: 更新回收站 UI**

增加剩余天数、加载更多和“清空回收站”二次确认。无限滚动保留显式加载按钮作为无障碍后备。

- [ ] **Step 4: 运行测试并提交**

Run: `npm run test:integration -- tests/trash-pagination.integration.test.ts tests/trash-clear.integration.test.ts`
Expected: PASS.

```bash
git add lib/media/library.ts app/api/trash components/photos/trash-gallery.tsx tests/trash-*.integration.test.ts
git commit -m "feat: complete paginated trash management"
```

### Task 5: 迁移现有路由到稳定错误 code

**Files:**
- Modify: `app/api/albums/**/route.ts`
- Modify: `app/api/photos/**/route.ts`
- Modify: `app/api/trash/**/route.ts`
- Modify: `lib/albums/library.ts`
- Modify: `lib/media/library.ts`

- [ ] **Step 1: 为权限和不存在场景增加路由测试**

断言错误响应包含稳定 code，且状态码不再依赖消息语言。

- [ ] **Step 2: 将领域服务改为抛出 AppError**

优先迁移本计划涉及的相册、媒体、收藏和回收站服务，再机械替换 Route Handler catch。

- [ ] **Step 3: 搜索残留字符串判断**

Run: `rg -n "message\.includes|message ===" app/api lib`
Expected: no status mapping based on error message remains.

- [ ] **Step 4: 运行 API 回归并提交**

Run: `npm run test:integration`
Expected: PASS.

```bash
git add app/api lib tests
git commit -m "refactor: use stable api error codes"
```

### Task 6: 安全移除 Space 遗留模型

**Files:**
- Create: `scripts/audit-space-migration.ts`
- Create: `tests/space-migration-audit.integration.test.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/*_remove_deprecated_spaces/migration.sql`
- Delete: `app/spaces/**`
- Delete: `app/api/spaces/**`
- Delete: `lib/spaces/**`

- [ ] **Step 1: 编写审计脚本测试**

存在未映射 Space、成员或邀请时退出 1 并打印数量；全部迁移时退出 0。脚本只读，不修改数据。

- [ ] **Step 2: 在目标数据库运行审计**

Run: `dotenv -e .env.local -- tsx scripts/audit-space-migration.ts`
Expected: `Safe to remove deprecated Space tables`. 若失败，停止本任务并先制定数据回填方案。

- [ ] **Step 3: 删除代码和 Prisma 模型**

移除所有 Space 页面、API、库、模型和枚举；创建显式 DROP migration。不得手工编辑已有迁移。

- [ ] **Step 4: 搜索残留引用**

Run: `rg -n "Space(Member|Invite|Role|Type)?|/spaces|api/spaces" app components lib prisma/schema.prisma tests`
Expected: no deprecated runtime references.

- [ ] **Step 5: 完整验证**

Run: `npm run verify`
Expected: all checks pass and build route table has no `/spaces` routes.

- [ ] **Step 6: Commit**

```bash
git add scripts tests prisma app lib components
git commit -m "refactor: remove deprecated space model"
```
