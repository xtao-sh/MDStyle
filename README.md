# MD Style

本地优先的 Markdown 到微信公众号富文本排版工具。

## 截图

![MD Style 应用截图](docs/screenshot.jpg)

## 运行

```bash
npm run dev
```

然后打开：

```text
http://localhost:4173/index.html
```

## 桌面 App

开发模式运行：

```bash
npm run app
```

打包 macOS `.app`：

```bash
npm run package
```

打包结果会输出到：

```text
release/mac-arm64/MD Style.app
```

打包 macOS `.app` 与 `.dmg`：

```bash
npm run dist
```

App 图标资源：

```text
assets/app-logo.png
assets/app-icon.icns
```

主要代码结构：

```text
index.html              页面结构与样式
assets/app.js           前端应用逻辑、Markdown 渲染、复制导出、文档库状态
assets/markdown-it.min.js 本地打包的 Markdown 解析器
electron/main.js        Electron 主进程、窗口与安全策略
electron/preload.js     受限剪贴板桥接
scripts/smoke-tests.mjs 回归冒烟测试
```

## 测试

```bash
npm test
```

测试会检查前端脚本语法、Electron 主进程/preload 语法、Markdown/URL/颜色清洗、复制导出关键规则、状态迁移和整库导入导出入口。

## License

MIT

## 已实现

- 左侧 Markdown 可编辑，右侧公众号样式实时预览。
- 本地文档库，支持目录、标签、搜索、排序、自动保存。
- 样式库，支持内置样式、收藏、缩略预览、悬浮大预览、应用后实时切换。
- 自定义生成样式并保存到“我的样式”。
- 一键复制富文本到剪贴板。
- 复制 HTML 源码、下载 HTML、下载 Markdown。
- 导出/导入完整文档库 JSON，用于本地备份和迁移。
- 兼容性检查：危险 HTML、图片、表格、代码块、标题长度、HTML 体积。
