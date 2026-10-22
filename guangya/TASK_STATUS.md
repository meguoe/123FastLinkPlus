# 光鸭云盘注入脚本：任务进度与接续说明

## 外部点击与复制磁力双入口，原生剪贴板仅磁力（2026-10-22）

- 用户新要求：在已有系统磁力直达弹窗基础上，开启原生“自动识别剪贴板中的磁力链接”，但只允许显式磁力，复制和外部点击均可弹窗。此前用户自行关闭开关的要求由此更新；本次仅开启该项，不改分享开关。
- 新增 `guangya-clipboard.mjs`：通过主进程内部 Inspector Session 获取已加载 out/main/index.cjs 的实际脚本，严格定位剪贴板服务/提取器/设置仓库；在原生 readText 返回位置安装条件恒 false 的临时断点，等待既有轮询进入该作用域后，仅替换 cloud-add-link.match。安装完成即移除断点、断开内部 Session，不增加常驻轮询、不另启后台进程、不改官方安装包。
- 新 matcher 复用原生链接提取器，但要求 URL 为 magnet:? 且原文对应区间与 URL 一致，排除裸 hash 自动转磁力以及 HTTP(S)/FTP/ed2k/thunder；混合文本只保留磁力、单次去重。原生 dispatch、登录/开关检查、自身复制忽略、分享链接/口令 handler、手动云添加均保持。
- 每个进程首次安装 matcher 后，通过原生设置仓库 patchGeneral({clipboardAutoDetectEnabled:true}) 开启并保存开关；重复安装不强行开启用户已手动关闭的开关。版本定位失败、原生轮询超时或开启失败明确报错，不宣称成功；开启失败时已安装的严格 matcher 保留。此限制是进程内注入，直接启动官方应用不加载限制；每次重启需经新版助手启动。
- `open-guangya-devtools.mjs` 在既有窗口就绪后安装并确认限制，再继续原有注入/系统磁力弹窗。`--magnet` 暖启动也校验该安装，但不重注入业务窗口。`AGENTS.md` 补充模块入口、作用边界和自检命令。
- 离线验证：`node guangya-clipboard.mjs --self-test` 及打包内置 Node 自检通过，覆盖真实 Node Inspector 的临时条件断点、严格匹配、开关幂等、分享隔离、开启失败和清理。`/private/tmp/guangya-check-native-magnet-clipboard.mjs` 从当前安装包读取原生 watcher/parser/dispatch/handler 并隔离执行，31 项通过，包括原生图片链接可触发的反例、磁力/混合/去重、裸 hash 排除、未登录、开关关闭、分享提取码及口令 handler 保留。
- 既有磁力直达自检、适配后六项启动控制流检查、全部 JS/MJS 语法与 git diff --check 通过；`node build-app.mjs` 新版构建成功，16 份脚本含新模块，签名验证通过。
- 当前实机状态：Inspector 可用且 process.execPath 与官方光鸭路径核对一致后，经 `/private/tmp/guangya-install-magnet-clipboard.mjs` 仅安装新 matcher 并开启该开关，没有重注入业务窗口。返回 clipboardMagnetOnly=true；实际服务 isEnabled()=true，模拟文本直接调用当前 matcher 验证磁力/混合仅含磁力，图片/裸hash/ed2k 为 null，分享及口令 handler 均存在。没有改写剪贴板、调用 handler.handle/openResolver、自动触发真实解析或保存。
- 部署：当前光鸭进程已生效。`/Applications/光鸭云助手.app` 构建清单仍只有旧 15 份脚本、没有 guangya-clipboard.mjs；尚未替换安装助手。新版位于 `dist/光鸭云助手.app`，需替换安装后用于后续启动。完整系统点击/复制到真实弹窗仍由用户验收；无 Git 索引/历史修改。

## 开发与打包文档整合（2026-10-22）

