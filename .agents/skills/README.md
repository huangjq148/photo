# Pi AI Workflow Skills

这是一套用于 Pi 的软件开发工作流 Skill 配置。

目标：

```text
需求澄清 → 产品设计 → UI/UX 设计 → 开发实现 → tmux 运行 → Playwright 测试 → 交付总结
```

## 包含的 Skill

本包只新增 3 个 Skill，不覆盖你已有的 `superpowers` 和 `ui-ux-pro-max`。

```text
.pi/skills/
├── requirement-design-dev-test/
│   └── SKILL.md
├── pm-requirement-designer/
│   └── SKILL.md
└── qa-playwright-tester/
    └── SKILL.md
```

你已有的 Skill：

```text
ui-ux-pro-max    # UI/UX 设计
superpowers      # 开发、调试、测试执行
```

最终组合：

```text
requirement-design-dev-test   # 总控
├── pm-requirement-designer    # 需求 / PRD / 验收标准
├── ui-ux-pro-max              # 页面 / 交互 / UI/UX
├── superpowers                # 开发 / 调试 / 命令执行
└── qa-playwright-tester       # Playwright / E2E / 测试报告
```

## 安装方式

### 方式一：放到当前项目

把 `.pi/skills/` 复制到你的项目根目录。

最终项目结构类似：

```text
your-project/
├── .pi/
│   └── skills/
│       ├── requirement-design-dev-test/
│       ├── pm-requirement-designer/
│       └── qa-playwright-tester/
├── package.json
└── ...
```

### 方式二：全局使用

复制到：

```bash
~/.pi/agent/skills/
```

例如：

```bash
cp -R .pi/skills/* ~/.pi/agent/skills/
```

## 使用方式

### 完整流程

```text
/skill:requirement-design-dev-test

我想开发一个成本分类管理功能。

要求：
1. 先明确需求
2. 再做产品设计
3. 使用 ui-ux-pro-max 做 UI/UX 设计
4. 使用 superpowers 开发
5. 使用 tmux 管理前后端服务和测试窗口
6. 使用 Playwright 做 E2E 验收测试
7. 最后输出交付总结
```

### 只做需求和 PRD

```text
/skill:pm-requirement-designer

我想做一个照片管理功能，请帮我明确需求并输出 PRD。
```

### 只做测试

```text
/skill:qa-playwright-tester

根据这个功能需求，帮我设计 Playwright 测试用例并执行验收测试。
```

## 推荐 tmux 窗口

```text
ai-dev
├── frontend
├── backend
├── test
├── e2e
└── logs
```

## 推荐测试顺序

```text
lint → type-check → unit test → build → Playwright E2E
```

## 注意

如果 Pi 当前环境不支持一个 Skill 自动调用另一个 Skill，`requirement-design-dev-test` 会输出下一步应该运行的 `/skill:xxx` 指令。你复制执行即可。
