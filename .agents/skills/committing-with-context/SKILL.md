---
name: committing-with-context
description: Use when committing code changes, creating commit messages, or preparing to run git commit
---

# 参考历史提交记录进行提交

## 概述

提交代码前，必须先查看项目的提交历史，遵循项目已有的提交风格和格式约定。

## 何时使用

- 准备执行 `git commit` 时
- 需要撰写提交信息时
- 不确定项目的提交格式约定时

## 提交流程

```
准备提交 → git log --oneline -10 → 了解格式和类型 → 用中文写提交信息 → git commit
```

## 核心规则

### 1. 提交前先查历史

每次提交前执行：

```bash
git log --oneline -10
```

从历史记录中了解：
- 使用的提交类型（feat, fix, docs 等）
- 描述的详细程度
- 使用的语言

### 2. 遵循 Conventional Commits

使用标准类型前缀：

| 类型 | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 文档变更 |
| `refactor` | 重构（不改变功能） |
| `test` | 测试相关 |
| `chore` | 构建、依赖等杂项 |
| `style` | 格式调整（不影响逻辑） |

格式：`类型: 中文描述`

### 3. 中文描述

提交信息使用中文撰写，简洁描述变更内容。

示例：
- `feat: 添加视频上传功能`
- `fix: 修复全屏模式下工具栏层级问题`
- `refactor: 将 Photo 重命名为 Media`

### 4. 保持单行简洁

- 一行描述清楚做了什么
- 不需要过长的解释

## 常见错误

| 错误 | 正确做法 |
|------|----------|
| 不查历史直接提交 | 先 `git log --oneline -10` 了解风格 |
| 使用英文描述 | 项目中统一使用中文 |
| 使用项目未出现过的类型 | 参考历史记录中使用的类型 |
| 描述过于冗长 | 一行简述核心变更 |

## 快速参考

```bash
# 1. 查看历史
git log --oneline -10

# 2. 提交
git commit -m "类型: 中文描述"
```