- 按用户要求将 `PACKAGING_PLAN.md`、`DEVELOPMENT_GUIDE.md` 去重整合进 `AGENTS.md`，删除两份原文档；按用户补充要求控制篇幅，仅保留必要工作约束、关键模块入口、运行/构建命令和高风险行为边界；详细功能说明不搬入 AGENTS.md。
- 对照当前源码修正旧说明：默认不打开 DevTools；排序 observer 持续连接并支持菜单返回首页恢复；补充现有构建入口与磁力直达弹窗。去掉过期实施勾选、固定脚本数量和重复历史证据，历史记录仍保留在本文件。
- 验证：核对整合内容与两份原文档，检查当前菜单/启动/构建/排序实现；文档结构、文件删除、活动文档无旧文件引用及 `git diff --check` 检查通过。仅改文档，未运行客户端/构建、未操作真实云盘或 Git 索引/历史。

## 点击磁力由助手直达云添加，取消剪贴板桥（2026-10-22）

- 用户确定改为关闭原生磁力剪贴板识别，由助手接收系统磁力并弹窗；随后明确该开关已自行关闭。取代此前“替换 cloud-add-link matcher”待确认方案。本轮不读写任何原生设置，不改分享识别或手动云添加。
- 新增 `guangya-magnet.mjs`：校验显式 `magnet:?`、去重并保留原字符串与百分号编码，经已存在的主进程 Inspector 找到 main.html 窗口，调用原生 `window.api.xbase.login.getStatus` 与 `window.api.cloudAdd.openResolver({source:'assistant', urls})`；不读写剪贴板，不创建保存任务。未登录提示登录后再点击，窗口初始化中有限重试，原生错误直接报告。
- `open-guangya-devtools.mjs` 新增 `--magnet <URL...>`：参数在启动动作之前校验；光鸭未运行仍走原有启动及注入，再开弹窗；已运行则仅调用弹窗，不重注入已有窗口。既有 Inspector 不可连接时沿用原错误提示，需正常退出光鸭后经助手启动。
- `macos-launcher.m`：删除 NSPasteboard 写入与磁力提前退出，URL 按参数数组交给内置 Node；等待 Node 时保持 NSApp run，后续 URL 入队后分批处理；初始 0.6 秒定时器使用后 invalidate，避免干扰后续事件循环。正常启动注册默认处理程序逻辑保留；磁力唤起不重复注册。
- 验证：`node guangya-magnet.mjs --self-test` 及产物内置 Node 自检通过，覆盖非磁力拒绝、同文去重、编码/引号安全、登录与加载状态、原生拒绝、无窗口/登录窗口等；`/private/tmp/guangya-check-magnet-startup.mjs` 六种启动控制流检查通过；`/private/tmp/guangya-test-magnet-receiver.m` 编译执行通过，直接调用实际 delegate 验证原生接收队列、非磁力过滤、编码保留、下一批入队。此接收检查未经过 LaunchServices 实际 URL 投递。
- `clang -fsyntax-only -fobjc-arc -Wall -Wextra -Werror macos-launcher.m`、脚本语法、`git diff --check` 通过；`node build-app.mjs` 生成 arm64/macOS 13.5+ 新版 `dist/光鸭云助手.app`，打包内含新模块，自带签名验证通过。同步更新 PACKAGING_PLAN.md。
- 部署状态：尚未替换 `/Applications/光鸭云助手.app`，安装版仍是旧行为；新版需替换安装后生效。未启动/attach/刷新真实光鸭、未触发联网解析或真实导入、未操作真实剪贴板、未改官方安装包或 Git 索引/历史。真实冷启动、连续系统点击及原生解析窗口仍待用户验收。

## 复核已实现的磁力默认处理程序集成（2026-10-22）

