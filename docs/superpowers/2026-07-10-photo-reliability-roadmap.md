# 个人/家庭相册可靠性路线图

## 产品方向

- 定位：个人/家庭相册。
- 当前基线：账号、相册、图片/视频上传、收藏、回收站、成员权限和单文件分享已经具备。
- 下一阶段目标：优先补齐协作闭环、安全和数据可靠性，再扩展照片整理能力。

## 文档索引

| 顺序 | 子项目 | 设计文档 | 开发计划 |
|---:|---|---|---|
| 0 | 测试与交付基线 | [设计](specs/2026-07-10-test-delivery-baseline-design.md) | [计划](plans/2026-07-10-test-delivery-baseline.md) |
| 1 | 公开媒体分享 | [设计](specs/2026-07-10-public-media-sharing-design.md) | [计划](plans/2026-07-10-public-media-sharing.md) |
| 2 | 相册权限与邀请 | [设计](specs/2026-07-10-album-permissions-invitations-design.md) | [计划](plans/2026-07-10-album-permissions-invitations.md) |
| 3 | 账号与会话安全 | [设计](specs/2026-07-10-account-session-security-design.md) | [计划](plans/2026-07-10-account-session-security.md) |
| 4 | 媒体库可靠性与遗留清理 | [设计](specs/2026-07-10-library-reliability-cleanup-design.md) | [计划](plans/2026-07-10-library-reliability-cleanup.md) |

## 执行依赖

```text
测试与交付基线
  ├── 公开媒体分享
  ├── 相册权限与邀请
  └── 账号与会话安全
          └── 媒体库可靠性与遗留清理
```

- 阶段 0 必须首先完成，为其他子项目提供数据库集成测试和 Playwright 基线。
- 阶段 1、2、3 在阶段 0 后可分别实施，但推荐依次完成，降低共享认证和 UI 组件冲突。
- 阶段 4 最后执行，因为包含稳定错误契约迁移和 Space 删除迁移，影响范围最大。

## 阶段门禁

每个子项目进入下一阶段前必须满足：

- 设计文档中的验收标准全部可验证。
- 目标单元测试和集成测试通过。
- 对用户主流程有影响时，Playwright 测试通过。
- `npm run lint`、`npm run typecheck` 和 `npm run build` 通过。
- 没有把未完成的数据迁移、临时兼容逻辑或权限绕过留给下一阶段。

## 总体完成标准

- 匿名访客能够安全使用有效分享，失效分享无法继续读取任何媒体变体。
- 相册 owner 和 member 的所有服务端权限符合统一矩阵。
- 未注册用户可以通过邀请链接注册并加入相册。
- Session 有 7 天有效期，支持修改密码和退出所有设备。
- 收藏和回收站支持完整分页，回收站可以可靠清空。
- 废弃 Space 数据完成审计后，相关模型和路由被移除。
- 本地和 CI 都能通过统一验证命令复现结果。

## 后续候选

本路线图完成后，再单独设计以下能力：

1. 基于 checksum 的重复媒体识别。
2. 基于拍摄时间和 GPS 的时间线与地图视图。
3. 对象存储、后台视频转码和缩略图任务队列。
4. AI 标签、人脸聚类和家庭回忆。

以上候选不纳入当前开发计划。
