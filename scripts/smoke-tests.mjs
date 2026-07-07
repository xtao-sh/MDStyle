import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("index.html", "utf8");
assert.ok(html.includes('assets/markdown-it.min.js'), "index.html must load bundled markdown-it");
assert.ok(html.includes('assets/app.js'), "index.html must load extracted application script");
assert.ok(!html.includes("MD Style functional MVP"), "index.html must not contain the application script body inline");

const script = fs.readFileSync("assets/app.js", "utf8");
fs.writeFileSync("/tmp/md-style-script-check.js", script);
execFileSync("node", ["--check", "/tmp/md-style-script-check.js"], { stdio: "inherit" });
execFileSync("node", ["--check", "electron/main.js"], { stdio: "inherit" });

const builtinIds = [...script.matchAll(/\{ id:"([^"]+)", cls:"theme-[^"]+", name:"[^"]+", cat:"[^"]+"/g)].map(match => match[1]);
assert.deepEqual(builtinIds, ["default", "product", "brief", "course", "checklist", "campaign", "column", "essay", "academic", "tech", "mag", "notice", "report", "interview", "newsletter", "mono", "soft", "nature", "classic", "deck"], "built-in styles should cover broad non-duplicative publishing scenarios");
assert.ok(script.includes("const LEGACY_STYLE_REPLACEMENTS"), "removed built-in styles must migrate to replacement styles");
assert.ok(html.includes('id="style-search"'), "style library must support search");
assert.ok(html.includes('id="style-category"'), "style library must support category filtering");
assert.ok(html.includes('id="override-heading"'), "style panel must support heading-wide overrides");
assert.ok(html.includes('id="override-font"'), "style panel must support body font overrides");
assert.ok(html.includes('content="width=device-width, initial-scale=1"'), "web app must use device-width viewport instead of a fixed desktop viewport");
assert.ok(html.includes("@media (max-width: 900px)"), "web app must provide a narrow-screen layout");
assert.ok(html.includes('data-library-action="add-directory"'), "library actions must use stable data attributes");
assert.ok(html.includes('data-export-action="copy-rich"'), "export actions must use stable data attributes");

const helperStart = script.indexOf("const escapeHtml");
const helperEnd = script.indexOf("function seedState", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "pure helper block must be extractable");

const helperScript = `${script.slice(helperStart, helperEnd)}
globalThis.__helpers = { mdToHtml, sanitizeLinkUrl, sanitizeImageUrl, normalizeCssColor, escapeAttr };
`;
const context = { console };
vm.createContext(context);
vm.runInContext(helperScript, context);

const { mdToHtml, sanitizeLinkUrl, sanitizeImageUrl, normalizeCssColor, escapeAttr } = context.__helpers;

assert.equal(sanitizeLinkUrl("https://example.com/a"), "https://example.com/a");
assert.equal(sanitizeLinkUrl("http://example.com/a"), "http://example.com/a");
assert.equal(sanitizeLinkUrl("file:///tmp/x.md"), "#");
assert.equal(sanitizeLinkUrl("javascript:alert(1)"), "#");

assert.equal(sanitizeImageUrl("https://example.com/a.png"), "https://example.com/a.png");
assert.equal(sanitizeImageUrl("data:image/png;base64,AAAA"), "data:image/png;base64,AAAA");
assert.equal(sanitizeImageUrl("data:image/svg+xml;base64,AAAA"), "#");
assert.equal(sanitizeImageUrl("file:///tmp/a.png"), "#");

assert.equal(normalizeCssColor("#123"), "#123");
assert.equal(normalizeCssColor("#112233"), "#112233");
assert.equal(normalizeCssColor("rgb(12, 34, 56)"), "rgb(12, 34, 56)");
assert.equal(normalizeCssColor("red;background:url(javascript:1)", "#000000"), "#000000");
assert.equal(escapeAttr('bad" onmouseover="x'), "bad&quot; onmouseover=&quot;x");