- 本轮按用户转向仅分析 2026-10-21 已有功能，未实施前一项“剪贴板仅磁力”方案。核对 macos-launcher.m、build-app.mjs、open-guangya-devtools.mjs 与已安装助手 Info.plist；安装产物确有 local.guangya.assistant / magnet scheme，codesign --verify --deep --strict 通过；源文件 clang 语法与构建脚本 node --check 通过。
- 流程：正常启动先最多等待 0.6 秒 URL 事件，未收到则注册 magnet 默认处理程序并进入正常启动/注入；收到磁力 URL 则按 scheme（忽略大小写）筛选，同一回调多 URL 换行拼接，clearContents 后写入 NSPasteboard，成功就立即退出，不运行 Node、不启动光鸭、不注入、不弹通知、不写正常启动日志。
- 与原生识别关系：仅充当系统 magnet URL 到剪贴板的桥；不会限制光鸭原生的 HTTP(S)/FTP/ed2k/thunder/hash 识别，因此不能解决普通复制触发云添加的问题。需光鸭已运行、已登录、开关开启且剪贴板文字相较轮询基线变化，才有后续自动弹窗。
- 静态边界：只校验 magnet scheme，不校验 magnet:? 结构或 hash；clearContents 后 setString 失败会丢原剪贴板且回落正常启动；0.6 秒后事件循环停止，晚到 URL 不保证被接收，等待 Node 退出阶段也不持续接收；多个独立回调分别覆盖剪贴板而非排队。以上未作新实机触发。
- 默认设置校验有缺口：已登记相同 bundle id 即跳过，不区分应用副本；设置后仅比较路径是否变化，未严格验证新路径确为本应用，存在日志误判可能。未修复。
- 本轮 NSWorkspace 只读查询在当前工具环境未解析到默认应用，不能据此确认系统登记缺失，也不能沿用旧记录声称当前默认路径仍是 /Applications/光鸭云助手.app。未调用设置接口、打开 magnet URL 或操作真实剪贴板。

## 剪贴板云添加限制为显式磁力链接：方案待确认（2026-10-22）

- 用户要求将“自动识别剪贴板中的磁力链接”改为只支持磁力，防止任意文件链接触发云添加。已核对主进程注入入口、构建资源收集和原生 handler；用户已有暂存内容完整保留，无 Git 修改。
- 拟定范围：通过助手主进程注入，仅替换 cloud-add-link handler 的匹配函数，只保留原文本中的显式 magnet:? 链接；不把裸 hash 自动转换为磁力，不接受 HTTP(S)/FTP/ed2k/thunder。混合文本只传磁力部分给原生后续处理，避免夹带文件直链。
- 原生登录检查、现有开关、分享链接及独立分享口令 handler、手动云添加保持。采用运行时修改，不改官方 app.asar；启动器负责安装，重复注入幂等，版本结构不匹配时明确失败。
- 代码尚未修改；brainstorming 技能要求设计先经用户确认，待确认后实施离线回归与启动器集成验证。未启动/attach 应用、操作真实剪贴板或执行云盘导入。

## 两项剪贴板开关完整识别范围（2026-10-22）

- 新增 `CLIPBOARD_ANALYSIS.md`，列出磁力/裸 hash/电驴/迅雷/FTP、HTTP(S) 九类全部实际有效扩展名、分享链接正式/测试 origin、path/code 提取、分派优先级及文本边界；仅分析，业务代码与安装包未改。
- 重要补充：第三个 share-code handler 没有 isEnabled，不受这两项开关控制；需登录，对到达此阶段的非空文本整段查询 `/userres/v1/search_share_code`，由服务端判定口令；自己账号的口令可被静默处理。分享链接 handler 成功后继续，云添加成功后停止。
- 文件类型表的 Pages、Keynote 因表项大写、扩展名读取小写而实际不命中；HTTP(S) 类型10（html/chm/mht/vb/vbs/bat/py/rb）不在云添加自动检测范围。FTP 另用规则，仅排除目录及 htm/html，无扩展名也可命中。
- 正式分享 origin 仅 https://www.guangyapan.com、https://staging.guangyapan.com，测试环境仅 https://test.guangyapan.com；路径寻找首个小写 s 后一段，仅 query.code 作为提取码，一段文本仅取首个分享链接。未读取用户当前环境/开关。
- 安装包当前主进程源码与此前提取副本逐字一致；`/private/tmp/guangya-clipboard-analysis/all-rules.cjs` 306 项离线检查通过，另验证口令 handler 无开关/任意文本匹配/需登录。未操作真实剪贴板、客户端、网络解析或云盘导入，无 Git 修改操作。

