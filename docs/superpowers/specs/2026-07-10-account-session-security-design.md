# 账号与会话安全设计

## 目标

为现有签名 Cookie 会话增加明确有效期、全局失效能力和基础登录保护，并提供修改密码和退出全部设备功能。

## 当前问题

- Session payload 只有 `userId`，没有版本、签发或过期时间。
- Cookie 没有 `maxAge`，只要签名密钥不变就可长期使用。
- 用户不能修改密码，也不能让其他设备上的 Session 失效。
- 登录接口没有频率限制。

## 会话模型

Session payload：

```ts
type SessionPayload = {
  version: 1;
  userId: string;
  sessionVersion: number;
  issuedAt: number;
  expiresAt: number;
};
```

默认有效期为 7 天。验证时依次检查结构、HMAC 签名、过期时间以及 payload 的 `sessionVersion` 是否与用户记录一致。

`User` 增加 `session_version Int @default(1)`。修改密码或执行“退出所有设备”时原子递增；当前设备随后获得新版本 Session。

## 功能流程

### 修改密码

用户输入当前密码、新密码和确认密码。服务端验证当前密码、新密码强度及两次输入一致；成功后更新哈希、递增 Session 版本并签发新 Cookie。

### 退出所有设备

用户确认后递增 Session 版本，并清除当前 Cookie。所有已有 Session 在下一次请求时失效。

### 登录限流

按标准化邮箱和客户端 IP 组合进行滑动窗口限制：15 分钟最多 10 次失败。成功登录后清除对应失败计数。首期使用进程内实现并抽象存储接口，部署为多实例前替换为 Redis。

## 接口设计

- `POST /api/auth/change-password`
- `POST /api/auth/logout-all`
- `POST /api/auth/login` 保持现有请求结构，增加 429 和 `Retry-After`。
- `GET /api/users/me` 在 Session 过期或版本不匹配时返回 401，并清除无效 Cookie。

## 安全规则

- Cookie 使用 `httpOnly`、`sameSite=lax`、`path=/`，生产环境启用 `secure`，并设置 7 天 `maxAge`。
- 密码修改错误不暴露用户是否存在。
- 新密码沿用注册密码强度规则，且不能与当前密码相同。
- 所有认证状态变更接口仅接受 POST。
- 登录失败响应保持统一文案，降低账号枚举风险。

## 页面与交互

- 用户菜单增加“账号安全”。
- 安全页包含修改密码和退出所有设备两个区域。
- 密码表单提供显式 label、自动完成属性、提交中状态和 `role=alert` 错误提示。
- Session 过期时跳转登录页并携带原始站内路径，登录后返回。

## 兼容策略

旧格式 Session 不继续兼容，部署后统一视为无效并要求重新登录。该策略简单且避免长期维护两套验证逻辑。

## 验收标准

- Session 超过 7 天后无法继续访问登录态资源。
- 篡改 payload、签名或过期时间都会被拒绝。
- 修改密码后其他设备旧 Session 失效，当前设备保持登录。
- 退出全部设备后包括当前设备在内的所有 Session 失效。
- 超过登录失败阈值返回 429，窗口结束后可以重试。

## 不包含范围

- 邮件找回密码和邮箱验证。
- 双因素认证。
- Redis 分布式限流。
- 独立设备会话列表。
