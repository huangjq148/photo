# Photo Management App

个人/家庭相册管理应用。

## 功能概览

- **全局上传**：桌面顶栏「上传」按钮或移动端底部导航「上传」Tab 打开上传弹窗
- **筛选与排序**：媒体类型、收藏、日期范围、上传者筛选，URL 持久化
- **批量操作**：多选照片批量收藏/删除/添加
- **回收站**：权限约束 — 仅上传者可操作回收站中自己的媒体
- **偏好键**：`photo:gallery-preferences:v1`，持久化布局/分组/尺寸偏好
- **无障碍**：跳过链接、焦点约束、可访问按钮名称

## 环境要求

- Node.js 22+
- Docker 及 Docker Compose
- FFmpeg（用于视频缩略图生成）

## 环境变量

创建 `.env.local` 文件：

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/photo_management?schema=public
JWT_SECRET=<至少 32 字符的密钥>
STORAGE_ROOT=./data/storage
```

## 数据库迁移

```bash
npx prisma migrate deploy
```

## 开发启动

```bash
npm install
npm run dev
```

访问 http://127.0.0.1:3000

## 测试

### 启动测试数据库

```bash
npm run test:db:up
npm run test:db:migrate
```

### 运行测试

```bash
npm run test:unit          # 单元测试（无需数据库）
npm run test:integration    # 集成测试（需要测试数据库）
npm run test:e2e            # E2E 浏览器测试
```

### 停止测试数据库

```bash
npm run test:db:down
```

## 完整验证

```bash
npm run verify
```

依次执行：lint → typecheck → unit tests → integration tests → E2E tests → build

## 项目结构

```
app/            Next.js App Router 页面和 API 路由
components/     React 组件
lib/            工具函数、认证、数据库访问
prisma/         Prisma schema 和迁移
tests/          测试文件
  *.test.ts              单元测试
  *.integration.test.ts  集成测试
  e2e/                   Playwright E2E 测试
scripts/        工具脚本
data/           本地文件存储目录
```