## 非 magnet 图片链接触发云添加（2026-10-22）

- 用户提供 HTTPS `.webp` 链接询问为何弹云添加。原生设置名为“自动识别剪贴板中的磁力链接”，但对应 cloud-add-link handler 实际同时接受磁力、电驴、迅雷、FTP 及受支持扩展名的 HTTP/HTTPS 文件直链。
- 原生 an 图片扩展名表含 webp，aT 返回类型 1，cy 的 cp 集合包含 1，因此此链接直接以 HTTPS 图片直链通过筛选，不是文件名 hash 被误认成磁力；URL 内 hash 已被已提取链接范围覆盖，裸 hash 兜底不会重复提取。
- 隔离 VM 提取原生类型表、aT、l6、cy 检查：用户原始 webp URL 命中，普通 page.html 不命中。未运行客户端、操作真实剪贴板、请求解析或导入；业务代码未改。图片网页读取失败，结论针对用户提供的 URL 文本本身，不声称看过图片内容。

## 原生剪贴板监听与磁力识别分析（2026-10-22）

- 范围：只读核对 `/Applications/光鸭云盘.app/Contents/Resources/app.asar`（package.json 版本 1.1.0）与项目启动器；未启动/attach/刷新应用，未读写真实剪贴板、请求资源解析或执行云盘导入，未改业务代码、安装包或 Git 索引/历史。
- 原生主进程 `out/main/index.cjs`：字符偏移约 1597200 的 `nM.startWatching` 每 1000ms 调用 Electron clipboard.readText，启动时记录基线，只处理后续文本变化；`nL` 忽略空白、忽略经自身 copyToClipboard 写入的文本（统一换行后比较）。不含前台窗口判断；同一文本重复复制不触发，启动前已有内容及登录/开关恢复不会主动重扫；一秒内多次变化可漏中间值。
- 约 2029221：注册分享链接 priority=10、云添加 priority=20、分享口令 priority=30，均需登录。分享链接处理后允许继续；云添加命中后停止后续处理。云添加由 general.clipboardAutoDetectEnabled 控制，默认 true；分享链接另有 clipboardShareLinkAutoDetectEnabled，默认 true。这里只确认默认值，未读取用户当前设置。
- 约 1658350 的 l6：提取 magnet/http/https/ed2k/thunder/ftp 文本与裸 40 位十六进制、32 位 Base32 hash，裸 hash 转 magnet:?xt=urn:btih:；单次按字符串去重。约 1672000 的 cy/cg：磁力主要按 magnet:? 前缀筛选，未校验 btih 有效性，最终交服务端解析；HTTP/HTTPS 自动检测额外限制文件类型，FTP 排除目录和 html。
- 约 1675000 的 cC.createClipboardHandler/openResolver：打开独立 cloud-add 窗口，source=clipboard；同 URL 顺序与目标目录组合复用现有窗口，不是全局永久去重。渲染入口 out/renderer/static/js/cloud-add.b9adb5e8.js 约 11073 起读取启动参数并自动请求解析，约 5700 起提交回调在用户选择文件/目录并确认后创建任务；识别不等于自动保存。
- 与助手关系：macos-launcher.m 的 MagnetReceiver 仅将系统 magnet URL 写入 NSPasteboard 并退出，不启动光鸭、不直接调用云添加。故助手外部链接路径依赖原生客户端已启动、登录、识别开关开启，并有不同于轮询基线的文本变化。
- 离线验证：`/private/tmp/guangya-clipboard-analysis/check.cjs` 从安装包原文提取 parser/watcher，8 组解析用例与监听基线/变化检查全部通过。确认 `链接magnet:?xt=urn:btih:<40位hash>&dn=example` 不能按完整 URL 提取，只由裸 hash 兜底，dn 等附加参数丢失；中文冒号/空格分隔则完整识别。无效 hash 的 magnet:? 也能通过本地识别。检查未执行完整应用或网络路径。
- REA 静态证据：app.asar SHA-256 `df643e05ae7c2bba535fd61219d9d0fc81d14bd91b64049a43b2954a3a90b422`，parent Evidence `ev_bb38764eb8e9d14ab7c95aa34c89c4ccf0d88d56da547d3336530263ff5f3362`。4 个 unpacked 原生文件的 ASAR 声明 hash 与实际字节不符，已 record-and-continue；原因未核实，未将原生模块用于本次功能结论。功能细节来自直接读取 JS 原文及隔离 VM 检查，REA 图覆盖不完整。
- 待验证：真实前后台/睡眠恢复、实际账号设置、网络解析与用户确认导入。本轮仅分析，未修复上述行为。

