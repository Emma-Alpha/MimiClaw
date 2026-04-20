# MimiClaw 中文文档迁移说明

中文主文档已迁移至 [README.md](README.md)。

请直接阅读：

- [README.md](README.md)

最新补充：主窗口侧边栏已调整为固定三分类（线程 / OpenClaw / 实时语音），并在顶栏保留侧边栏切换按钮悬停提示（含 `Cmd/Ctrl + B` 快捷键提示）；Mini Chat / 线程会话顶栏与托盘菜单支持显示“当前正在运行的 agent / 线程”动态状态（含会话跳转），线程页右上角还可通过按钮或 `Cmd/Ctrl + J` 切换底部终端面板，并支持直接输入命令与保留 shell 会话上下文；macOS 菜单栏改为圆环 + 百分比压力指示（异常态显示 `ERR`），左/右键均弹原生菜单，菜单顶部显示“会话活跃度压力值 + 网关状态”，并展示最多 5 条运行会话；托盘菜单/面板互斥并带短时去重，程序化提醒在主窗口或终端前台时会自动抑制；新增“兜底配置包”能力，可将语音对话/ASR/Gateway 关键配置导出为本地加密文件，并在首次初始化时输入口令自动预填。设置页导出改为页面内口令输入交互，不再依赖系统 prompt；打包时将 `default-fallback-profile.json` 放入 `resources/fallback/` 即可让分发版本在首启时直接读取内置兜底包。

Skills 技能页：技能商店使用 `npx skills`（skills.sh）搜索与安装；需要时可在 `~/.mimiclaw/runtime/node` 自动准备 Node 运行时（详见 [README.md](README.md) 执行能力一节）。

Plugins 页面：当前聚焦 OpenClaw 插件安装与 MCP 插件展示，独立 Channels 页面已移除；公共 MCP 已内置 Pencil 与 Figma 快速接入。

补充：版本发布时新增了交互式脚本 `pnpm run version:select`，可直接选择 `patch / minor / major`。
