# 相册权限与邀请 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一相册 owner/member 权限边界，并实现支持未注册用户、过期、撤销和重新发送的邀请闭环。

**Architecture:** 所有权限判断集中在 `lib/membership.ts`，领域服务不再仅依赖 UI 隐藏按钮。邀请始终先创建 `AlbumInvite`，接受时使用数据库事务和唯一约束保证幂等。

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma, Zod, Vitest, Playwright

---

## File Structure

| 文件 | 操作 | 职责 |
|---|---|---|
| `lib/membership.ts` | 修改 | 统一相册权限守卫 |
| `lib/albums/library.ts` | 修改 | 邀请状态和成员事务 |
| `lib/albums/invite-status.ts` | 新建 | 邀请状态常量与转换 |
| `app/api/albums/[id]/invites/route.ts` | 修改 | 列表与创建邀请 |
| `app/api/albums/[id]/invites/[inviteId]/route.ts` | 新建 | 撤销邀请 |
| `app/api/albums/[id]/invites/[inviteId]/resend/route.ts` | 新建 | 重新生成邀请 |
| `app/invitations/[token]/page.tsx` | 新建 | 邀请确认页 |
| `components/albums/album-invite-form.tsx` | 修改 | 创建邀请 UI |
| `components/albums/album-invite-list.tsx` | 新建 | pending 邀请管理 |
| `tests/album-permissions.integration.test.ts` | 新建 | 权限矩阵测试 |
| `tests/album-invites.integration.test.ts` | 新建 | 邀请生命周期测试 |

### Task 1: 固化权限矩阵

**Files:**
- Modify: `lib/membership.ts`
- Modify: `lib/albums/library.ts`
- Create: `tests/album-permissions.integration.test.ts`

- [ ] **Step 1: 编写权限矩阵失败测试**

为 owner、普通 member、可上传 member、可删除 member 覆盖查看、上传、删除、编辑资料、设置封面、邀请和成员管理。

- [ ] **Step 2: 运行测试确认当前越权行为**

Run: `npm run test:integration -- tests/album-permissions.integration.test.ts`
Expected: FAIL，普通成员当前可编辑资料、设置封面或添加成员。

- [ ] **Step 3: 增加集中权限守卫**

保留 `assertAlbumMembership`、`assertCanUpload`、`assertCanDelete`；相册资料、封面、邀请和成员管理统一调用 `assertAlbumOwner`。

- [ ] **Step 4: 修改领域服务调用点**

更新 `updateAlbum`、`setAlbumCover`、邀请查询/创建和直接成员写操作。删除不再使用的 `addAlbumMemberByEmail` 公共入口。

- [ ] **Step 5: 验证权限测试**

Run: `npm run test:integration -- tests/album-permissions.integration.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/membership.ts lib/albums/library.ts tests/album-permissions.integration.test.ts
git commit -m "fix: enforce album permission matrix"
```

### Task 2: 完成邀请生命周期服务

**Files:**
- Create: `lib/albums/invite-status.ts`
- Modify: `lib/albums/library.ts`
- Create: `tests/album-invites.integration.test.ts`

- [ ] **Step 1: 编写生命周期失败测试**

覆盖未注册邮箱、重复 pending、错误邮箱、过期、撤销、重新发送、重复接受和并发接受。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test:integration -- tests/album-invites.integration.test.ts`
Expected: FAIL because revoke/resend/idempotency are missing.

- [ ] **Step 3: 集中邀请状态**

定义 `pending | accepted | expired | revoked`，所有写入和比较通过常量完成。空邮箱或非法邮箱在写数据库前返回验证错误。

- [ ] **Step 4: 实现创建、撤销和重新发送**

创建默认 7 天有效；撤销只处理 pending；重新发送在一个事务中将旧记录标记为 expired 并创建新 token。

- [ ] **Step 5: 实现幂等接受**

事务内确认 token、邮箱、有效期和成员唯一性。已存在相同成员时返回 `{ albumId, alreadyMember: true }` 并关闭邀请。

- [ ] **Step 6: 运行测试确认通过**

Run: `npm run test:integration -- tests/album-invites.integration.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/albums tests/album-invites.integration.test.ts
git commit -m "feat: complete album invitation lifecycle"
```

### Task 3: 暴露邀请管理 API

**Files:**
- Modify: `app/api/albums/[id]/invites/route.ts`
- Create: `app/api/albums/[id]/invites/[inviteId]/route.ts`
- Create: `app/api/albums/[id]/invites/[inviteId]/resend/route.ts`
- Modify: `app/api/album-invites/[token]/accept/route.ts`

- [ ] **Step 1: 编写 Route Handler 测试**

断言未登录 401、member 403、重复邀请 409、非法邮箱 422、资源不存在 404、幂等接受 200。

- [ ] **Step 2: 实现 GET/POST/DELETE/resend/accept**

所有接口调用领域服务，不在 Route Handler 复制权限和状态逻辑。错误返回稳定 `code`。

- [ ] **Step 3: 运行接口测试**

Run: `npm run test:integration -- tests/album-invite-routes.integration.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/albums app/api/album-invites tests/album-invite-routes.integration.test.ts
git commit -m "feat: expose album invitation management api"
```

### Task 4: 实现邀请管理界面

**Files:**
- Modify: `components/albums/album-invite-form.tsx`
- Create: `components/albums/album-invite-list.tsx`
- Modify: `components/albums/album-management-modal.tsx`

- [ ] **Step 1: 编写组件失败测试**

覆盖 owner 可见、member 隐藏、创建后显示 pending、复制、撤销、重新发送和错误播报。

- [ ] **Step 2: 修改邀请表单**

文案从“添加成员”改为“邀请成员”，允许未注册邮箱，成功提示包含有效期。

- [ ] **Step 3: 实现邀请列表**

显示邮箱、状态、创建/过期时间和操作按钮。重新发送后替换旧链接；撤销后保留历史状态但禁用操作。

- [ ] **Step 4: 按角色渲染管理区**

owner 显示邀请和权限编辑；member 只显示成员列表和退出按钮。不能仅依靠此处承担安全控制。

- [ ] **Step 5: 运行组件测试**

Run: `npm test -- tests/album-invite-form.test.ts tests/album-invite-list.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/albums tests/album-invite-form.test.ts tests/album-invite-list.test.ts
git commit -m "feat: add album invitation management ui"
```

### Task 5: 实现邀请落地与回跳

**Files:**
- Create: `app/invitations/[token]/page.tsx`
- Create: `components/albums/invitation-acceptance.tsx`
- Modify: `lib/auth/redirects.ts`
- Modify: `components/auth/login-form.tsx`
- Modify: `components/auth/register-form.tsx`
- Create: `tests/e2e/album-invitation.spec.ts`

- [ ] **Step 1: 编写 E2E**

覆盖已注册用户接受、未注册用户注册后返回、邮箱不匹配、过期、撤销和重复接受。

- [ ] **Step 2: 实现安全回跳**

只允许站内相对路径作为 `next`，登录或注册成功后返回邀请页，防止开放重定向。

- [ ] **Step 3: 实现确认页**

展示相册、邀请人和脱敏邮箱；用户点击接受后进入相册，不自动接受。

- [ ] **Step 4: 运行 E2E 和完整验证**

Run: `npm run test:e2e -- tests/e2e/album-invitation.spec.ts`
Expected: PASS.

Run: `npm run verify`
Expected: all checks pass.

- [ ] **Step 5: Commit**

```bash
git add app/invitations components/albums lib/auth components/auth tests/e2e/album-invitation.spec.ts
git commit -m "feat: complete album invitation acceptance flow"
```