## 磁力链接默认处理程序集成（2026-10-21）

- 用户要求把 `MagnetHandler.app`（AppleScript applet）的功能并入本项目。`osadecompile` 读取其 `main.scpt`，实际逻辑只有 `on open location theURL` → 写入剪贴板 + `display notification`；`Info.plist` 只声明 `magnet` URL scheme，无其他能力。
- 改动两处：`build-app.mjs` 生成的应用 `Info.plist` 增加 `CFBundleURLTypes`（`magnet`）；`macos-launcher.m` 增加 `MagnetReceiver`（`application:openURLs:` 仅接受 magnet scheme，写入剪贴板后结束事件循环并返回，不进入注入）与 `ensureMagnetHandler()`（正常启动时把本应用设为 `magnet://` 默认处理程序，已是本应用则跳过）。按用户要求不弹系统通知，磁力路径只写剪贴板、无其他提示。两份业务脚本与注入源未改动。
- 机制为实测结论：URL 事件只在 `[NSApp run]` 的事件循环中投递，手动 pump `NSRunLoop` 拿不到；正常启动以 0.6 秒计时器 `stop` 事件循环作为等待上限。`NSWorkspace setDefaultApplicationAtURL:toOpenURLsWithScheme:` 对 `/private/tmp` 等非受信位置会无错误返回却不生效，因此改为回读 `URLForApplicationToOpenURL:` 校验，未生效时在日志写明原因与「安装到 /Applications」的建议。
- 验证（本机串行实机）：`clang -fsyntax-only -Werror` 与 `node build-app.mjs` 通过，产物含 magnet 声明、`codesign --verify --deep --strict` 通过。`open magnet:...` 经默认处理程序启动后，剪贴板得到原样链接（百分号编码未被改写）、进程立即退出、未生成注入日志目录。隔离副本（改 bundle id、`open-guangya-devtools.mjs` 换为桩脚本）无 URL 启动仍执行脚本，证明注入流程未被破坏；该副本位于 `/private/tmp`，日志如实报出「系统未接受设置」。
- 现状：`dist/光鸭云助手.app` 已安装到 `/Applications`，已 `lsregister -u` 注销 dist 副本登记，`magnet://` 默认处理程序现为 `/Applications/光鸭云助手.app`。原 `MagnetHandler.app` 与旧 `/Applications` 副本由用户自行卸载，本轮未删除。注意同一 bundle id 存在多份副本时 LaunchServices 只登记其中一份，建议只保留 `/Applications` 一份。
- 未做：未启动或注入用户正在运行的光鸭云盘、未改动注入脚本与安装包、无云盘写入/删除、未执行 Git 修改操作、未恢复 tests。

## 菜单切走再回首页排序不还原（2026-10-21）

