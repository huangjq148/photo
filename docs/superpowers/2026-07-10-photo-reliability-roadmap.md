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
整体方案方向正确，没有根本性设计错误。在 Bash 包装器跨越 MSYS→Win32 进程边界时，使用仅对单次命令生效的环境变量，是影响范围最小、也最适合自动处理的方案。
不过文档中有几处需要收紧，否则实现和测试时容易产生误解。
1. Root cause 的描述不够精确
当前写法：
Path conversion occurs ... when scripts/funnydb launches a native Windows process.

更准确地说，转换发生在 MSYS runtime 创建第一个原生 Win32 进程并构造其 argv 时，因此参数在 .cmd 收到之前就可能已经被转换。Git for Windows 的 runtime 源码也是在调用 CreateProcessW 前遍历原生进程参数并执行转换。GitHub
建议改为：
Path conversion occurs when the MSYS runtime crosses from the POSIX process into the first native Win32 process. Therefore, arguments may already be converted before scripts/funnydb.cmd receives them.

这也能更清楚地解释为什么修复必须放在 Bash wrapper，而不是 .cmd 或 CLI 内部。
2. 两个环境变量的兼容性表述过于绝对
当前写法：
Git for Windows consumes MSYS_NO_PATHCONV, while standard MSYS2 consumes MSYS2_ARG_CONV_EXCL.

这句话大方向没错，但容易让人理解成：
Git for Windows 只支持 MSYS_NO_PATHCONV
MSYS2 只支持 MSYS2_ARG_CONV_EXCL
实际上，MSYS2_ARG_CONV_EXCL 是当前 MSYS2 正式文档明确说明的参数转换控制变量，* 表示禁止所有参数转换；当前 Git for Windows 的 MSYS runtime 源码中也直接处理了该变量。msys2.org
MSYS_NO_PATHCONV 是 Git for Windows 较早提供的全局关闭开关，官方发布说明中有记录。GitHub
建议改成更稳妥的表述：
Set both MSYS_NO_PATHCONV=1 and MSYS2_ARG_CONV_EXCL=* for compatibility across Git for Windows and MSYS2 runtime variants. MSYS2_ARG_CONV_EXCL is the documented MSYS2 argument-exclusion mechanism, while MSYS_NO_PATHCONV preserves compatibility with Git for Windows installations that rely on its legacy switch.

3. 文档应给出规范性的调用形式
目前只描述了“设置变量后调用”，建议直接写出预期实现，避免实现人员误用 export、漏掉引号或丢失退出码：
case "$(uname -s)" in
  MINGW*|MSYS*)
    MSYS_NO_PATHCONV=1 \
    MSYS2_ARG_CONV_EXCL='*' \
      "$SCRIPT_DIR/funnydb.cmd" "$@"
    status=$?
    exit "$status"
    ;;
esac
这里有三个关键点：
'*' 建议显式加引号。
必须使用 "$@"，不能使用 $*。
明确保存并返回 .cmd 的退出码。
不建议在设计中强制要求 exec。普通调用加显式 exit "$status" 对 .cmd 包装器更直观，也更容易测试。
4. “变量被 CLI 继承”不是修复生效的核心机制
当前写法强调：
The assignments are inherited by the .cmd process and the native CLI it launches.

继承本身是正确的，但容易掩盖真正的时序：
Bash 准备启动原生进程。
MSYS runtime 在进程创建前处理参数。
转换控制变量在这一步被读取。
.cmd 随后才收到处理后的参数。
.cmd 再通过 cmd.exe 启动 CLI 时，不会再次经过 MSYS 参数转换。
因此建议写成：
The command-scoped assignments are visible to the MSYS runtime during the native spawn operation, preventing conversion before the batch wrapper receives the arguments. The child processes also inherit the variables, although that inheritance is not the primary mechanism of the fix.

