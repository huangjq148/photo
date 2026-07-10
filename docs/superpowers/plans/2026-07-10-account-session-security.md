# 账号与会话安全 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为签名 Cookie Session 增加 7 天有效期和全局失效能力，并交付修改密码、退出所有设备和基础登录限流。

**Architecture:** Session 保持无状态 HMAC token，但 payload 加入版本、时间和用户 `session_version`。验证阶段读取用户记录比较版本；认证状态变更通过递增版本使旧 token 全部失效。登录限流通过可替换存储接口实现首期进程内版本。

**Tech Stack:** Next.js 15, TypeScript, Prisma, bcryptjs, Zod, Vitest, Playwright

---

## File Structure

| 文件 | 操作 | 职责 |
|---|---|---|
| `prisma/schema.prisma` | 修改 | 用户 Session 版本 |
| `prisma/migrations/*_add_session_version/migration.sql` | 新建 | 数据库迁移 |
| `lib/auth/session.ts` | 修改 | 新 payload 签发与验证 |
| `lib/auth/rate-limit.ts` | 新建 | 登录失败限流抽象 |
| `lib/users/auth.ts` | 修改 | 密码修改和版本递增 |
| `app/api/auth/change-password/route.ts` | 新建 | 修改密码 |
| `app/api/auth/logout-all/route.ts` | 新建 | 全部 Session 失效 |
| `app/account/security/page.tsx` | 新建 | 账号安全页 |
| `components/auth/security-form.tsx` | 新建 | 安全操作 UI |
| `tests/session.test.ts` | 修改 | token 安全测试 |
| `tests/account-security.integration.test.ts` | 新建 | 密码与失效测试 |

### Task 1: 升级 Session payload

**Files:**
- Modify: `lib/auth/session.ts`
- Modify: `tests/session.test.ts`

- [ ] **Step 1: 编写失败测试**

覆盖版本、签发时间、过期时间、7 天边界、篡改、格式缺失和旧 token 拒绝。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/session.test.ts`
Expected: FAIL because current payload only contains userId.

- [ ] **Step 3: 实现新 payload**

`createSessionToken` 接收 `userId`、`sessionVersion`、secret 和可注入当前时间；`verifySessionToken` 验证固定版本和 `expiresAt > now`。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/session.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/session.ts tests/session.test.ts
git commit -m "feat: add expiry to signed sessions"
```

### Task 2: 增加用户 Session 版本

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/*_add_session_version/migration.sql`
- Modify: `lib/auth/current-user.ts`
- Modify: `lib/users/auth.ts`
- Modify: `app/api/auth/login/route.ts`
- Modify: `app/api/auth/register/route.ts`

- [ ] **Step 1: 编写版本不匹配测试**

签发 version=1 token，数据库用户更新为 version=2 后，`getCurrentUserFromCookieStore` 应返回 null。

- [ ] **Step 2: 添加 `session_version` 字段和迁移**

字段为 `Int @default(1)`，迁移为现有用户填充 1 且非空。

- [ ] **Step 3: 更新签发和验证流程**

注册、登录使用数据库中的版本签发；读取用户后比较版本。Cookie 设置 `maxAge: 604800`。

- [ ] **Step 4: 运行认证测试**

Run: `npm test -- tests/session.test.ts tests/auth-navigation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add prisma lib/auth lib/users app/api/auth tests
git commit -m "feat: support global session invalidation"
```

### Task 3: 实现修改密码和退出全部设备

**Files:**
- Modify: `lib/auth/schemas.ts`
- Modify: `lib/users/auth.ts`
- Create: `app/api/auth/change-password/route.ts`
- Create: `app/api/auth/logout-all/route.ts`
- Create: `tests/account-security.integration.test.ts`

- [ ] **Step 1: 编写集成失败测试**

覆盖错误当前密码、新旧相同、弱密码、修改成功、其他 token 失效、当前设备获得新 token、退出全部设备。

- [ ] **Step 2: 实现修改密码事务**

验证当前哈希后更新新哈希并递增 `session_version`。接口使用新版本签发 Cookie，不返回 token 到 JSON。

- [ ] **Step 3: 实现退出全部设备**

递增版本并清除 Cookie。重复调用保持成功。

- [ ] **Step 4: 运行集成测试**

Run: `npm run test:integration -- tests/account-security.integration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth lib/users app/api/auth tests/account-security.integration.test.ts
git commit -m "feat: add password change and logout all"
```

### Task 4: 增加基础登录限流

**Files:**
- Create: `lib/auth/rate-limit.ts`
- Modify: `app/api/auth/login/route.ts`
- Create: `tests/login-rate-limit.test.ts`

- [ ] **Step 1: 编写可控时间的限流测试**

同一标准化邮箱与 IP 在 15 分钟内第 11 次失败返回阻止；成功登录清零；窗口后允许重试。

- [ ] **Step 2: 定义存储接口和内存实现**

接口提供 `recordFailure`、`isBlocked`、`clear`。Map 条目携带窗口结束时间，并在访问时清理过期项。

- [ ] **Step 3: 接入登录接口**

阻止时返回 429、稳定错误 code 和 `Retry-After`；登录失败保持统一文案。

- [ ] **Step 4: 运行测试**

Run: `npm test -- tests/login-rate-limit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/rate-limit.ts app/api/auth/login/route.ts tests/login-rate-limit.test.ts
git commit -m "feat: rate limit repeated login failures"
```

### Task 5: 增加账号安全页面

**Files:**
- Create: `app/account/security/page.tsx`
- Create: `components/auth/security-form.tsx`
- Modify: `components/layout/user-menu.tsx`
- Create: `tests/security-form.test.ts`
- Create: `tests/e2e/account-security.spec.ts`

- [ ] **Step 1: 编写组件测试**

覆盖 label、autocomplete、提交状态、两次密码不一致、服务端错误和成功提示。

- [ ] **Step 2: 实现安全页和表单**

页面需要登录。修改成功清空输入；退出所有设备需要确认并跳转登录页。

- [ ] **Step 3: 更新用户菜单**

增加“账号安全”链接，不改变现有退出登录行为。

- [ ] **Step 4: 编写并运行 E2E**

在两个浏览器 context 登录同一用户，修改密码后验证另一个 context 失效，新密码可登录。

Run: `npm run test:e2e -- tests/e2e/account-security.spec.ts`
Expected: PASS.

- [ ] **Step 5: 完整验证并提交**

Run: `npm run verify`
Expected: all checks pass.

```bash
git add app/account components/auth components/layout tests
git commit -m "feat: add account security settings"
```
