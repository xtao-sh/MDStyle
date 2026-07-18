# MD Style

[![Build Desktop Releases](https://github.com/xtao-sh/MDStyle/actions/workflows/build-macos.yml/badge.svg)](https://github.com/xtao-sh/MDStyle/actions/workflows/build-macos.yml)
[![Latest Release](https://img.shields.io/github/v/release/xtao-sh/MDStyle?display_name=tag)](https://github.com/xtao-sh/MDStyle/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-2f5d4f.svg)](LICENSE)

把 Markdown 转换成可发布富文本，并为内容、商业、教学、研究和个人文档提供结构与视觉模板。

MD Style 是一个本地优先的 Markdown 排版编辑器：左侧编写或粘贴 Markdown，右侧实时预览，选择文档模板与视觉主题后，一键复制为带格式的富文本，再粘贴到微信公众号、邮件或其他富文本编辑器中。

它主要解决三个问题：

- Markdown 原文粘贴到公众号后台会丢失结构和样式。
- 公众号编辑器对 HTML 和 CSS 兼容性有限，复杂样式需要转换成更稳的内联格式。
- 多种文档场景、多篇文章、多个视觉主题和本地草稿需要统一管理。

适合公众号作者、内容团队、课程讲义作者、Newsletter 作者，以及经常用 Markdown 写作但需要发布到富文本平台的人。

## 截图

![MD Style 应用截图](docs/screenshot.jpg)

## 下载

前往 [GitHub Releases](https://github.com/xtao-sh/MDStyle/releases/latest) 下载最新版：

- macOS Apple Silicon / Intel：`.dmg` 或 `.zip`，ZIP 解压后为 `.app`。
- Windows x64：安装版或便携版 `.exe`。
- `SHA256SUMS.txt`：用于校验下载文件完整性。

公开构建暂未配置 Apple Developer ID 或 Windows 代码签名证书，首次打开时系统可能显示安全提示。

## v0.2.0 更新

- 新增 22 套多场景文档模板、个人模板和 30 套分级视觉主题。
- 新增字体、段落、引用、代码、表头和链接等系统化样式调整。
- 修复窄屏换行、段落重叠、多级列表缩进及复杂背景复制保真。
- 增加 Markdown 强调增强识别、三种发布目标和更完整的兼容性检查。
- 完善目录与标签管理、双存储冲突处理、安全快照及桌面历史恢复。
- 完善 1320px 以下抽屉布局、键盘操作和移动端适配。

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

本机架构的 `.app` 会输出到：

```text
release/mac-arm64/MD Style.app
```

打包 macOS `.app` 与 `.dmg`：

```bash
npm run dist
```

分别打包 Apple Silicon 与 Intel Mac：

```bash
npm run dist -- --arm64 --publish never
npm run dist -- --x64 --publish never
```

在 Windows 主机打包安装版和便携版 `.exe`：

```bash
npm run dist:win -- --x64 --publish never
```

推送 `v*` 标签时，GitHub Actions 会自动构建并发布：

- macOS Apple Silicon / Intel `.dmg`
- macOS Apple Silicon / Intel `.zip`，解压后为 `.app`
- Windows x64 安装版 `.exe`
- Windows x64 便携版 `.exe`

当前公开构建未配置 Apple Developer ID 或 Windows 代码签名证书，因此系统首次打开时可能显示安全提示。

App 图标资源：

```text
assets/app-logo.png
assets/app-icon.icns
assets/app-icon.ico
```

主要代码结构：

```text
index.html              页面结构与前端资源装配
assets/app.css          工作台、文档库与响应式基础样式
assets/app.js           前端状态协调、交互绑定与视图渲染
assets/markdown-it.min.js 本地打包的 Markdown 解析器
assets/markdown-engine.js Markdown 增强识别、URL 清洗与 HTML 渲染
assets/document-templates.js 多场景文档模板、推荐主题与结构校验
assets/publishing-profiles.js 发布目标元数据与平台兼容阈值
assets/library-model.js 文档库初始状态、数据校验与版本兼容迁移
assets/wechat-exporter.js 保守富文本样式内联与 DOM 清洗（兼容旧模块名）
assets/theme-catalog.js  内置主题元数据、缩略图与结构校验
assets/themes.css        内置主题和文档级样式覆盖
electron/main.js         Electron 主进程、窗口与安全策略
electron/preload.js      受限剪贴板和文档存储桥接
electron/library-storage.js 原子保存、备份轮换与安全快照
scripts/smoke-tests.mjs  模块、迁移与安全回归测试
scripts/storage-tests.mjs 存储可靠性测试
scripts/verify-copy-export.mjs Electron 富文本复制集成测试
```

## 测试

```bash
npm test
```

测试会检查各前端模块与 Electron 进程语法、Markdown/URL/颜色清洗、字符串 ID 迁移、存储版本冲突、原子备份、恢复历史和整库导入导出入口。

完整启动 Electron 渲染进程，验证富文本内联样式、嵌套列表、组件背景、窄屏交互、自动保存状态与最终导出体积：

```bash
npm run test:copy
```

## License

MIT

## 已实现

- 左侧 Markdown 可编辑，右侧按目标平台实时预览。
- 本地文档库，支持目录、标签、搜索、排序、自动保存，并可重命名、移动、编辑或删除标签。
- 浏览器与桌面文件采用带时间和 revision 的双存储；桌面版额外提供原子写入、三份轮换备份、安全快照和历史恢复。
- 22 套文档模板，覆盖内容发布、产品运营、商业协作、教育研究、个人成长和活动创意。
- 可将当前文档保存为个人模板，后续可编辑模板信息或用当前文档刷新模板内容，并随文档库备份、恢复和迁移。
- 30 套视觉主题，归入 7 个视觉家族，并可按“稳健 / 鲜明 / 先锋”强度筛选。
- 样式库支持收藏、缩略预览、悬浮大预览、应用后实时切换。
- 可视化创建个人样式，支持 7 组字体预设、字号、行距、标题结构和完整配色。
- “整体调整”按字体标题、页面段落和内容组件分组，可统一修改标题、正文字体、文字色、段落背景与间距、引用、代码、表头和链接。
- 可切换通用富文本、微信公众号、邮件 / Newsletter 三种发布目标及检查规则。
- 一键复制富文本到剪贴板。
- 复制器会内联字体、间距、背景、边框、阴影和装饰元素，并将多级列表转换为带稳定缩进的富文本结构。
- Markdown 增强识别可处理中文全角强调符号、强调符号内侧误加空格及词内双下划线，同时避开行内代码和围栏代码块。
- 复制 HTML 源码、下载 HTML、下载 Markdown。
- 导出/导入完整文档库 JSON，用于本地备份和迁移。
- 导入前自动创建安全快照，并支持恢复导入前文档库。
- 删除文档、目录、模板、样式及整库替换均使用统一的应用内确认，支持键盘取消。
- 兼容性检查：危险 HTML、远程/Base64/本地图片、表格、代码块、标题长度、HTML 体积；支持通用、公众号和邮件三套阈值。
- 低于 1320px 时文档库和设置区切换为带遮罩、焦点管理和键盘关闭的抽屉。
