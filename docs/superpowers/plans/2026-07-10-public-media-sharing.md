# 公开媒体分享 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让匿名访客安全访问有效分享中的图片和视频，并让分享创建者管理链接有效期和撤销状态。

**Architecture:** 分享 token 是匿名访问的唯一授权凭据。公开页面和文件接口共用集中校验服务；登录态文件接口保持不变。分享管理接口按创建者过滤，公开文件服务自行处理图片和视频 Range。

**Tech Stack:** Next.js 15 Route Handlers, React 19, TypeScript, Prisma, Node streams, Vitest, Playwright

---

## File Structure

| 文件 | 操作 | 职责 |
|---|---|---|
| `lib/media/shares.ts` | 修改 | 分享创建、查询、撤销和公开授权 |
| `lib/media/public-files.ts` | 新建 | token 文件定位与流式响应 |
| `app/api/photos/[id]/shares/route.ts` | 新建 | 创建和列出分享 |
| `app/api/shares/[shareId]/route.ts` | 新建 | 撤销分享 |
| `app/api/shares/[token]/files/[variant]/route.ts` | 新建 | 匿名媒体读取 |
| `app/share/[token]/page.tsx` | 修改 | 使用公开文件 URL |
| `components/share/share-manager.tsx` | 新建 | 有效期、复制和撤销 UI |
| `components/photos/photo-gallery.tsx` | 修改 | 打开分享管理器 |
| `tests/photo-shares.integration.test.ts` | 修改 | 分享状态和权限测试 |
| `tests/e2e/public-share.spec.ts` | 新建 | 匿名访问验收 |

### Task 1: 固化分享领域行为

**Files:**
- Modify: `lib/media/shares.ts`
- Modify: `tests/photo-shares.integration.test.ts`

- [ ] **Step 1: 编写失败测试**

覆盖有效期白名单、只列出当前创建者记录、撤销幂等、过期/撤销/删除媒体拒绝访问。

- [ ] **Step 2: 运行目标测试确认失败**

Run: `npm run test:integration -- tests/photo-shares.integration.test.ts`
Expected: FAIL because list/revoke and expiry validation are missing.

- [ ] **Step 3: 实现领域函数**

增加 `listPhotoShares`、`revokePhotoShare`、`resolvePublicShare`。创建只接受 `null | 24 | 168`，所有管理操作检查 `created_by`。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm run test:integration -- tests/photo-shares.integration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/media/shares.ts tests/photo-shares.integration.test.ts
git commit -m "feat: add manageable expiring media shares"
```

### Task 2: 实现公开文件服务

**Files:**
- Create: `lib/media/public-files.ts`
- Create: `app/api/shares/[token]/files/[variant]/route.ts`
- Test: `tests/public-share-files.integration.test.ts`

- [ ] **Step 1: 编写匿名文件访问测试**

覆盖 thumbnail、preview、original、非法 variant、无效 token、目录穿越输入、视频正常请求和 Range 请求。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test:integration -- tests/public-share-files.integration.test.ts`
Expected: FAIL with route/helper missing.

- [ ] **Step 3: 实现安全文件定位**

根据 `resolvePublicShare` 返回的数据库记录和 variant 选择受控目录、文件名与 MIME，不直接使用请求参数拼接磁盘路径。

- [ ] **Step 4: 实现 Range 响应**

无 Range 返回 200；合法 Range 返回 206 和 `Content-Range`；超界返回 416。所有响应设置 `Cache-Control: private, no-store`。

- [ ] **Step 5: 运行测试确认通过**

Run: `npm run test:integration -- tests/public-share-files.integration.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/media/public-files.ts app/api/shares tests/public-share-files.integration.test.ts
git commit -m "fix: serve shared media through token authorization"
```

### Task 3: 增加分享管理 API

**Files:**
- Create: `app/api/photos/[id]/shares/route.ts`
- Create: `app/api/shares/[shareId]/route.ts`
- Modify: `app/api/photos/[id]/share/route.ts`

- [ ] **Step 1: 编写 Route Handler 测试**

断言未登录 401、非法有效期 422、非创建者 403、列表只返回自己的分享、重复撤销成功。

- [ ] **Step 2: 实现 GET/POST/DELETE**

响应统一使用 `{ data }` 或 `{ error, code, issues? }`。旧单数 `/share` POST 暂时调用新服务并标记弃用，避免现有 UI 在同一提交中中断。

- [ ] **Step 3: 验证 API 测试**

Run: `npm run test:integration -- tests/photo-share-routes.integration.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/photos app/api/shares tests/photo-share-routes.integration.test.ts
git commit -m "feat: expose media share management api"
```

### Task 4: 接入分享页和管理 UI

**Files:**
- Modify: `app/share/[token]/page.tsx`
- Create: `components/share/share-manager.tsx`
- Modify: `components/photos/photo-gallery.tsx`
- Modify: `components/photos/photo-gallery-card.tsx`

- [ ] **Step 1: 编写组件测试**

覆盖默认 7 天、选择永久/24 小时、复制成功、撤销后列表更新和错误提示。

- [ ] **Step 2: 更新匿名分享页 URL**

页面只向客户端传递 `/api/shares/:token/files/...` 地址，下载按钮使用 original 变体。

- [ ] **Step 3: 实现 ShareManager**

弹窗创建分享、加载当前用户记录、展示过期时间、复制和撤销；操作期间禁用重复提交并通过 `aria-live` 反馈结果。

- [ ] **Step 4: 移除旧的一键永久分享调用**

照片卡片的分享动作改为打开管理器。确认无调用后删除旧 `/api/photos/:id/share` 路由。

- [ ] **Step 5: 运行组件测试**

Run: `npm test -- tests/share-manager.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/share components/share components/photos app/api/photos
git commit -m "feat: add media share management experience"
```

### Task 5: 匿名端到端验收

**Files:**
- Create: `tests/e2e/public-share.spec.ts`

- [ ] **Step 1: 编写浏览器测试**

登录用户上传图片并创建链接；新无痕 context 不带 Cookie 打开、预览和下载；撤销后刷新显示失效。另用视频 fixture 验证播放与 seek。

- [ ] **Step 2: 运行 E2E**

Run: `npm run test:e2e -- tests/e2e/public-share.spec.ts`
Expected: PASS in Chromium.

- [ ] **Step 3: 完整验证**

Run: `npm run verify`
Expected: all checks pass.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/public-share.spec.ts
git commit -m "test: cover anonymous media sharing"
```
