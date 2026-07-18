import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import vm from "node:vm";
import MarkdownIt from "markdown-it";

const html = fs.readFileSync("index.html", "utf8");
assert.ok(html.includes('assets/markdown-it.min.js'), "index.html must load bundled markdown-it");
assert.ok(html.includes('assets/theme-catalog.js'), "index.html must load the validated theme catalog");
assert.ok(html.includes('assets/document-templates.js'), "index.html must load the document template catalog");
assert.ok(html.includes('assets/publishing-profiles.js'), "index.html must load publishing target profiles");
assert.ok(html.includes('assets/markdown-engine.js'), "index.html must load the Markdown engine");
assert.ok(html.includes('assets/library-model.js'), "index.html must load the library model");
assert.ok(html.includes('assets/wechat-exporter.js'), "index.html must load the WeChat exporter");
assert.ok(html.includes('assets/themes.css'), "index.html must load extracted theme styles");
assert.ok(html.includes('assets/app.css'), "index.html must load extracted application styles");
assert.ok(html.includes('assets/app.js'), "index.html must load extracted application script");
for (const dependency of ["theme-catalog.js", "document-templates.js", "publishing-profiles.js", "markdown-engine.js", "library-model.js", "wechat-exporter.js"]) {
  assert.ok(html.indexOf(`assets/${dependency}`) < html.indexOf('assets/app.js'), `${dependency} must load before the application`);
}
assert.ok(!html.includes("MD Style functional MVP"), "index.html must not contain the application script body inline");
assert.ok(!html.includes("<style>"), "index.html must not contain the application stylesheet inline");

const script = fs.readFileSync("assets/app.js", "utf8");
const themeScript = fs.readFileSync("assets/theme-catalog.js", "utf8");
const templateScript = fs.readFileSync("assets/document-templates.js", "utf8");
const profileScript = fs.readFileSync("assets/publishing-profiles.js", "utf8");
const markdownScript = fs.readFileSync("assets/markdown-engine.js", "utf8");
const modelScript = fs.readFileSync("assets/library-model.js", "utf8");
const exporterScript = fs.readFileSync("assets/wechat-exporter.js", "utf8");
const appCss = fs.readFileSync("assets/app.css", "utf8");
const themeCss = fs.readFileSync("assets/themes.css", "utf8");
for (const file of ["assets/app.js", "assets/theme-catalog.js", "assets/document-templates.js", "assets/publishing-profiles.js", "assets/markdown-engine.js", "assets/library-model.js", "assets/wechat-exporter.js"]) {
  execFileSync("node", ["--check", file], { stdio: "inherit" });
}
execFileSync("node", ["--check", "electron/main.js"], { stdio: "inherit" });

const builtinIds = [...themeScript.matchAll(/\{ id:"([^"]+)", cls:"theme-[^"]+", name:"[^"]+", cat:"[^"]+"/g)].map(match => match[1]);
assert.deepEqual(builtinIds, ["default", "product", "brief", "course", "checklist", "campaign", "column", "essay", "academic", "tech", "mag", "notice", "report", "interview", "newsletter", "mono", "soft", "nature", "classic", "deck", "brutalist", "editorial", "bauhaus", "cyber", "luxury", "riso", "comic", "blueprint", "memphis", "festival"], "built-in styles should cover broad non-duplicative publishing scenarios");
assert.ok(themeScript.includes("const legacyReplacements"), "removed built-in styles must migrate to replacement styles");
assert.ok(themeScript.includes("function validateCatalog"), "theme catalog must validate ids, swatches, metadata, and thumbnails");
builtinIds.forEach(id => assert.ok(themeCss.includes(`.theme-${id}`) || id === "default", `theme CSS must include ${id}`));
assert.ok(!html.includes(".theme-product .article"), "built-in theme CSS must not remain embedded in index.html");
assert.ok(!html.includes(".thumb.t-product"), "theme thumbnail CSS must not remain embedded in index.html");

