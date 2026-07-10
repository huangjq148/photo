# 测试与交付基线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可一键启动、迁移、执行和清理的测试环境，并形成统一的本地与 CI 验证入口。

**Architecture:** 使用 Docker Compose 提供隔离 PostgreSQL，Vitest 按 unit/integration 项目分层，Playwright 覆盖核心浏览器流程。所有命令从 `package.json` 统一入口执行，并在 CI 中复用。

**Tech Stack:** Next.js 15, TypeScript, Vitest, Prisma, PostgreSQL, Docker Compose, Playwright, ESLint

---

## File Structure

| 文件 | 操作 | 职责 |
|---|---|---|
| `docker-compose.test.yml` | 新建 | 测试 PostgreSQL 服务 |
| `scripts/assert-test-database.ts` | 新建 | 阻止测试误连非测试数据库 |
| `vitest.config.ts` | 修改 | 区分单元与集成测试 |
| `playwright.config.ts` | 新建 | E2E 服务和浏览器配置 |
| `tests/e2e/smoke.spec.ts` | 新建 | 登录与相册冒烟流程 |
| `package.json` | 修改 | 测试、lint、typecheck、verify 命令 |
| `.github/workflows/verify.yml` | 新建 | CI 验证流程 |
| `README.md` | 新建 | 环境初始化和验证说明 |

### Task 1: 增加隔离测试数据库

**Files:**
- Create: `docker-compose.test.yml`
- Create: `scripts/assert-test-database.ts`
- Modify: `.env.test`

- [ ] **Step 1: 编写数据库安全检查脚本测试**

为允许的 `photo_test` 数据库和拒绝的普通数据库连接串编写测试，断言非测试库抛出明确错误。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/test-database-safety.test.ts`
Expected: FAIL，原因是检查模块尚不存在。

- [ ] **Step 3: 实现 Docker Compose 和连接安全检查**

Compose 使用 `postgres:16-alpine`、端口 `6000:5432`、数据库 `photo_test`，并配置 `pg_isready` 健康检查。脚本解析 `DATABASE_URL`，数据库名不以 `_test` 结尾时退出码为 1。

- [ ] **Step 4: 启动并迁移测试数据库**

Run: `docker compose -f docker-compose.test.yml up -d --wait`
Expected: PostgreSQL service healthy.

Run: `dotenv -e .env.test -- prisma migrate deploy`
Expected: All migrations applied successfully.

- [ ] **Step 5: 运行数据库相关测试**

Run: `npm test -- tests/albums.test.ts tests/photo-library.test.ts tests/photo-upload.test.ts tests/photo-shares.test.ts`
Expected: 4 test files pass.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.test.yml scripts/assert-test-database.ts .env.test tests/test-database-safety.test.ts
git commit -m "test: add isolated postgres test environment"
```

### Task 2: 分离单元测试和集成测试命令

**Files:**
- Modify: `vitest.config.ts`
- Modify: `package.json`
- Modify: `tests/setup.ts`

- [ ] **Step 1: 给集成测试增加文件命名约定**

将依赖 Prisma 的测试迁移为 `*.integration.test.ts`，纯逻辑和组件测试保留 `*.test.ts`。

- [ ] **Step 2: 配置两个 Vitest project**

`unit` 排除 integration 文件；`integration` 只包含 integration 文件并加载 `.env.test`。两者均保持现有路径别名和 Node 环境。

- [ ] **Step 3: 增加标准命令**

```json
{
  "test:unit": "vitest run --project unit",
  "test:integration": "tsx scripts/assert-test-database.ts && vitest run --project integration",
  "test:db:up": "docker compose -f docker-compose.test.yml up -d --wait",
  "test:db:migrate": "dotenv -e .env.test -- prisma migrate deploy",
  "test:db:down": "docker compose -f docker-compose.test.yml down -v"
}
```

- [ ] **Step 4: 验证两个测试层级**

Run: `npm run test:unit`
Expected: all unit tests pass without PostgreSQL.

Run: `npm run test:integration`
Expected: all integration tests pass with PostgreSQL.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json tests
git commit -m "test: split unit and integration suites"
```

### Task 3: 增加 Playwright 冒烟测试

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/smoke.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: 安装 Playwright 测试依赖**

Run: `npm install -D @playwright/test`
Expected: dependency installed.

- [ ] **Step 2: 编写失败的登录与相册冒烟测试**

测试注册新用户、进入相册、创建相册并确认卡片出现。使用唯一邮箱，失败时保留 trace 和截图。

- [ ] **Step 3: 配置 webServer**

Playwright 启动 `npm run dev -- --hostname 127.0.0.1`，使用测试环境变量和临时 `STORAGE_ROOT`，baseURL 为 `http://127.0.0.1:3000`。

- [ ] **Step 4: 运行 E2E**

Run: `npm run test:e2e`
Expected: Chromium smoke test passes.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e package.json package-lock.json
git commit -m "test: add playwright smoke coverage"
```

### Task 4: 统一验证命令和 CI

**Files:**
- Create: `.github/workflows/verify.yml`
- Create: `README.md`
- Modify: `package.json`

- [ ] **Step 1: 修复 lint 和类型检查命令**

将 lint 改为 `eslint .`，增加 `typecheck: tsc --noEmit`。

- [ ] **Step 2: 增加 verify 命令**

`verify` 顺序执行 lint、typecheck、unit、integration、E2E 和 build；任一步失败立即停止。

- [ ] **Step 3: 配置 CI**

CI 使用 Node 22、PostgreSQL 16、npm 缓存和 Playwright Chromium。迁移后执行与本地一致的验证命令，并在失败时上传 Playwright 报告。

- [ ] **Step 4: 编写 README**

记录环境变量、FFmpeg、Docker、数据库迁移、开发启动和完整验证命令。

- [ ] **Step 5: 完整验证**

Run: `npm run verify`
Expected: lint, typecheck, unit, integration, E2E and build all pass.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/verify.yml README.md package.json package-lock.json
git commit -m "ci: add reproducible verification pipeline"
```