- 用户反馈：菜单切到首页外，再切回首页后排序状态未恢复。实机只读复现：进入 `#/share` 再回 `#/home` 后，缓存仍是「文件名称/降序」，页头回到原生默认「修改时间」降序，且无任何还原日志。
- 根因：`guangya-file-sort.js` 的 `finishRestore()` 在首次成功还原后即 `restoreObserver.disconnect()`，同时表头点击也会断开；还原只可能发生一次，之后表格重新挂载再没有触发点。之前几轮 VM 检查用的 MutationObserver 桩 `disconnect()` 是空实现，因此没有暴露该问题。
- 修复：删除 `finishRestore`，改为 `cancelRestore`（只清 pending 计时器并重置重试计数），监听保持连接，仅在 `destroy()` 中断开；在 `restoreSort` 增加重试上限 3 次，避免原生拒绝缓存时随 DOM 变更无限重排。还原语义、匹配校验、警告与失败日志均未改动。
- 验证：新增临时 VM 回归 `/private/tmp/check-guangya-sort-nav.mjs`（MutationObserver 桩真实生效），对修复前副本跑出“还原后监听必须保持连接”失败即复现根因，对修复后脚本通过：首次注入还原、离开返回还原、连续 3 轮切换、无关 DOM 变更不重排、用户排序后切换、销毁停止、无排序状态不报错、失败重试上限。原有表头/缓存/独立卸载模拟检查（适配当前文件名的副本）全部通过，`node --check` 与 `git diff --check` 通过。
- 实机：`--attach` 注入修复版后，两轮真实导航（首页 → 分享 → 首页）均还原到缓存排序，日志为「排序缓存已还原」且无失败告警；静置 4 秒无重复还原、无持续重排，行数 5 与该目录一致。实测每轮返回首页会触发 2 次还原（间隔约 20ms，原生挂载后自身重置导致），随后收敛，属既有重挂载行为，未再改动。
- 未修改安装包、未恢复 tests、未执行任何 Git 修改操作；未做云盘写入/删除。`DEVELOPMENT_GUIDE.md` 第 105 行仍写「缓存及一次恢复」，与实际不符，待用户确认后同步。

## 应用打包与手动开发者工具方案（2026-10-21）

- 用户要求打包应用，默认不打开开发者工具，并从应用菜单手动打开。已核对启动器：目前自动openDevTools且依赖其打开成功，需一并调整等待条件。
- 已生成PACKAGING_PLAN.md，推荐内置Node与正式脚本的本机启动器app，保留官方安装包，菜单注册在光鸭云盘主进程。当前Node仅依赖系统动态库；打包时继续核对架构。
- 设计待用户确认，尚未修改业务/启动器或生成app；未启动/重注入用户应用，无云盘写入和Git修改。

## 全面功能分析与最终开发指导（2026-10-21）

- 新增 `DEVELOPMENT_GUIDE.md`，以当前13份正式JS/MJS为准，覆盖五项业务、分页/排序、共享选择、启动/注入、公共UI、TMDB桥、API契约、清理与停止语义、恢复步骤、优先级和验收矩阵。未修改业务源码、安装包或Git索引/历史。
- 本轮读取安装应用Info.plist确认1.1.0，执行环境Node v24.14.0；Electron38仅为既有历史记录，本轮未重新验证。未启动/attach/刷新用户应用，真实网络请求及云盘写入/删除均0次。
- `/private/tmp/guangya-functional-analysis.mjs`临时离线检查12项通过：500项当前提交树选择/缺失保护、导出GCID及路径往返、导入校验/code156/未知结果不重复提交、三种重命名及停止、媒体解析/ID冲突、剧集翻页和英文译名、电影10MiB边界/无年份匹配、同季批量移动/改名/附件源目录清理、电影日志字段限制。13份脚本语法、工作区及已暂存差异空白检查通过；没有恢复tests目录。临时检查非稳定项目入口。
- 明确当前边界：无年份仍允许唯一精确候选自动匹配；电影仅取搜索首页前10候选，无剧集式未取全保护；源目录清理会连带删除小文件/附件；停止后的pending不保证文件仍在源目录；电影日志投影遗漏title/original_title（符合当前指定字段，未擅自修改）。
- 已修正文档中失效的当前入口说明：pageSize=500、排序文件为guangya-file-sort.js、重命名三种规则、tests及--check已删除。真实大目录UI、冷启动排序、服务端冲突/任务/删除恢复和版本升级兼容性仍待对应验收；历史用户反馈不等于本轮实机验证。