const rendered = mdToHtml([
  "# 标题",
  "",
  "1. **书桌（工作区 Working Directory）**：你平时写写画画的地方。",
  "2. [危险链接](file:///etc/passwd)",
  "",
  "![本地](file:///tmp/a.png)",
].join("\n"));
assert.match(rendered, /<h1>标题<\/h1>/);
assert.match(rendered, /<ol><li><strong>书桌（工作区 Working Directory）<\/strong>：你平时写写画画的地方。<\/li><li><a href="#" target="_blank" rel="noopener noreferrer">危险链接<\/a><\/li><\/ol>/);
assert.match(rendered, /<img src="#" alt="本地">/);

assert.ok(script.includes("function appendListItemInline"), "copy exporter must flatten list items before copying");
assert.ok(script.includes("function safeCopyPseudoNode"), "copy exporter must materialize pseudo elements for rich paste");
assert.ok(script.includes("getComputedStyle(node, pseudo)"), "copy exporter must inspect computed pseudo-element styles");
assert.ok(script.includes("function copyBackground"), "copy exporter must preserve non-text background styles");
assert.ok(script.includes("function legacyMdToHtml"), "legacy Markdown parser must remain as fallback");
assert.ok(script.includes("function getMarkdownRenderer"), "Markdown rendering must prefer markdown-it when available");
assert.ok(script.includes('"text-indent": "-1.8em"'), "copy exporter must preserve hanging indentation for lists");
assert.ok(script.includes('"background-image":'), "copy exporter must preserve gradient/background-image styles");
assert.ok(script.includes('"border-right": copyBorder'), "copy exporter must preserve right borders");
assert.ok(script.includes('"box-shadow": isUsefulBoxShadow'), "copy exporter must preserve useful shadows");
assert.ok(!script.includes('const allowed = ["font-family"'), "copy exporter must not use old computed-style allowlist");
assert.ok(!script.includes('getPropertyValue("height")'), "copy exporter must not copy computed fixed heights");
assert.ok(!script.includes('getPropertyValue("width")'), "copy exporter must not copy computed fixed widths");
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
assert.ok(script.includes("async function importLibraryFile"), "app must support full library import");
assert.ok(script.includes("normalizeState(payload.state || payload)"), "library import must normalize and migrate incoming data");
assert.ok(script.includes("async function backupLibraryState"), "Electron app must maintain a file backup of the document library");
assert.ok(script.includes("async function restoreElectronLibraryBackup"), "Electron app must restore the file backup when browser storage is missing");
assert.ok(script.includes("function normalizeStyleOverrides"), "documents must normalize style override payloads");
assert.ok(script.includes("function applyStyleOverrides"), "preview must apply per-document style overrides");
assert.ok(script.includes("function renderStyleCategories"), "style library must render dynamic category filters");
assert.ok(script.includes("copyBackground(docComputed)"), "copy exporter must preserve preview/page background");
assert.ok(script.includes("outer.appendChild(inner)"), "copy exporter must build wrapper HTML through DOM nodes");
assert.ok(script.includes("escapeAttr(dir.id)"), "directory ids must be escaped in data attributes");
assert.ok(script.includes("escapeAttr(doc.id)"), "document ids must be escaped in data attributes");
assert.ok(script.includes("escapeAttr(s.id)"), "style ids must be escaped in data attributes");
assert.ok(script.includes("backupSaved = await backupLibraryState()"), "file backup must be awaited during persistence");
assert.ok(script.includes("storageHadLocalState = false"), "corrupt browser storage must allow Electron backup recovery");
assert.ok(script.includes("setActiveDoc(state.activeDocId, false)"), "initial render must not overwrite the Electron backup before recovery");
assert.ok(script.includes("[data-export-action='copy-rich']"), "export button handlers must not depend on DOM order");
assert.ok(script.includes("[data-library-action='add-directory']"), "library button handlers must not depend on DOM order");
assert.ok(script.includes('window.matchMedia("(max-width: 900px)")'), "narrow screens must start with side panels collapsed");

const stateStart = script.indexOf("const BUILTIN_STYLES");
const stateEnd = script.indexOf("let storageLoadError", stateStart);
assert.ok(stateStart >= 0 && stateEnd > stateStart, "state helper block must be extractable");
const stateContext = {
  console,
  crypto:{ randomUUID:() => "test-id" },
  SAMPLE_MD:"# Seed\n\nBody",
  Blob:globalThis.Blob,
};
vm.createContext(stateContext);
vm.runInContext(`${script.slice(stateStart, stateEnd)}
globalThis.__stateHelpers = { normalizeState };
`, stateContext);

