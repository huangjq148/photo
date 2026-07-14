# Photo UX 改进 — 发布说明

> 版本范围：2026-07-13 至 2026-07-14
> 完整覆盖 P0、P1、P2 三个阶段

## 核心改进

### 1. 导航重构
- **桌面端**：主导航精简为「相册/时间线/回忆」+「更多」下拉菜单（收藏/地图/重复/回收站）
- **移动端**：新增底部导航栏（相册/时间线/上传/回忆/更多），更多抽屉含收藏/地图/重复/回收站/安全/退出
- 安全区适配（`env(safe-area-inset-bottom)`）
- 退出操作增加 pending 状态和失败恢复

### 2. 筛选与排序
- 筛选面板支持：媒体类型（全部/照片/视频）、仅收藏、拍摄日期范围、上传者（协作相册）
- 排序：上传时间/拍摄时间/文件名/文件大小（升/降序）
- 分组：无/按年/按月
- 所有筛选/排序/分组状态写入 URL search params

### 3. 批量操作
- 统一批量 API：`POST /api/photos/batch-favorite`、`POST /api/photos/batch-trash`、`POST /api/albums/[id]/photos/batch-remove`
- 响应式批量操作栏：桌面 sticky 顶栏、移动端底部导航之上
- 批量收藏/删除/添加，部分失败只保留失败项

### 4. 消息与反馈
- 全局消息系统：success/error/warning/info，最多 3 条，1 秒内同文案合并
- 操作撤销：6 秒 action 有效期，支持移除/删除撤销
- `useMessage` hook 统一调用

### 5. 图片预览器增强
- 焦点捕获（Tab 循环）+ 关闭恢复聚焦元素
- 缩放快捷键：`+`/`-`/`0`
- 触摸优化：未缩放时允许横滑翻页，放大时拖拽平移
- 视频切换自动暂停
- `hasMore`/`onLoadMore` 分页支持

### 6. 媒体信息面板
- 独立弹窗显示：显示名称、原始文件名、尺寸、格式、文件大小、拍摄/上传时间、所在相册数
- 非内联 overlay，焦点和关闭保护完整

### 7. 认证表单优化
- 密码字段显示/隐藏切换（`Eye`/`EyeOff` 图标，可访问名称）
- 字段级错误反馈（`aria-describedby` 关联）
- 全局错误仅显示非字段问题
- 防重复提交

### 8. 无障碍改进
- 跳过链接 `#main-content`
- `aria-label` 覆盖所有图标按钮
- `aria-current` 双重表达当前页面
- 焦点约束和恢复

### 9. 偏好持久化
- 图库偏好键：`photo:gallery-preferences:v1`
- 持久化内容：布局模式、分组模式、照片尺寸

## API 兼容接口

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/photos/batch-favorite` | POST | 新建，批量收藏/取消收藏 |
| `/api/photos/batch-trash` | POST | 新建，批量移入回收站 |
| `/api/albums/[id]/photos/batch-remove` | POST | 新建，批量从相册移除 |
| `/api/albums/[id]/photos` | GET | 扩展：支持 `mediaType`/`favoritedOnly`/`uploaderId`/`sortBy`/`sortOrder` 参数 |
| `/api/photos/[id]/favorite` | POST | 改为显式 `{ favorited }` body，兼容旧 toggle |
| `/api/albums/[id]/photos` | GET | 响应新增 `size`/`albumCount`/`locationHidden` 字段 |

## 迁移页面

以下页面使用新组件和交互模式：
- `/albums` — 筛选工具栏、底部导航
- `/albums/[id]` — 批量操作栏、媒体信息弹窗
- `/timeline`、`/favorites`、`/trash`、`/map`、`/duplicates`、`/memory` — 统一导航
- `/login`、`/register`、`/account/security` — 优化认证表单
- `/` — 记忆预览使用缩略图而非原图直链