## 大目录全选后整理剧集误报未选择（2026-10-21）

- 用户反馈上百文件/目录全选后，“整理剧集”偶发提示请先选择剧集文件夹。追踪剧集/电影/重命名/导出共用的 guangya-export.js getSelection，发现原实现沿 DOM Fiber.return 直接读取 selectedItems/dataSource，可能读到旧提交。实机临时全选/取消复现：原生已取消、selectedItems=0，旧 getSelection 仍返回11项；结束后恢复原选择，未触发业务整理。
- getSelection 改为沿 root.stateNode.current 的 child/sibling 关系寻找 DOM 对应的当前 Fiber（含 alternate），同时携带已提交树中的列表祖先 props；不沿复用子节点可能陈旧的 return 链读取数据。selectedItems 和 dataSource 来自同一提交，保留离屏选择、ID字符串归一化、缺失条目报错及返回浅拷贝。只修改共用读取函数，不改剧集过滤或真实整理流程。
- 临时 Node VM 先复现500项全选但读取旧空选择，修复后覆盖500项混合文件/目录、离屏ID、旧空/旧非空、复用子节点旧return、数据源切换、数值ID、缺失信息保护与浅拷贝，全部通过。JS 语法和 git diff --check 通过。
- --attach 成功加载，实机全选/取消两轮原生与读取数量均为11/0，原11项含10目录，结束恢复原选择。真实上百项UI和实际整理仍待用户验证；未自动执行真实整理、导入、云盘写入/删除，未恢复 tests 或执行 Git 修改操作。保留用户 guangya-file-sort.js 重命名及其他手动修改。

## 排序表头脚本独立（2026-10-21）

- 按用户要求拆出 guangya-file-list-sort.js，独立入口 window.__guangyaFileListSort，负责表头点击、localStorage 缓存、注入还原及自身监听/计时器清理。保留缓存键 __guangyaFileListSort，排序核心逐字迁移，包含上轮表格重挂载的读取修复。
- guangya-file-list.js 仅保留 pageSize=500 的 XHR 请求拦截及 window.__guangyaFileListPageSize 清理；两组件互不依赖。启动器在 file-list 后加载 file-list-sort，其余用户指定的加载顺序及手动改动保持。
- 临时模拟检查通过：表头/内部图标、缓存还原、模拟重启/重注入、重挂载、独立卸载互不影响及 pageSize=500；核心逻辑逐字对比、三文件语法和 git diff --check 通过。--attach 成功加载，实机只读确认两个独立入口存在，原缓存及实际文件名降序保持。未恢复 tests、修改安装包或执行 Git 修改操作。

## 刷新还原成功却误报失败（2026-10-21）

- 用户反馈 Command+R 后实际排序生效，但输出“排序缓存还原失败：原生排序状态未还原”。实机刷新定位：即时、微任务、下轮计时器中，捕获的旧表格 Fiber 均已脱离当前树，读取字段/方向为 null；重新定位的当前表头均为文件名称/降序。根因是还原触发表格重挂载，非提交延迟；等待不能修复旧引用。
- 在共用 nativeSort 中，旧 Fiber 无法在已提交树中定位时，从当前 header 重新定位表格 Fiber 再读取 sortState；还原结果校验及真正失败警告保留，不增加等待或重复还原。覆盖还原校验与表头点击后读取两条调用路径。保留用户本轮对请求日志及其他文件的修改。
- 临时 Node VM 检查先复现重挂载误报，修复后还原/表头点击重挂载均通过，既有表头、缓存、模拟重启、存储失败、卸载、pageSize=500 检查保持通过。JS 语法和 git diff --check 通过。
- 确认无活动弹窗后实机串行刷新复现/验证；正式脚本已 --attach 加载。修复后刷新捕获到“排序缓存已还原”，无失败日志，缓存为文件名称/降序，真实表头为文件名且图标 sorttriangledesc。临时诊断已移除；未修改安装包、恢复 tests 或执行 Git 修改操作。
