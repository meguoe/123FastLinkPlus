# 光鸭云助手

## 接续与约束

- 中文、简短沟通；不确定时说明假设。先读 `TASK_STATUS.md` 最新记录，再核对当前源码和用户要求，不能把历史或未验证项当成当前结论。
- 保留用户手动修改及暂存内容。未经明确指令，不修改 Git 索引、历史或远端，包括 `git add/commit/push/reset`。
- 不修改 `/Applications/光鸭云盘.app` 安装包；调试配置和注入只在进程内生效。不自动强杀、退出或重启用户应用。
- 实机界面检查串行。真实云盘写入、移动、改名、删除由用户操作，不能作为自动测试；不擅自修改剪贴板、原生设置或系统默认处理程序。
- 不读取或输出登录 token；云盘请求复用原生 HTTP 模块，TMDB 日志必须脱敏。不放开通用代理、renderer CSP 或公网 Inspector。
- 不恢复用户删除的 `tests/`、启动器 `--check` 自检、旧“搜索资源”、Ace/CodeFlask；不引入第二份 React。
- 修改前追踪实际入口、共享函数及全部调用方，复用现有实现，优先最小离线反例和最小改动。
- 完成后更新 `TASK_STATUS.md`，注明验证和未覆盖范围；最新动态放标题下、旧记录前。`AGENTS.md` 只保留必要规则，不积累进度或完整功能说明。

## 关键入口

| 文件 | 职责 |
| --- | --- |
| `open-guangya-devtools.mjs` | 启动、`--attach`、Inspector 校验、组件打包和自动注入 |
| `build-app.mjs` / `macos-launcher.m` | 内置 Node 的 macOS app 构建、原生启动、URL 队列和错误日志 |
| `guangya-app-menu.mjs` / `guangya-magnet.mjs` | 手动 DevTools 菜单、系统磁力直达原生云添加弹窗 |
| `guangya-clipboard.mjs` | 原生剪贴板云添加仅匹配显式磁力，首次安装后开启原生开关 |
| `guangya-file-list.js` / `guangya-file-sort.js` | 指定 XHR pageSize=500、排序缓存和重挂载恢复 |
| `guangya-export.js` / `guangya-import.js` | 共享选择读取、秒传导出/导入 |
| `guangya-rename.js` / `guangya-tv.js` | 三种重命名规则、电影/剧集扫描匹配及整理 |
| `guangya-tmdb-bridge.mjs` | 受限 TMDB 请求、超时、取消和窗口清理 |
| `guangya-home-button.js` | 首页五项业务菜单 |
| `guangya-{message,modal,native-ui,json-editor}.js` | 共用提示、弹窗、原生组件及编辑器 |

## 必须保留的行为

- 使用 macOS、Node 24+，依赖已安装的官方应用。Inspector 为 `127.0.0.1:9237`，连接后核对 `process.execPath`；无 Inspector 时由用户正常退出再经助手启动。
- 默认不打开 DevTools，从光鸭菜单“云助手”手动打开。修改源码后需重新运行启动器，单独刷新仍使用旧源码快照；业务弹窗有重注入保护，导出弹窗没有同等保护。
- 系统磁力只接受显式 `magnet:?`，保留编码、去重并排队；检查登录后调用原生 `cloudAdd.openResolver`，不读写剪贴板、不自动保存。已运行只开弹窗，不重注入；正常手动启动助手会尝试注册 magnet 默认处理程序，运行前考虑该副作用。
- 剪贴板限制仅在通过助手注入的光鸭进程内生效：只替换 `cloud-add-link.match`，保留原生轮询、登录/开关检查及分享处理。每进程首次安装限制后开启原生磁力开关，重复注入不强行重开；版本定位失败必须报错，不能声称已限制。不得增加第二个常驻监听器。
- 共享 `getSelection()` 读取 React 当前提交树，同一提交的 selectedItems/dataSource，覆盖离屏项；缺失选中 ID 必须报错。导出、重命名、电影、剧集共用，修复需覆盖四入口。
- 排序 observer 仅在 destroy 时断开，必须覆盖非默认排序后“菜单离开首页、返回首页”多轮恢复；有效表头点击保存，排序菜单不保存。
- 导出仅 GCID 时以其前32位作为兼容 md5，保留完整 GCID，不能称为真实 MD5。导入传输结果未知不换哈希重复提交；取消不等于撤销服务端任务。
- 无年份允许唯一精确名称自动匹配；剧集最多3页，未取全禁止自动选；电影仅首页前10，无全结果歧义保证。显式 TMDB ID 冲突或详情失败不得回退猜测。
- 整理停止不回滚；批量移动后 pending 可能已经移动。恢复先刷新源/目标，按 ID 和实际名称核对，不能重放未知批次。
- **源目录清理仅在整批成功且未停止时执行，可能连同附件和小视频删除，并非只删空目录。** 保留目标目录、残留大视频或未知大小视频；删除失败单独报告，不盲重试。
- 原生 Webpack、React Fiber、HTTP/Message、组件、路由均为内部接口，升级必须核对。模块 `destroy()` 应清理资源；Message 用 `dispose()` 卸载适配，其 `destroy()` 只销毁提示。

## 常用命令与验证

```bash
# 只读检查，不启动应用
for file in *.js *.mjs; do node --check "$file" || exit 1; done
clang -fsyntax-only -fobjc-arc -Wall -Wextra -Werror macos-launcher.m
git diff --check
node guangya-magnet.mjs --self-test
node guangya-clipboard.mjs --self-test

# 以下有运行或构建副作用，按任务需要执行
node open-guangya-devtools.mjs
node open-guangya-devtools.mjs --attach
node build-app.mjs
```

- 构建生成并替换 `dist/光鸭云助手.app`，内置 Node/脚本/许可证；检查架构、系统库、最低 macOS、资源和签名。缺许可证用 `NODE_LICENSE_PATH`。本机 ad-hoc 签名不等于公证，不保证跨架构兼容；部署状态查最新进度。
- 行为检查优先模拟依赖，不依赖历史 `/private/tmp` 文件长期存在。按改动覆盖取消、未知结果、冲突、重挂载及销毁；模拟通过不能替代真实 UI、服务端或系统 URL 投递验收。
