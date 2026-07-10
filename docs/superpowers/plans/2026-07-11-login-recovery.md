# 登录恢复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 安全同步开发数据库结构，恢复登录，并让登录接口正确区分无效凭据与服务端故障。

**Architecture:** 认证领域使用现有 `AppError` 表达稳定的 `INVALID_CREDENTIALS`；路由通过可注入的处理器隔离认证函数、限流器和日志器，以便确定性测试。迁移前先确认目标数据库及废弃 Space 表为空，只有审计通过才部署全部待执行迁移。

**Tech Stack:** Next.js 15 Route Handlers, TypeScript, Prisma 6, PostgreSQL, Vitest, bcryptjs

---

## File Structure

| 文件 | 操作 | 职责 |
|---|---|---|
| `lib/users/auth.ts` | 修改 | 为不存在用户和错误密码抛出同一稳定领域错误 |
| `lib/auth/login-handler.ts` | 新建 | 提供可注入登录处理器，区分 401 与 500，控制限流、日志和 Cookie |
| `app/api/auth/login/route.ts` | 修改 | 仅装配生产依赖并导出 Next.js 支持的 `POST` |
| `tests/login-user.test.ts` | 新建 | 覆盖认证领域的不存在用户与错误密码等价行为 |
| `tests/login-route.test.ts` | 新建 | 覆盖路由错误响应、限流副作用、日志及 Cookie |
| `tests/login.integration.test.ts` | 新建 | 使用真实 PostgreSQL、bcrypt 用户和生产 `POST` 验证登录 Cookie |
| `.env.test` | 修改 | 提供满足最小长度且仅用于测试的会话密钥 |
| `vitest.config.ts` | 修改 | 与 `.env.test` 保持相同的合规测试密钥 |

### Task 1: 安全审计并同步开发数据库

**Files:**
- Read: `.env.local`
- Read: `prisma/migrations/20260710150000_add_session_version/migration.sql`
- Read: `prisma/migrations/20260710160000_remove_deprecated_spaces/migration.sql`

- [ ] **Step 1: 检查开发数据库连通性**

```bash
pg_isready -h 127.0.0.1 -p 6000 -d photo_management
```

Expected: `accepting connections`。若沙箱阻止本机网络访问，则申请权限后原样重试；若仍不可达，停止并启动/修复实际开发数据库。不得用 `npm run test:db:up` 替代，因为该命令创建的是同端口的 `photo_management_test`，可能与开发数据库冲突。

- [ ] **Step 2: 确认迁移目标与待执行迁移**

运行脱敏的目标检查和迁移状态：

```bash
node --env-file=.env.local -e 'const u=new URL(process.env.DATABASE_URL); console.log({host:u.hostname,port:u.port,database:u.pathname.slice(1),schema:u.searchParams.get("schema")})'
node --env-file=.env.local node_modules/prisma/build/index.js migrate status
```

Expected: 目标为明确的本地开发数据库；待执行迁移包含 `20260710150000_add_session_version` 与 `20260710160000_remove_deprecated_spaces`。若数据库身份不符合预期，立即停止。

- [ ] **Step 3: 只读审计废弃表**

使用 Prisma 原始查询检查表是否存在并读取准确行数，不输出连接密码：

```bash
node --env-file=.env.local -e 'const {PrismaClient}=require("@prisma/client"); const p=new PrismaClient(); (async()=>{for(const table of ["Space","SpaceMember","SpaceInvite"]){const exists=await p.$queryRawUnsafe(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2) AS exists`, "public", table); if(!exists[0].exists) throw new Error(`${table} is missing before cleanup migration`); const rows=await p.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "${table}"`); console.log(`${table}: ${rows[0].count}`); if(rows[0].count!==0) process.exitCode=2;}})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>p.$disconnect())'
```

Expected: 三张表都存在且计数均为 `0`。任一非零、缺表或查询失败时停止，不执行部署，并先备份/回填数据。

- [ ] **Step 4: 部署迁移并复查**

```bash
node --env-file=.env.local node_modules/prisma/build/index.js migrate deploy
node --env-file=.env.local node_modules/prisma/build/index.js migrate status
```

