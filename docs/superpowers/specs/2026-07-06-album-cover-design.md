# 相册手动设置封面 - 设计文档

## 概述

在照片卡片的「…」右键菜单中增加"设为封面"选项，允许用户手动指定相册封面照片。

## 现有基础设施

- DB: `Album.cover_photo_id` 字段已存在
- Lib: `setAlbumCover()` 函数已实现（含权限校验、照片归属校验）
- API: `PATCH /api/albums/[id]/cover` 端点已存在
- UI: 相册卡片已优先显示 `coverUrl`

## 改动范围

| 文件 | 改动 |
|------|------|
| `components/photos/photo-gallery-card.tsx` | 新增 `onSetCover` prop，菜单中添加"设为封面"按钮 |
| `components/photos/photo-gallery.tsx` | 新增 `onSetCover` prop，透传给 PhotoGalleryCard |
| `components/albums/album-detail.tsx` | 传入 `onSetCover`，调用 API，成功后刷新 |

## 交互流程

1. 用户悬停照片 → 点「…」→ 点"设为封面"
2. 调用 `PATCH /api/albums/{albumId}/cover` { photoId }
3. 成功后 toast "封面已更新"，刷新 album 数据

## 边界情况

- 照片不属于该相册 → 后端 422，前端显示错误
- 无权限 → 403