const catalogContext = {};
vm.createContext(catalogContext);
vm.runInContext(themeScript, catalogContext);
vm.runInContext(templateScript, catalogContext);
vm.runInContext(profileScript, catalogContext);
const catalog = catalogContext.MDStyleThemeCatalog;
assert.equal(catalog.themes.length, 30);
assert.ok(Object.isFrozen(catalog) && Object.isFrozen(catalog.themes), "theme catalog must be immutable at runtime");
assert.deepEqual([...catalog.families], ["清爽通用", "长文阅读", "商务专业", "知识教程", "媒体叙事", "品牌活动", "先锋实验"]);
catalog.themes.forEach(theme => {
  assert.equal(theme.cls, `theme-${theme.id}`);
  assert.equal(theme.swatches.length, 4);
  assert.ok(catalog.families.includes(theme.family));
  assert.ok(["稳健", "鲜明", "先锋"].includes(theme.intensity));
  assert.ok(catalog.thumbnails[theme.id], `theme ${theme.id} must provide a thumbnail`);
});
assert.equal(catalog.themes.filter(theme => theme.intensity === "先锋").length, 10, "style catalog must include a substantial experimental tier");

const templateCatalog = catalogContext.MDStyleDocumentTemplates;
assert.equal(templateCatalog.templates.length, 22);
assert.ok(Object.isFrozen(templateCatalog) && Object.isFrozen(templateCatalog.templates), "template catalog must be immutable at runtime");
const templateIds = new Set();
templateCatalog.templates.forEach(template => {
  assert.ok(!templateIds.has(template.id), `template id ${template.id} must be unique`);
  assert.ok(catalog.themes.some(theme => theme.id === template.styleId), `template ${template.id} must reference a built-in style`);
  assert.ok(["general", "wechat", "email"].includes(template.targetId), `template ${template.id} must reference a publishing target`);
  assert.match(template.markdown, /^# /);
  assert.ok(template.outline.length >= 2);
  templateIds.add(template.id);
});
assert.deepEqual([...new Set(templateCatalog.templates.map(template => template.cat))].sort(), ["个人成长", "产品运营", "内容发布", "商业协作", "教育研究", "活动创意", "通用"].sort());
const publishingProfiles = catalogContext.MDStylePublishingProfiles;
assert.deepEqual([...publishingProfiles.ids], ["general", "wechat", "email"]);
assert.equal(publishingProfiles.get("missing").id, "general");
assert.equal(publishingProfiles.normalizeId("wechat"), "wechat");
assert.ok(html.includes('id="style-search"'), "style library must support search");
assert.ok(html.includes('id="style-category"'), "style library must support category filtering");
assert.ok(html.includes('id="style-intensity"'), "style library must support visual intensity filtering");
assert.ok(html.includes('id="template-grid"'), "app must provide a document template gallery");
assert.ok(html.includes('id="template-category"'), "document templates must support scenario filtering");
assert.ok(html.includes('id="save-template"') && html.includes('id="template-builder"'), "users must be able to save personal templates");
assert.ok(html.includes('id="template-refresh-content"') && html.includes('id="submit-template"'), "personal templates must support metadata and content updates");
assert.ok(html.includes('id="style-builder"'), "custom styles must use a visual editor");
assert.ok(html.includes('id="target-profile"'), "compatibility checks must expose the publishing target");
assert.ok(html.includes('id="library-editor"'), "library metadata actions must use an in-app editor");
assert.ok(html.includes('id="confirm-dialog"'), "destructive actions must use an in-app confirmation dialog");
assert.ok(script.includes("function renderTemplateLibrary"), "app must render the template catalog");
assert.ok(script.includes("function createDocumentFromTemplate"), "app must create documents from templates");
assert.ok(script.includes("function saveCurrentAsTemplate"), "app must persist documents as personal templates");
assert.ok(script.includes("function deleteCustomTemplate"), "app must delete personal templates");
assert.ok(script.includes("function deleteCustomStyle"), "app must delete personal styles safely");
assert.doesNotMatch(script, /\bprompt\s*\(/, "application workflows must not use native prompt dialogs");
assert.doesNotMatch(script, /\bconfirm\s*\(/, "application workflows must not use native confirm dialogs");
assert.ok(script.includes("function openLibraryEditor"), "document, directory, and tag metadata must use the sidebar editor");
assert.ok(script.includes("function confirmAction"), "destructive workflows must share the app confirmation controller");
assert.ok(script.includes('data-template-edit'), "personal template cards must expose editing controls");
assert.ok(html.includes('id="override-heading"'), "style panel must support heading-wide overrides");
assert.ok(html.includes('id="override-font"'), "style panel must support body font overrides");
assert.ok(html.includes('content="width=device-width, initial-scale=1"'), "web app must use device-width viewport instead of a fixed desktop viewport");
assert.ok(appCss.includes("@media (max-width: 1320px)"), "web app must provide a narrow-screen layout before the three-pane workspace becomes cramped");
assert.ok(appCss.includes("[hidden]{display:none !important}"), "component display rules must not reveal hidden desktop-only controls");
assert.ok(appCss.includes(".library,#right{"), "narrow-screen drawer styles must target the right panel explicitly");
assert.doesNotMatch(appCss, /\.library,\s*\.right\s*\{/, "generic .right action groups must not become mobile drawers");
assert.ok(html.includes('id="drawer-backdrop"'), "narrow-screen drawers must provide a dismissible backdrop");
assert.ok(html.includes('data-library-action="add-directory"'), "library actions must use stable data attributes");
assert.ok(html.includes('data-export-action="copy-rich"'), "export actions must use stable data attributes");
assert.ok(html.includes('id="toggle-wrap"'), "editor wrap control must have a stable binding");
assert.ok(html.includes('id="toggle-editor-fullscreen"'), "editor fullscreen control must have a stable binding");
assert.ok(html.includes('id="toggle-preview-fullscreen"'), "preview fullscreen control must have a stable binding");

const markdownContext = { console, markdownit:(options) => new MarkdownIt(options) };
vm.createContext(markdownContext);
vm.runInContext(markdownScript, markdownContext);
const markdownApi = markdownContext.MDStyleMarkdown;
assert.ok(Object.isFrozen(markdownApi), "Markdown API must be immutable at runtime");
const { render:mdToHtml, sanitizeLinkUrl, sanitizeImageUrl } = markdownApi;

assert.equal(sanitizeLinkUrl("https://example.com/a"), "https://example.com/a");
assert.equal(sanitizeLinkUrl("http://example.com/a"), "http://example.com/a");
assert.equal(sanitizeLinkUrl("mailto:editor@example.com"), "mailto:editor@example.com");
assert.equal(sanitizeLinkUrl("tel:+8613800138000"), "tel:+8613800138000");
assert.equal(sanitizeLinkUrl("#section"), "#section");
assert.equal(sanitizeLinkUrl("../guide/readme.md?mode=preview#start"), "../guide/readme.md?mode=preview#start");
assert.equal(sanitizeLinkUrl("file:///tmp/x.md"), "#");
assert.equal(sanitizeLinkUrl("javascript:alert(1)"), "#");

assert.equal(sanitizeImageUrl("https://example.com/a.png"), "https://example.com/a.png");
assert.equal(sanitizeImageUrl("data:image/png;base64,AAAA"), "data:image/png;base64,AAAA");
assert.equal(sanitizeImageUrl("data:image/svg+xml;base64,AAAA"), "#");
assert.equal(sanitizeImageUrl("file:///tmp/a.png"), "#");
assert.ok(script.includes("const escapeAttr = escapeHtml;"), "dynamic data attributes must use the HTML escaping helper");

const rendered = mdToHtml([
  "# 标题",
  "",
  "1. **书桌（工作区 Working Directory）**：你平时写写画画的地方。",
  "2. [安全链接](https://example.com/article)",
  "",
  "![远程图片](https://example.com/a.png)",
].join("\n"));
assert.match(rendered, /<h1>标题<\/h1>/);
assert.match(rendered, /<ol>\n<li><strong>书桌（工作区 Working Directory）<\/strong>：你平时写写画画的地方。<\/li>\n<li><a href="https:\/\/example.com\/article" target="_blank" rel="noopener noreferrer">安全链接<\/a><\/li>\n<\/ol>/);
assert.match(rendered, /<img src="https:\/\/example.com\/a.png" alt="远程图片">/);
const blockedUrls = mdToHtml("[危险链接](file:///etc/passwd)\n\n![本地](file:///tmp/a.png)");
assert.doesNotMatch(blockedUrls, /(?:href|src)="file:/i);

const enhancedEmphasis = mdToHtml([
  "中文＊＊全角加粗＊＊中文",
  "",
  "正文** 前侧误加空格**正文",
  "",
  "正文**后侧误加空格 **正文",
  "",
  "正文__词内加粗__正文",
  "",
  "`代码＊＊不要加粗＊＊` 与 \\*\\*转义不要加粗\\*\\*",
  "",
  "```js",
  "const value = '＊＊代码块不要加粗＊＊';",
  "```not-a-closing-fence",
  "const next = '＊＊仍在代码块内＊＊';",
  "```",
].join("\n"));
assert.match(enhancedEmphasis, /中文<strong>全角加粗<\/strong>中文/);
assert.match(enhancedEmphasis, /正文 <strong>前侧误加空格<\/strong>正文/);
assert.match(enhancedEmphasis, /正文<strong>后侧误加空格<\/strong> 正文/);
assert.match(enhancedEmphasis, /正文<strong>词内加粗<\/strong>正文/);
assert.match(enhancedEmphasis, /<code>代码＊＊不要加粗＊＊<\/code> 与 \*\*转义不要加粗\*\*/);
assert.match(enhancedEmphasis, /const value = '＊＊代码块不要加粗＊＊';/);
assert.match(enhancedEmphasis, /const next = '＊＊仍在代码块内＊＊';/);
assert.ok(!enhancedEmphasis.includes("<strong>代码块不要加粗</strong>"));
assert.match(mdToHtml("变量 snake_case 保持原样"), /变量 snake_case 保持原样/);

const fallbackContext = { console };
vm.createContext(fallbackContext);
vm.runInContext(markdownScript, fallbackContext);
assert.match(fallbackContext.MDStyleMarkdown.render("# Fallback"), /<h1>Fallback<\/h1>/);
assert.ok(exporterScript.includes("function appendListItemInline"), "copy exporter must flatten list items before copying");
assert.ok(exporterScript.includes("global.MDStyleRichTextExporter"), "copy exporter must expose a platform-neutral API");
assert.ok(exporterScript.includes("function safeCopyPseudoNode"), "copy exporter must materialize pseudo elements for rich paste");
assert.ok(exporterScript.includes("getComputedStyle(node, pseudo)"), "copy exporter must inspect computed pseudo-element styles");
assert.ok(exporterScript.includes("function copyBackground"), "copy exporter must preserve non-text background styles");
assert.ok(markdownScript.includes("function legacyMdToHtml"), "legacy Markdown parser must remain as fallback");
assert.ok(markdownScript.includes("function getMarkdownRenderer"), "Markdown rendering must prefer markdown-it when available");
assert.ok(markdownScript.includes("function installEnhancedEmphasis"), "Markdown rendering must enhance malformed emphasis markers");
assert.ok(markdownScript.includes("function normalizeMarkdownMarkers"), "Markdown rendering must normalize full-width markers outside code");
assert.ok(exporterScript.includes('"text-indent": "-1.8em"'), "copy exporter must preserve hanging indentation for lists");
assert.ok(exporterScript.includes('"background-image":'), "copy exporter must preserve gradient/background-image styles");
assert.ok(exporterScript.includes('"border-right": copyBorder'), "copy exporter must preserve right borders");
assert.ok(exporterScript.includes('"box-shadow": isUsefulBoxShadow'), "copy exporter must preserve useful shadows");
assert.ok(!exporterScript.includes('const allowed = ["font-family"'), "copy exporter must not use old computed-style allowlist");
assert.ok(!exporterScript.includes('getPropertyValue("height")'), "copy exporter must not copy computed fixed heights");
assert.ok(!exporterScript.includes('getPropertyValue("width")'), "copy exporter must not copy computed fixed widths");
assert.ok(script.includes("function markdownWithoutCode"), "compatibility checker must ignore fenced and inline code before dangerous HTML checks");
assert.ok(script.includes("const markdownToInspect = markdownWithoutCode(doc.markdown)"), "dangerous HTML checks must use code-stripped markdown");
assert.ok(script.includes("table.rows[0]?.cells.length"), "table compatibility checker must count only the first physical row");
assert.ok(script.includes("async function writeTextClipboard"), "plain HTML copy must have a fallback clipboard writer");
assert.ok(script.includes("catch (_) {}"), "modern clipboard failures must fall back instead of aborting immediately");
assert.ok(script.includes("window.mdStyleClipboard?.writeRich"), "rich copy must prefer Electron native clipboard when available");
assert.ok(script.includes("window.mdStyleClipboard?.writeText"), "plain copy must prefer Electron native clipboard when available");
assert.match(script, /if \(window\.mdStyleClipboard\?\.writeRich\) \{\s*try \{\s*await window\.mdStyleClipboard\.writeRich/, "rich copy must fall back when the Electron bridge rejects");
assert.match(script, /if \(window\.mdStyleClipboard\?\.writeText\) \{\s*try \{\s*await window\.mdStyleClipboard\.writeText/, "plain copy must fall back when the Electron bridge rejects");
assert.ok(script.includes("function exportLibrary"), "app must support full library export");
assert.ok(script.includes("function exportedDocumentHtml"), "HTML downloads must use a complete document wrapper");
assert.ok(script.includes("async function importLibraryFile"), "app must support full library import");
assert.ok(script.includes("const sourceState = payload?.state || payload"), "library import must validate the incoming state before migration");
assert.ok(script.includes("async function backupLibraryState"), "Electron app must maintain a file backup of the document library");
assert.ok(script.includes("async function restoreElectronLibraryBackup"), "Electron app must restore the file backup when browser storage is missing");
assert.ok(modelScript.includes("function normalizeStyleOverrides"), "documents must normalize style override payloads");
assert.ok(modelScript.includes("function normalizeTargetId"), "documents must normalize publishing target ids");
assert.ok(modelScript.includes("const customTemplates = uniqueRecords"), "personal templates must be normalized with the library state");
assert.ok(script.includes("function applyStyleOverrides"), "preview must apply per-document style overrides");
assert.ok(script.includes("function colorInputValue"), "imported rgb/hsl colors must remain editable in color controls");
assert.ok(script.includes("function renderStyleCategories"), "style library must render dynamic category filters");
assert.ok(script.includes("function styleFamily"), "style filters must separate visual families from usage scenarios");
assert.ok(exporterScript.includes("copyBackground(docComputed)"), "copy exporter must preserve preview/page background");
assert.ok(exporterScript.includes("outer.appendChild(inner)"), "copy exporter must build wrapper HTML through DOM nodes");
assert.ok(script.includes("escapeAttr(dir.id)"), "directory ids must be escaped in data attributes");
assert.ok(script.includes("escapeAttr(doc.id)"), "document ids must be escaped in data attributes");
assert.ok(script.includes("escapeAttr(s.id)"), "style ids must be escaped in data attributes");
assert.ok(script.includes("backupSaved = await backupLibraryState(snapshot, savedAt, revision)"), "file backup must use an immutable queued snapshot and matching metadata");
assert.ok(script.includes('window.addEventListener("beforeunload", flushBrowserState)'), "window close must synchronously flush browser storage");
assert.ok(script.includes('createSafetySnapshot("before-import")'), "library replacement must create a safety snapshot");
assert.ok(script.includes("async function restoreImportSafetySnapshot"), "users must be able to restore the pre-import safety snapshot");
assert.ok(script.includes("function refreshExportResult"), "compatibility checks must use final inline export HTML");
assert.ok(script.includes("storageHadLocalState = false"), "corrupt browser storage must allow Electron backup recovery");
assert.ok(script.includes("setActiveDoc(state.activeDocId, false)"), "initial render must not overwrite the Electron backup before recovery");
assert.ok(script.includes("[data-export-action='copy-rich']"), "export button handlers must not depend on DOM order");
assert.ok(script.includes("[data-library-action='add-directory']"), "library button handlers must not depend on DOM order");
assert.ok(script.includes('const NARROW_LAYOUT_QUERY = "(max-width: 1320px)"'), "narrow screens must start with side panels collapsed before the workspace becomes cramped");
assert.ok(script.includes("function openRightTab"), "toolbar actions must open collapsed right-side tabs");
assert.ok(script.includes('window.addEventListener("resize", () => syncNarrowLayout(narrowLayout.matches))'), "responsive drawer state must recover when media-query change events are missed");
assert.ok(script.includes("if (!v && window.matchMedia(NARROW_LAYOUT_QUERY).matches) setRightCollapsed(true)"), "narrow document and style drawers must be mutually exclusive");
assert.ok(script.includes("function normalizeStorageRecord"), "browser and Electron storage records must share a versioned envelope");
assert.ok(script.includes("function compareStorageRecords"), "storage conflicts with equal timestamps must use revision ordering");
assert.ok(script.includes("function scanMarkdownCode"), "compatibility checks must understand backtick and tilde fenced code blocks");
assert.ok(script.includes("MAX_MARKDOWN_IMPORT_BYTES"), "Markdown import must reject unexpectedly large files");
assert.ok(script.includes("function openRecoveryBrowser"), "desktop users must be able to inspect and restore local recovery points");
assert.ok(script.includes("function syncDrawerAccessibility"), "responsive drawers must expose modal accessibility state");
assert.ok(html.includes('data-export-action="import-md"'), "Markdown import must remain available from the narrow-screen export drawer");
for (const id of ["override-paragraph", "override-paragraph-spacing", "override-quote", "override-code-bg", "override-table-header", "override-link"]) {
  assert.ok(html.includes(`id="${id}"`), `systematic style control ${id} must be available`);
}

const stateContext = { console };
vm.createContext(stateContext);
vm.runInContext(themeScript, stateContext);
vm.runInContext(modelScript, stateContext);
let generatedId = 0;
const stateModel = stateContext.MDStyleLibraryModel.create({
  themes:stateContext.MDStyleThemeCatalog.themes,
  legacyReplacements:stateContext.MDStyleThemeCatalog.legacyReplacements,
  sampleMarkdown:"# Seed\n\nBody",
  uid:() => `test-id-${++generatedId}`,
  nowIso:() => "2026-01-01T00:00:00.000Z",
  firstHeading:(markdown) => (String(markdown).match(/^#\s+(.+)$/m)?.[1] || "未命名文档").trim().slice(0, 80),
  fontPresetIds:["ui", "serif", "fangsong", "kaiti"],
  fontPresets:{ ui:"var(--ui)", serif:"var(--serif)", fangsong:"FangSong,serif", kaiti:"KaiTi,serif" },
  targetProfileIds:["general", "wechat", "email"],
  legacyTargetId:"wechat",
});
assert.ok(Object.isFrozen(stateModel), "library model API must be immutable at runtime");
const { normalizeState, normalizeCssColor } = stateModel;

assert.equal(normalizeCssColor("#123"), "#123");
assert.equal(normalizeCssColor("#112233"), "#112233");
assert.equal(normalizeCssColor("rgb(12, 34, 56)"), "rgb(12, 34, 56)");
assert.equal(normalizeCssColor("red;background:url(javascript:1)", "#000000"), "#000000");

const migrated = normalizeState({
  dirs:[{ id:"all", name:"全部文档", system:true }, { id:"uncategorized", name:"未分类" }],
  tags:[{ id:"unsafe", name:"危险", color:"red;background:url(javascript:1)" }],
  docs:[
    { id:"manual", title:"手动标题", manualTitle:true, markdown:"# 自动标题", directoryId:"uncategorized", tagIds:["unsafe"], styleId:"default", createdAt:"2026-01-01T00:00:00.000Z", updatedAt:"2026-01-01T00:00:00.000Z" },
    { id:"auto", title:"旧标题", manualTitle:false, markdown:"# 新标题", directoryId:"uncategorized", tagIds:[], styleId:"default", targetId:"general", styleOverrides:{ heading:"block", font:"kaiti", textColor:"#123456", pageBg:"bad-css" }, createdAt:"2026-01-01T00:00:00.000Z", updatedAt:"2026-01-01T00:00:00.000Z" },
  ],
  styles:[{ id:"custom", builtin:false, name:"Bad", swatches:["red;background:url(javascript:1)"], customVars:{ "--custom-primary":"url(javascript:1)" } }],
  customTemplates:[{ id:"saved-template", name:" Saved ", cat:" Personal ", description:" Reusable ", markdown:"# Saved\n\n## Section", tags:["one", "one"], styleId:"missing", targetId:"missing" }],
  activeDocId:"manual",
});
assert.equal(migrated.docs.find(d => d.id === "manual").title, "手动标题");
assert.equal(migrated.docs.find(d => d.id === "auto").title, "新标题");
assert.equal(migrated.dirs.find(d => d.id === "uncategorized").system, true);
assert.equal(migrated.tags.find(t => t.id === "unsafe").color, "#5C8A7D");
assert.equal(migrated.styles.find(s => s.id === "custom").swatches[0], "#2D2D2A");
assert.equal(migrated.docs.find(d => d.id === "manual").targetId, "wechat");
assert.equal(migrated.docs.find(d => d.id === "auto").targetId, "general");
assert.equal(migrated.customTemplates[0].styleId, "default");
assert.equal(migrated.customTemplates[0].targetId, "general");
assert.deepEqual(Array.from(migrated.customTemplates[0].tags), ["one"]);
assert.deepEqual(Array.from(migrated.customTemplates[0].outline), ["Saved", "Section"]);
assert.equal(JSON.stringify(migrated.docs.find(d => d.id === "auto").styleOverrides), JSON.stringify({ heading:"block", font:"kaiti", textColor:"#123456", pageBg:"#FFFFFF" }));

const repaired = normalizeState({
  dirs:[{ id:"all", name:"全部文档", system:false }],
  tags:[{ id:"known", name:"Known", color:"#123456" }],
  docs:[
    { id:"doc1", title:"Doc", manualTitle:true, markdown:"# Doc", directoryId:"missing-dir", tagIds:["known", "missing-tag"], styleId:"missing-style", createdAt:"bad", updatedAt:"bad" },
    { id:"doc1", title:"Duplicate", manualTitle:true, markdown:"# Duplicate", directoryId:"all", tagIds:["missing-tag"], styleId:"default" },
  ],
  styles:[{ id:"default", builtin:false, name:"Shadow", swatches:["#111111"] }],
  activeDocId:"missing-doc",
  activeDirId:"missing-dir",
  activeTagIds:["known", "missing-tag"],
  sort:"not-a-sort-mode",
});
assert.equal(repaired.activeDocId, "doc1");
assert.equal(repaired.activeDirId, "all");
assert.deepEqual(Array.from(repaired.activeTagIds), ["known"]);
assert.equal(repaired.docs[0].directoryId, "uncategorized");
assert.deepEqual(Array.from(repaired.docs[0].tagIds), ["known"]);
assert.equal(repaired.docs[0].styleId, "default");
assert.equal(repaired.docs[1].directoryId, "uncategorized");
assert.notEqual(repaired.docs[0].id, repaired.docs[1].id);
assert.equal(repaired.sort, "updated");
assert.equal(repaired.dirs.find(d => d.id === "all").system, true);
assert.equal(repaired.dirs.find(d => d.id === "uncategorized").system, true);
assert.equal(repaired.styles.filter(s => s.id === "default").length, 1);

const numericIds = normalizeState({
  dirs:[{ id:"all", name:"全部文档", system:true }, { id:42, name:"数字目录" }],
  tags:[{ id:7, name:"数字标签", color:"#123456" }],
  docs:[{ id:99, title:"Numeric", manualTitle:true, markdown:"# Numeric", directoryId:42, tagIds:[7], styleId:"default" }],
  styles:[],
  activeDocId:99,
  activeDirId:42,
  activeTagIds:[7],
});
assert.equal(numericIds.docs[0].id, "99");
assert.equal(numericIds.docs[0].directoryId, "42");
assert.deepEqual(Array.from(numericIds.docs[0].tagIds), ["7"]);
assert.equal(numericIds.activeDocId, "99");
assert.equal(numericIds.activeDirId, "42");
assert.deepEqual(Array.from(numericIds.activeTagIds), ["7"]);

const legacyStyle = normalizeState({
  dirs:[{ id:"all", name:"全部文档", system:true }, { id:"uncategorized", name:"未分类", system:true }],
  tags:[],
  docs:[
    { id:"legacy", title:"Legacy", manualTitle:true, markdown:"# Legacy", directoryId:"uncategorized", tagIds:[], styleId:"gov" },
  ],
  styles:[],
  activeDocId:"legacy",
});
assert.equal(legacyStyle.docs[0].styleId, "notice");

const malformedRecords = normalizeState({
  dirs:"not-an-array",
  tags:{ bad:true },
  docs:[null, "bad-document"],
  styles:{ bad:true },
});
assert.ok(malformedRecords.docs.length > 0, "invalid document records must fall back to the seed library");
assert.ok(malformedRecords.dirs.some(dir => dir.id === "all"));
assert.ok(malformedRecords.dirs.some(dir => dir.id === "uncategorized"));

const sanitizedCustomStyle = normalizeState({
  dirs:[{ id:"all", name:"全部文档", system:true }, { id:"uncategorized", name:"未分类", system:true }],
  tags:[],
  docs:[{ id:"custom-doc", title:"Custom", manualTitle:true, markdown:"# Custom", directoryId:"uncategorized", tagIds:[], styleId:"custom-style" }],
  styles:[{
    id:"custom-style",
    builtin:false,
    name:"Custom",
    swatches:"not-an-array",
    customVars:{ "--custom-primary":"#123456", "--custom-font":"var(--serif)", "--custom-body":"16.5px", "--custom-line":"1.9", "--custom-h1":"999px", "--custom-rogue":"url(javascript:1)", display:"#FFFFFF" },
  }],
  activeDocId:"custom-doc",
});
const customStyle = sanitizedCustomStyle.styles.find(style => style.id === "custom-style");
assert.equal(customStyle.swatches.length, 4);
assert.equal(customStyle.customVars["--custom-primary"], "#123456");
assert.equal(customStyle.customVars["--custom-font"], "var(--serif)");
assert.equal(customStyle.customVars["--custom-body"], "16.5px");
assert.equal(customStyle.customVars["--custom-line"], "1.9");
assert.equal(customStyle.customVars["--custom-h1"], undefined);
assert.equal(customStyle.customVars["--custom-rogue"], undefined);
assert.equal(customStyle.customVars.display, undefined);

const main = fs.readFileSync("electron/main.js", "utf8");
assert.ok(main.includes("function canOpenExternal"), "Electron main process must gate external URLs");
assert.ok(main.includes('["http:", "https:"]'), "Electron external opener must only allow http/https");
assert.ok(main.includes('preload: path.join(__dirname, "preload.js")'), "Electron window must load the clipboard preload bridge");
assert.ok(main.includes('ipcMain.handle("clipboard:write-rich"'), "Electron main process must handle rich clipboard writes");
assert.ok(main.includes('ipcMain.handle("library:load"'), "Electron main process must handle document library backup reads");
assert.ok(main.includes('ipcMain.handle("library:save"'), "Electron main process must handle document library backup writes");
assert.ok(main.includes('ipcMain.handle("library:snapshot"'), "Electron main process must support explicit safety snapshots");
assert.ok(main.includes('ipcMain.handle("library:list-recovery"'), "Electron main process must list recovery points");
assert.ok(main.includes('ipcMain.handle("library:load-recovery"'), "Electron main process must load a selected recovery point");
assert.ok(main.includes("function requireTrustedIpc"), "Electron IPC handlers must reject non-app senders");
assert.ok(main.includes("minWidth: 760"), "Electron window must be able to enter the responsive layout");
assert.ok(main.includes('win.webContents.on("will-navigate"'), "Electron main process must block unexpected top-level navigation");
assert.ok(main.includes("function isAppFile"), "Electron main process must allow only app-local file navigations");
assert.ok(main.includes("path.relative(appRoot, target)"), "Electron app-local path check must avoid unsafe prefix matching");
assert.ok(main.includes("!relative.startsWith(\"..\")"), "Electron app-local path check must reject sibling prefixes");

const preload = fs.readFileSync("electron/preload.js", "utf8");
assert.ok(preload.includes("contextBridge.exposeInMainWorld"), "preload must expose a constrained clipboard bridge");
assert.ok(preload.includes("writeRich") && preload.includes("writeText"), "preload bridge must support rich and text copy");
assert.ok(preload.includes("mdStyleStorage"), "preload must expose constrained document library storage");
assert.ok(preload.includes("createSnapshot"), "preload storage bridge must expose safety snapshots");
assert.ok(preload.includes("listRecoveryPoints") && preload.includes("loadRecoveryPoint"), "preload storage bridge must expose constrained recovery history access");

const packageConfig = JSON.parse(fs.readFileSync("package.json", "utf8"));
assert.match(packageConfig.description, /多平台复制工具/);
assert.ok(packageConfig.build.mac.target.includes("dmg"), "macOS releases must include a DMG");
assert.ok(packageConfig.build.mac.target.includes("zip"), "macOS releases must include a zipped app");
assert.equal(packageConfig.build.win.icon, "assets/app-icon.ico");
assert.deepEqual(packageConfig.build.win.target.map(target => target.target), ["nsis", "portable"], "Windows releases must include installer and portable executables");
assert.ok(fs.existsSync("assets/app-icon.ico"), "Windows packaging icon must exist");

const releaseWorkflow = fs.readFileSync(".github/workflows/build-macos.yml", "utf8");
assert.ok(releaseWorkflow.includes("build-windows:"), "release workflow must build Windows artifacts");
assert.ok(releaseWorkflow.includes("npm run dist:mac"), "release workflow must build macOS DMG and app archives");
assert.ok(releaseWorkflow.includes("npm run dist:win"), "release workflow must build Windows executables");
assert.ok(releaseWorkflow.includes('-name "*.zip"') && releaseWorkflow.includes('-name "*.exe"'), "tagged releases must upload app archives and Windows executables");

console.log("smoke tests passed");