Expected: deploy 成功；status 输出 `Database schema is up to date!`。

- [ ] **Step 5: 验证登录所需字段可查询**

```bash
node --env-file=.env.local -e 'const {PrismaClient}=require("@prisma/client"); const p=new PrismaClient(); p.user.findFirst({select:{id:true,session_version:true}}).then(row=>console.log({querySucceeded:true,hasUser:Boolean(row)})).catch(e=>{console.error(e);process.exitCode=1}).finally(()=>p.$disconnect())'
```

Expected: 输出 `querySucceeded: true`，不再出现缺少 `session_version` 的 Prisma 错误。

### Task 2: 先用失败测试锁定全部登录错误契约

**Files:**
- Create: `tests/login-user.test.ts`
- Create: `tests/login-route.test.ts`

- [ ] **Step 1: 编写领域层失败测试**

在 `tests/login-user.test.ts` 使用最小 Prisma stub：不存在用户时 `findUnique` 返回 `null`；错误密码场景返回带真实 bcrypt hash 的用户对象。两个测试都断言：

```ts
await expect(loginUser(prisma, env, input)).rejects.toMatchObject({
  name: "AppError",
  code: "INVALID_CREDENTIALS",
  status: 401,
  message: "邮箱或密码错误",
});
```

- [ ] **Step 2: 编写路由层失败测试**

测试从预期的新模块 `lib/auth/login-handler.ts` 导入 `createLoginHandler`。spy limiter 必须完整实现 `isBlocked`、`recordFailure` 和 `clear`；logger 记录 `error` 调用。

用 `it.each(["不存在用户", "错误密码"])` 分别注入抛出同一 `AppError` 的登录函数。每个案例独立创建 limiter，断言相同的 401 body/code、`recordFailure` 恰好一次、无日志、无 Cookie。另覆盖：未知数据库异常返回稳定 500、计数为零、记录原始异常、无 Cookie；成功时清空计数并设置 `photo_session` Cookie。

- [ ] **Step 3: 一次运行全部新增测试确认 RED**

```bash
npm run test:unit -- tests/login-user.test.ts tests/login-route.test.ts
```

Expected: FAIL；领域测试因为普通 `Error` 缺少 code/status，路由测试因为 `lib/auth/login-handler.ts` 尚不存在。只有确认两类预期失败后才进入实现。

### Task 3: 实现领域错误与可测试登录处理器

**Files:**
- Modify: `lib/users/auth.ts:75-105`
- Create: `lib/auth/login-handler.ts`
- Modify: `app/api/auth/login/route.ts:1-62`
- Test: `tests/login-user.test.ts`
- Test: `tests/login-route.test.ts`

- [ ] **Step 1: 实现最小领域错误**

在 `lib/users/auth.ts` 复用 `AppError`：

```ts
function invalidCredentialsError() {
  return new AppError("邮箱或密码错误", "INVALID_CREDENTIALS", 401);
}
```

用户不存在和密码不匹配两个分支都抛出该错误，不改变成功响应。

- [ ] **Step 2: 在独立模块实现处理器工厂**

在 `lib/auth/login-handler.ts` 导出依赖类型和 `createLoginHandler`：

```ts
type LoginDependencies = {
  login: (input: { email: string; password: string }) => ReturnType<typeof loginUser>;
  limiter: RateLimitStore;
  logger: Pick<Console, "error">;
};

export function createLoginHandler({ login, limiter, logger }: LoginDependencies) {
  return async function handleLogin(request: Request) {
    // 保留现有 schema 校验、IP key、限流检查和成功 Cookie。
    // 仅 INVALID_CREDENTIALS 计数并返回稳定 401。
    // 未知异常记录日志并返回稳定 500，不计数、不写 Cookie。
  };
}
```

错误分类只检查 `error instanceof AppError && error.code === "INVALID_CREDENTIALS"`，未知异常消息不得返回客户端。

- [ ] **Step 3: 将 Route Handler 缩减为生产装配**

`app/api/auth/login/route.ts` 只能导出 Next.js 支持的 `POST`，不得额外导出工厂：

```ts
export const POST = createLoginHandler({
  login: (input) => loginUser(prisma, getAppEnv(), input),
  limiter: getRateLimitStore(),
  logger: console,
});
```