5. 测试需要区分“可移植契约测试”和“Windows 集成测试”
这是当前文档最需要补充的部分。
如果在 Linux/macOS 上通过 mock uname 模拟 MINGW，测试只能证明：
进入了正确分支；
两个变量被设置；
参数使用 "$@" 转发；
退出码被传播；
父 shell 环境没有被修改。
它无法证明真实的 MSYS 路径转换被关闭，因为 Linux/macOS 上不存在这个 runtime 行为。
建议明确拆成两层。
可移植契约测试
通过 mock uname 和 stub funnydb.cmd 验证：
MINGW*、MSYS* 设置两个变量；
Linux、Darwin、WSL 风格的 Linux 不设置变量；
/api/v1/... 原样传入 stub；
空参数、空格参数、多个独立参数保持边界；
stub 的非零退出码原样返回；
调用完成后父 shell 中的变量仍保持原值或未设置。
Windows 集成测试
在真实 Git Bash 和 MSYS2 中，启动一个原生 Windows 测试程序，记录实际收到的 argv：
/api/v1/items
--endpoint=/api/v1/items
{"path":"/api/v1/items"}
argument with spaces
""
至少断言：
/api/v1/items 没有变成 C:/Program Files/Git/api/v1/items；
--endpoint=/api/... 未被转换；
JSON 内的 /api/... 未被转换；
参数数量和边界保持不变；
退出码保持不变。
测试替身最好是真正的原生 .exe，而不是另一个 Bash 脚本。否则测试可能绕过需要验证的 MSYS→Win32 边界。
6. 缺少“父环境未污染”的显式测试
文档把“不修改 surrounding Agent session”作为核心目标，但 Verification 没有明确测试这一点。
建议加入两个用例：
unset MSYS_NO_PATHCONV MSYS2_ARG_CONV_EXCL
scripts/funnydb ...
# assert both are still unset
以及：
MSYS_NO_PATHCONV=original-a
MSYS2_ARG_CONV_EXCL=original-b
export MSYS_NO_PATHCONV MSYS2_ARG_CONV_EXCL

scripts/funnydb ...

# assert parent values are still original-a and original-b
同时应明确：在调用 .cmd 的子进程中，这两个已有值会被临时覆盖为 1 和 *，但父进程值会恢复。
7. 对未来“缩小排除范围”的说明需要更精确
当前写法：
narrow MSYS2_ARG_CONV_EXCL to endpoint prefixes

这里容易误导。MSYS2_ARG_CONV_EXCL 是对整个参数字符串做前缀匹配，不是搜索参数内部是否包含某个 endpoint。msys2.org
例如设置：
MSYS2_ARG_CONV_EXCL='/api/'
能够保护：
/api/v1/items
但未必保护：
--endpoint=/api/v1/items
{"path":"/api/v1/items"}
因为这两个参数并不是以 /api/ 开头。
建议改成：
If conversion is narrowed in the future, exclusions must match the prefixes of the complete CLI argument strings, such as /api/ and --endpoint=/api/. Values embedded in JSON or other compound arguments may require broader exclusion or explicit option-aware conversion.

8. uname 检测建议写清楚使用 uname -s
建议将：
behavior is selected by the wrapper's actual uname

改为：
behavior is selected from uname -s inside the Bash wrapper.

并把匹配形式固定下来：
MINGW*|MSYS*)
Cygwin 的 CYGWIN* 不会被该模式捕获，因此与“Cygwin 暂不支持”的范围定义一致。
9. Verification 中有一点逻辑冲突
文档一方面说：
Separate cases assert that ... the Windows batch wrapper remains usable directly from cmd.exe or PowerShell.

后面又说：
Native cmd.exe runtime verification remains a Windows CI concern when no Windows runner is available locally.

建议将前一句明确标为 Windows-only integration cases，否则看起来像所有环境都必须执行这些测试。
例如：
Windows-only integration cases verify that scripts/funnydb.cmd remains directly usable from cmd.exe and PowerShell. These tests run in Windows CI and may be skipped when no Windows runner is available locally.

10. 建议最终验收项
最终 Verification 可以整理为：
新增可移植 wrapper 契约测试，并确认修改前失败。
实现仅限 MINGW*|MSYS* 分支的命令级环境变量赋值。
运行全部 shell 和 wrapper forwarding 测试。
验证父环境变量不被修改。
验证非零退出码传播。
在 Windows CI 的 Git Bash/MSYS2 中运行真实 argv 集成测试。
在 Windows CI 中分别从 cmd.exe 和 PowerShell 直接调用 .cmd。
运行 git diff --check。
结论
这份设计可以进入实现阶段，但建议优先修改以下三点：
把转换时机明确为“第一个 MSYS→Win32 spawn，发生在 .cmd 收到参数之前”。
将两个变量描述为兼容性组合，而不是两个环境严格各自使用一个。
把测试拆成可移植契约测试和真实 Windows/MSYS 集成测试。
此外，我目前只审查了这份设计文本，没有看到现有的 scripts/funnydb 和 scripts/funnydb.cmd 实现；实际修改前仍应检查 wrapper 当前的分支结构、退出码处理以及 .cmd 的参数转发方式。