const migrated = stateContext.__stateHelpers.normalizeState({
  dirs:[{ id:"all", name:"全部文档", system:true }, { id:"uncategorized", name:"未分类" }],
  tags:[{ id:"unsafe", name:"危险", color:"red;background:url(javascript:1)" }],
  docs:[
    { id:"manual", title:"手动标题", manualTitle:true, markdown:"# 自动标题", directoryId:"uncategorized", tagIds:["unsafe"], styleId:"default", createdAt:"2026-01-01T00:00:00.000Z", updatedAt:"2026-01-01T00:00:00.000Z" },
    { id:"auto", title:"旧标题", manualTitle:false, markdown:"# 新标题", directoryId:"uncategorized", tagIds:[], styleId:"default", styleOverrides:{ heading:"block", font:"kaiti", textColor:"#123456", pageBg:"bad-css" }, createdAt:"2026-01-01T00:00:00.000Z", updatedAt:"2026-01-01T00:00:00.000Z" },
  ],
  styles:[{ id:"custom", builtin:false, name:"Bad", swatches:["red;background:url(javascript:1)"], customVars:{ "--custom-primary":"url(javascript:1)" } }],
  activeDocId:"manual",
});
assert.equal(migrated.docs.find(d => d.id === "manual").title, "手动标题");
assert.equal(migrated.docs.find(d => d.id === "auto").title, "新标题");
assert.equal(migrated.dirs.find(d => d.id === "uncategorized").system, true);
assert.equal(migrated.tags.find(t => t.id === "unsafe").color, "#5C8A7D");
assert.equal(migrated.styles.find(s => s.id === "custom").swatches[0], "#2D2D2A");
assert.equal(JSON.stringify(migrated.docs.find(d => d.id === "auto").styleOverrides), JSON.stringify({ heading:"block", font:"kaiti", textColor:"#123456", pageBg:"#FFFFFF" }));

const repaired = stateContext.__stateHelpers.normalizeState({
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

const legacyStyle = stateContext.__stateHelpers.normalizeState({
  dirs:[{ id:"all", name:"全部文档", system:true }, { id:"uncategorized", name:"未分类", system:true }],
  tags:[],
  docs:[
    { id:"legacy", title:"Legacy", manualTitle:true, markdown:"# Legacy", directoryId:"uncategorized", tagIds:[], styleId:"gov" },
  ],
  styles:[],
  activeDocId:"legacy",
});
assert.equal(legacyStyle.docs[0].styleId, "notice");

const main = fs.readFileSync("electron/main.js", "utf8");
assert.ok(main.includes("function canOpenExternal"), "Electron main process must gate external URLs");
assert.ok(main.includes('["http:", "https:"]'), "Electron external opener must only allow http/https");
assert.ok(main.includes('preload: path.join(__dirname, "preload.js")'), "Electron window must load the clipboard preload bridge");
assert.ok(main.includes('ipcMain.handle("clipboard:write-rich"'), "Electron main process must handle rich clipboard writes");
assert.ok(main.includes('ipcMain.handle("library:load"'), "Electron main process must handle document library backup reads");
assert.ok(main.includes('ipcMain.handle("library:save"'), "Electron main process must handle document library backup writes");
assert.ok(main.includes('win.webContents.on("will-navigate"'), "Electron main process must block unexpected top-level navigation");
assert.ok(main.includes("function isAppFile"), "Electron main process must allow only app-local file navigations");
assert.ok(main.includes("path.relative(appRoot, target)"), "Electron app-local path check must avoid unsafe prefix matching");
assert.ok(main.includes("!relative.startsWith(\"..\")"), "Electron app-local path check must reject sibling prefixes");

const preload = fs.readFileSync("electron/preload.js", "utf8");
assert.ok(preload.includes("contextBridge.exposeInMainWorld"), "preload must expose a constrained clipboard bridge");
assert.ok(preload.includes("writeRich") && preload.includes("writeText"), "preload bridge must support rich and text copy");
assert.ok(preload.includes("mdStyleStorage"), "preload must expose constrained document library storage");

console.log("smoke tests passed");