- [ ] **Step 4: 运行新增测试确认 GREEN**

```bash
npm run test:unit -- tests/login-user.test.ts tests/login-route.test.ts
```

Expected: 两个领域案例、两个 401 路由案例、500 和成功案例全部 PASS。

- [ ] **Step 5: 运行认证相关回归**

```bash
npm run test:unit -- tests/login-user.test.ts tests/login-route.test.ts tests/login-rate-limit.test.ts tests/session.test.ts tests/auth-navigation.test.ts
```

Expected: 全部 PASS，无未处理异常或警告。

- [ ] **Step 6: 提交实现**

```bash
git add lib/users/auth.ts lib/auth/login-handler.ts app/api/auth/login/route.ts tests/login-user.test.ts tests/login-route.test.ts
git commit -m "fix: 区分登录凭据与服务异常"
```

### Task 4: 用真实数据库验证有效账号登录

**Files:**
- Create: `tests/login.integration.test.ts`
- Modify: `.env.test`
- Modify: `vitest.config.ts`
- Verify: `app/api/auth/login/route.ts`
- Verify: `lib/users/auth.ts`

- [ ] **Step 1: 修正测试环境密钥**

将 `.env.test` 和 `vitest.config.ts` 中的 `JWT_SECRET` 同步改为相同的、至少 32 字符的纯测试值（例如 `test_secret_for_testing_only_123456789`）。不得使用开发或生产密钥。

- [ ] **Step 2: 编写真实登录集成测试**

测试连接 `.env.test` 的隔离数据库，用 `hashPassword` 创建唯一邮箱用户，随后调用生产 `POST`，提交正确邮箱和密码。断言状态 200、响应用户 id 正确、`set-cookie` 包含 `photo_session=`。`afterAll` 删除测试用户并断开 Prisma。该测试使用真实 Prisma 查询、bcrypt 校验、会话签名和生产路由装配，不 stub 登录函数。

- [ ] **Step 3: 确认测试数据库而非开发数据库**

```bash
node --env-file=.env.test -e 'const u=new URL(process.env.DATABASE_URL); console.log({host:u.hostname,port:u.port,database:u.pathname.slice(1)})'
pg_isready -h 127.0.0.1 -p 6000 -d photo_management_test
```

Expected: database 明确为 `photo_management_test` 且 accepting connections。当前 6000 端口已由实际 PostgreSQL/转发占用时，不运行 `npm run test:db:up`，直接使用其中隔离的测试数据库；不得覆盖开发库。

- [ ] **Step 4: 迁移测试数据库并运行集成测试**

```bash
npm run test:db:migrate
npm run test:integration -- tests/login.integration.test.ts
```

Expected: 真实登录返回 200 并设置 `photo_session` Cookie。

- [ ] **Step 5: 提交集成测试与测试配置**

```bash
git add tests/login.integration.test.ts .env.test vitest.config.ts
git commit -m "test: 覆盖真实登录链路"
```

### Task 5: 完整验证登录恢复

**Files:**
- Verify: `app/api/auth/login/route.ts`
- Verify: `lib/auth/login-handler.ts`
- Verify: `lib/users/auth.ts`
- Verify: `prisma/schema.prisma`

- [ ] **Step 1: 运行静态检查**

```bash
npm run lint
npm run typecheck
```

Expected: 两个命令均 exit 0。

- [ ] **Step 2: 运行全部单元与集成测试**

```bash
npm run test:unit
npm run test:integration
```

Expected: 全部测试通过，0 failures。

- [ ] **Step 3: 构建生产包**

```bash
npm run build
```

Expected: Next.js build exit 0，证明路由文件没有非法导出且登录 API 成功生成。

- [ ] **Step 4: 最终数据库状态检查**

```bash
node --env-file=.env.local node_modules/prisma/build/index.js migrate status
```

Expected: `Database schema is up to date!`。

- [ ] **Step 5: 检查工作区与提交历史**

```bash
git status --short
git log --oneline -5
```

Expected: 计划文档已在执行前单独提交；没有遗漏的实现文件，最新提交记录登录修复和真实登录集成测试。
