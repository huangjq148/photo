# Admin 图片与存储文件管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为后台新增受管理员密码保护的图片总览、文件扫描列表、引用次数展示和未引用文件永久删除能力。

**Architecture:** 复用现有 Prisma、会话 Cookie 和存储路径工具，新增一套独立的 `/admin` 路由组与后台壳。服务端负责鉴权、分页查询、引用计数与路径安全校验，客户端只负责表格、搜索、排序、预览和删除确认。文件删除前会再次复核数据库引用次数并验证目标路径仍在 `data` 根目录内。

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, Zod, Vitest

---

## File Structure

| 文件 | 操作 | 职责 |
|---|---|---|
| `lib/env.ts` | 修改 | 增加 `ADMIN_PASSWORD` 配置 |
| `lib/auth/admin-session.ts` | 新建 | 管理员会话 token、Cookie 和鉴权 |
| `lib/auth/admin-rate-limit.ts` | 新建 | 管理员登录限流 |
| `lib/admin/reference-counts.ts` | 新建 | 图片/文件引用次数计算与文件路径归一化 |
| `lib/admin/file-tree.ts` | 新建 | `data` 目录递归扫描与安全路径校验 |
| `app/api/admin/login/route.ts` | 新建 | 管理员登录 |
| `app/api/admin/logout/route.ts` | 新建 | 管理员退出 |
| `app/api/admin/photos/route.ts` | 新建 | 图片分页、搜索、排序 |
| `app/api/admin/files/route.ts` | 新建 | 文件分页、搜索、排序 |
| `app/api/admin/files/[...path]/route.ts` | 新建 | 管理员文件永久删除 |
| `app/admin/layout.tsx` | 新建 | 后台独立布局与侧栏 |
| `app/admin/page.tsx` | 新建 | `/admin` 跳转 |
| `app/admin/login/page.tsx` | 新建 | 登录页 |
| `app/admin/photos/page.tsx` | 新建 | 图片管理页 |
| `app/admin/files/page.tsx` | 新建 | 文件管理页 |
| `components/admin/**` | 新建 | 后台表格、筛选、预览、确认弹窗 |
| `tests/admin-*.test.ts` | 新建 | 鉴权、引用次数、路径安全和路由契约测试 |

### Task 1: 先锁定后台的核心规则

**Files:**
- Modify: `lib/env.ts`
- Create: `lib/auth/admin-session.ts`
- Create: `lib/auth/admin-rate-limit.ts`
- Create: `lib/admin/reference-counts.ts`
- Create: `lib/admin/file-tree.ts`
- Create: `tests/admin-session.test.ts`
- Create: `tests/admin-reference-counts.test.ts`
- Create: `tests/admin-file-tree.test.ts`

- [ ] **Step 1: 写失败测试**

覆盖 `ADMIN_PASSWORD` 默认值、管理员 session Cookie、登录限流阈值、图片引用次数汇总、文件路径越界拒绝、符号链接与目录拒绝。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/admin-session.test.ts tests/admin-reference-counts.test.ts tests/admin-file-tree.test.ts`
Expected: FAIL because new modules do not exist yet.

- [ ] **Step 3: 实现最小逻辑**

先把管理员会话和鉴权封装成独立 helper，再实现引用次数与文件扫描纯函数，保证后续 route 只做薄层调用。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/admin-session.test.ts tests/admin-reference-counts.test.ts tests/admin-file-tree.test.ts`
Expected: PASS.

### Task 2: 实现后台 API

**Files:**
- Create: `app/api/admin/login/route.ts`
- Create: `app/api/admin/logout/route.ts`
- Create: `app/api/admin/photos/route.ts`
- Create: `app/api/admin/files/route.ts`
- Create: `app/api/admin/files/[...path]/route.ts`
- Create: `tests/admin-login-route.test.ts`
- Create: `tests/admin-photos-route.test.ts`
- Create: `tests/admin-files-route.test.ts`

- [ ] **Step 1: 写失败测试**

覆盖未登录拒绝、密码错误、登录成功后 cookie 设置、图片列表分页排序、文件列表分页排序、被引用文件不可删、删除前二次复核。

- [ ] **Step 2: 实现 route handler**

所有 `/api/admin/**` 先做管理员鉴权，再执行查询或删除；删除接口只接受规范化后的相对路径并再次检查引用次数。

- [ ] **Step 3: 运行测试并修复**

Run: `npm test -- tests/admin-login-route.test.ts tests/admin-photos-route.test.ts tests/admin-files-route.test.ts`
Expected: PASS.

### Task 3: 搭建后台页面

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/photos/page.tsx`
- Create: `app/admin/files/page.tsx`
- Create: `components/admin/admin-shell.tsx`
- Create: `components/admin/admin-login-form.tsx`
- Create: `components/admin/admin-photo-table.tsx`
- Create: `components/admin/admin-file-table.tsx`
- Create: `components/admin/admin-image-preview.tsx`
- Create: `components/admin/admin-delete-confirmation.tsx`
- Create: `tests/admin-pages.test.ts`

- [ ] **Step 1: 写失败测试**

覆盖 `/admin` 跳转、登录页聚焦、照片页/文件页的初始加载态、空态、预览关闭、删除按钮禁用态。

- [ ] **Step 2: 实现后台壳与页面**

独立侧栏、顶部操作、桌面优先布局，复用现有 `Modal` 和 `Message` 组件风格，但不接入公开站点导航。

- [ ] **Step 3: 运行测试并修复**

Run: `npm test -- tests/admin-pages.test.ts`
Expected: PASS.

### Task 4: 端到端验证

**Files:**
- Modify: 以上新建文件按需修正
- Create: `tests/e2e/admin-smoke.spec.ts`

- [ ] **Step 1: 编写烟囱测试**

覆盖登录、查看图片列表、查看文件列表和删除未引用文件的关键路径。

- [ ] **Step 2: 跑定向测试**

Run: `npm run test:unit`
Run: `npm run test:integration -- tests/admin-*.integration.test.ts`
Run: `npm run test:e2e -- tests/e2e/admin-smoke.spec.ts`

- [ ] **Step 3: 最终修复与提交**

确保 `npm run build` 通过后再考虑提交。
