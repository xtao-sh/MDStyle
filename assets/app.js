/* ========================================================================
   MD Style functional MVP.
   The visual shell comes from MD_Library.zip; this script turns the mock
   into a local-first editor, document library, style library, exporter,
   compatibility checker, and WeChat-rich-text clipboard tool.
   ====================================================================== */
const editor = document.getElementById("editor");
const preview = document.getElementById("preview");
const previewPane = document.getElementById("preview-pane");
const toast = document.getElementById("toast");
const STORAGE_KEY = "md-style-library-v1";
const IMPORT_BACKUP_KEY = "md-style-library-before-import-v1";
const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
const SAMPLE_MD = editor.value;

const themeCatalog = globalThis.MDStyleThemeCatalog;
if (!themeCatalog) throw new Error("Theme catalog failed to load");
const BUILTIN_STYLES = themeCatalog.themes;
const LEGACY_STYLE_REPLACEMENTS = themeCatalog.legacyReplacements;

const thumbHTML = themeCatalog.thumbnails;

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const escapeHtml = (s="") => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
const escapeAttr = escapeHtml;
const plainText = (html) => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || "";
};
const byteSize = (s) => new Blob([s]).size;
const formatBytes = (n) => n > 1024 ? `${(n/1024).toFixed(1)} KB` : `${n} B`;
const firstHeading = (md) => (md.match(/^#\s+(.+)$/m)?.[1] || "未命名文档").trim().slice(0, 80);
const snippet = (md) => md.replace(/```[\s\S]*?```/g, "").replace(/[#>*_`|\-[\]()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 64) || "空白文档";
const nowIso = () => new Date().toISOString();
const fontPresets = {
  ui: "var(--ui)",
  serif: "var(--serif)",
  fangsong: '"FangSong","STFangsong","SimSun","Source Han Serif SC",serif',
  kaiti: '"Kaiti SC","STKaiti","KaiTi","Source Han Serif SC",serif',
};
const timeAgo = (iso) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} 小时前`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
};
const libraryModelFactory = globalThis.MDStyleLibraryModel;
if (!libraryModelFactory) throw new Error("Library model failed to load");
const libraryModel = libraryModelFactory.create({
  themes:BUILTIN_STYLES,
  legacyReplacements:LEGACY_STYLE_REPLACEMENTS,
  sampleMarkdown:SAMPLE_MD,
  uid,
  nowIso,
  firstHeading,
  fontPresetIds:Object.keys(fontPresets),
});
const { tagColors, normalizeCssColor, normalizeStyleOverrides, seedState, normalizeState } = libraryModel;
function nextTagColor(){ return tagColors[state.tags.length % tagColors.length]; }

const markdownEngine = globalThis.MDStyleMarkdown;
if (!markdownEngine) throw new Error("Markdown engine failed to load");
const mdToHtml = markdownEngine.render;


let storageLoadError = "";
let storageHadLocalState = false;
function loadSavedState(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    storageHadLocalState = !!raw;
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    storageLoadError = error.message || "本地文档库数据无法解析";
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    storageHadLocalState = false;
    return null;
  }
}

let state = normalizeState(loadSavedState());
let styleTab = "built-in";
let styleCategory = "all";
let styleSearch = "";
let saveTimer = null;
let saveRevision = 0;
let saveQueue = Promise.resolve(true);
let compatibilityTimer = null;
let lastRenderResult = { html:"", exportHtml:"", text:"", stats:{ chars:0, htmlBytes:0, imageCount:0, linkCount:0 }, issues:[] };

const app = $(".app");
const lib = $("#library");
const rightPanel = $("#right");
const searchInput = $(".search-wrap input");
const sortSelect = $(".lib-sort select");
const fileInput = document.createElement("input");
const libraryInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = ".md,.markdown,text/markdown,text/plain";
fileInput.style.display = "none";
document.body.appendChild(fileInput);
libraryInput.type = "file";
libraryInput.accept = "application/json,.json";
libraryInput.style.display = "none";
document.body.appendChild(libraryInput);

function activeDoc(){ return state.docs.find(d => d.id === state.activeDocId) || state.docs[0]; }
function styleById(id){ return state.styles.find(s => s.id === id) || state.styles[0]; }
function stateSnapshot(){
  return JSON.parse(JSON.stringify(state));
}
async function backupLibraryState(snapshot=state){
  if (!window.mdStyleStorage?.saveLibrary) return true;
  await window.mdStyleStorage.saveLibrary({ state:snapshot });
  return true;
}
function saveBrowserState(snapshot=state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  return true;
}
function flushBrowserState(){
  try {
    saveBrowserState(state);
    return true;
  } catch (error) {
    console.warn("Failed to flush browser library", error);
    return false;
  }
}
async function createSafetySnapshot(reason="manual"){
  const snapshot = stateSnapshot();
  let browserSaved = false;
  let fileSaved = false;
  try {
    localStorage.setItem(IMPORT_BACKUP_KEY, JSON.stringify({ version:1, savedAt:nowIso(), state:snapshot }));
    browserSaved = true;
  } catch (error) {
    console.warn("Failed to save browser safety snapshot", error);
  }
  if (window.mdStyleStorage?.createSnapshot) {
    try {
      await window.mdStyleStorage.createSnapshot({ state:snapshot }, reason);
      fileSaved = true;
    } catch (error) {
      console.warn("Failed to save file safety snapshot", error);
    }
  }
  return browserSaved || fileSaved;
}
async function restoreElectronLibraryBackup(){
  if (storageHadLocalState || !window.mdStyleStorage?.loadLibrary) return;
  try {
    const payload = await window.mdStyleStorage.loadLibrary();
    if (!payload) return;
    const nextState = normalizeState(payload.state || payload);
    if (!nextState.docs.length) return;
    state = nextState;
    editor.value = activeDoc().markdown;
    renderAll();
    await persist(true);
    if (storageLoadError) showToast("已从本地备份恢复文档库");
  } catch (error) {
    console.warn("Failed to restore Electron library backup", error);
  }
}
function persist(immediate=false){
  const revision = ++saveRevision;
  const enqueue = () => {
    const snapshot = stateSnapshot();
    const run = async () => {
      let localSaved = false;
      let backupSaved = false;
      let localError = null;
      let backupError = null;
      try {
        localSaved = saveBrowserState(snapshot);
      } catch (error) {
        localError = error;
      }
      try {
        backupSaved = await backupLibraryState(snapshot);
      } catch (error) {
        backupError = error;
      }
      if (localSaved || backupSaved) {
        if (revision === saveRevision) updateSaveState(backupError ? "已保存到浏览器，文件备份失败" : "已保存", !backupError);
        if (backupError) console.warn("Failed to write Electron library backup", backupError);
        if (localError) console.warn("Failed to save browser library", localError);
        return true;
      }
      if (revision === saveRevision) updateSaveState("保存失败", false);
      console.warn("Failed to save library", localError || backupError);
      return false;
    };
    const current = saveQueue.catch(() => false).then(run);
    saveQueue = current;
    return current;
  };
  clearTimeout(saveTimer);
  saveTimer = null;
  updateSaveState("保存中", false);
  if (immediate) return enqueue();
  saveTimer = setTimeout(() => {
    saveTimer = null;
    enqueue();
  }, 450);
  return true;
}
function updateSaveState(label, done){
  const el = $(".save-state");
  if (!el) return;
  el.innerHTML = `<span class="save-dot" style="background:${done ? "var(--accent-2)" : "var(--warn)"}"></span>${label} · ${new Date().toLocaleTimeString("zh-CN", { hour:"2-digit", minute:"2-digit" })}`;
}

function setActiveDoc(id, shouldPersist=true){
  state.activeDocId = id;
  const doc = activeDoc();
  editor.value = doc.markdown;
  applyStyle(doc.styleId || "default", false);
  renderAll();
  if (shouldPersist) persist(true);
}

function renderAll(){
  renderPreview();
  renderLibrary();
  renderStyleCards();
  renderMeta();
  renderCompatibility();
  renderStatus();
}

function renderPreview(){
  const doc = activeDoc();
  if (!doc) return;
  const html = mdToHtml(doc.markdown);
  preview.innerHTML = html;
  if (!doc.manualTitle) doc.title = firstHeading(doc.markdown);
  applyStyle(doc.styleId || "default", false);
  lastRenderResult.html = preview.innerHTML;
  lastRenderResult.exportHtml = "";
  lastRenderResult.text = plainText(lastRenderResult.html);
  lastRenderResult.stats = collectStats(doc.markdown, lastRenderResult.html);
}

function collectStats(md, html, exportHtml=html){
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return {
    chars: md.replace(/\s/g, "").length,
    htmlBytes: byteSize(exportHtml),
    imageCount: tmp.querySelectorAll("img").length,
    linkCount: tmp.querySelectorAll("a").length,
    tableCount: tmp.querySelectorAll("table").length,
  };
}

function renderMeta(){
  const doc = activeDoc();
  if (!doc) return;
  $(".doc-title").textContent = doc.title || firstHeading(doc.markdown);
  document.title = `${doc.title || "MD Style"} · Markdown 排版到公众号`;
}

function filteredDocs(){
  let docs = [...state.docs];
  const q = (state.search || "").trim().toLowerCase();
  if (state.activeDirId && state.activeDirId !== "all") docs = docs.filter(d => d.directoryId === state.activeDirId);
  if (state.activeTagIds.length) docs = docs.filter(d => state.activeTagIds.every(t => d.tagIds.includes(t)));
  if (q) docs = docs.filter(d => `${d.title} ${d.markdown} ${d.tagIds.map(id => state.tags.find(t => t.id === id)?.name || "").join(" ")}`.toLowerCase().includes(q));
  docs.sort((a,b) => {
    if (state.sort === "title") return (a.title || "").localeCompare(b.title || "", "zh-CN");
    if (state.sort === "created") return new Date(b.createdAt) - new Date(a.createdAt);
    if (state.sort === "chars") return b.markdown.length - a.markdown.length;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
  return docs;
}

function renderLibrary(){
  const dirsWrap = $(".dir-tree");
  dirsWrap.innerHTML = state.dirs.map(dir => {
    const count = dir.id === "all" ? state.docs.length : state.docs.filter(d => d.directoryId === dir.id).length;
    const actions = dir.system ? "" : `<span class="dir-actions">
      <button class="doc-action" data-dir-action="rename" title="重命名目录">✎</button>
      <button class="doc-action" data-dir-action="delete" title="删除目录">×</button>
    </span>`;
    return `<div class="dir-item ${state.activeDirId === dir.id ? "on" : ""}" data-dir="${escapeAttr(dir.id)}">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 12V5a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/></svg>
      ${escapeHtml(dir.name)} <span class="dir-count ${dir.system ? "" : "has-actions"}">${count}</span>${actions}
    </div>`;
  }).join("");
  $$(".dir-item", dirsWrap).forEach(item => item.addEventListener("click", (e) => {
    const action = e.target.closest("[data-dir-action]")?.dataset.dirAction;
    if (action) return handleDirAction(item.dataset.dir, action);
    state.activeDirId = item.dataset.dir; renderLibrary(); persist();
  }));

  const tagWrap = $(".tag-row");
  tagWrap.innerHTML = state.tags.map(tag => `<button class="tag-chip ${state.activeTagIds.includes(tag.id) ? "on" : ""}" data-tag="${escapeAttr(tag.id)}">
    <span class="dot" style="background:${tag.color}"></span>${escapeHtml(tag.name)}
  </button>`).join("");
  $$(".tag-chip", tagWrap).forEach(item => item.addEventListener("click", () => {
    const id = item.dataset.tag;
    state.activeTagIds = state.activeTagIds.includes(id) ? state.activeTagIds.filter(x => x !== id) : [...state.activeTagIds, id];
    renderLibrary(); persist();
  }));

  searchInput.value = state.search || "";
  sortSelect.value = sortSelect.querySelector(`option[value="${state.sort}"]`) ? state.sort : sortSelect.value;

  const docs = filteredDocs();
  const list = $("#doc-list");
  if (!docs.length) {
    list.innerHTML = `<div class="empty-state">没有匹配的文档。<br>点击顶部“新建”开始写作。</div>`;
  } else {
    list.innerHTML = docs.map(doc => {
      const tags = doc.tagIds.slice(0, 2).map(id => state.tags.find(t => t.id === id)?.name).filter(Boolean).map(t => `<span class="tg">${escapeHtml(t)}</span>`).join("");
      return `<div class="doc-item ${doc.id === state.activeDocId ? "on" : ""}" data-doc="${escapeAttr(doc.id)}">
        <div class="ttl"><span>${escapeHtml(doc.title || firstHeading(doc.markdown))}</span>
          <span class="doc-actions">
            <button class="doc-action" data-action="rename" title="重命名">✎</button>
            <button class="doc-action" data-action="move" title="移动目录">⇄</button>
            <button class="doc-action" data-action="tags" title="编辑标签">#</button>
            <button class="doc-action" data-action="delete" title="删除">×</button>
          </span>
        </div>
        <div class="snippet">${escapeHtml(snippet(doc.markdown))}</div>
        <div class="meta">${timeAgo(doc.updatedAt)} · ${doc.markdown.replace(/\s/g, "").length.toLocaleString()} 字${tags}</div>
      </div>`;
    }).join("");
  }
  $$(".doc-item", list).forEach(item => {
    item.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (action) return handleDocAction(item.dataset.doc, action);
      if (item.dataset.doc !== state.activeDocId) setActiveDoc(item.dataset.doc);
    });
  });
  $(".lib-sort span").textContent = `共 ${docs.length} 篇`;
}

function handleDocAction(id, action){
  const doc = state.docs.find(d => d.id === id);
  if (!doc) return;
  if (action === "rename") {
    const name = prompt("文档标题", doc.title || firstHeading(doc.markdown));
    if (name?.trim()) { doc.title = name.trim(); doc.manualTitle = true; doc.updatedAt = nowIso(); renderLibrary(); renderMeta(); persist(); }
  }
  if (action === "move") {
    const dirs = state.dirs.filter(d => d.id !== "all");
    const currentIndex = Math.max(0, dirs.findIndex(d => d.id === doc.directoryId));
    const menu = dirs.map((d, idx) => `${idx + 1}. ${d.name}`).join("\n");
    const target = prompt(`移动到目录，输入编号：\n${menu}`, String(currentIndex + 1));
    if (target === null) return;
    const dir = dirs[Number.parseInt(target, 10) - 1];
    if (dir) { doc.directoryId = dir.id; doc.updatedAt = nowIso(); renderLibrary(); persist(); }
  }
  if (action === "tags") {
    const current = doc.tagIds.map(id => state.tags.find(t => t.id === id)?.name).filter(Boolean).join("，");
    const raw = prompt("编辑标签，用逗号分隔。留空则清除标签。", current);
    if (raw === null) return;
    const names = raw.split(/[,，]/).map(x => x.trim()).filter(Boolean);
    doc.tagIds = [...new Set(names.map(ensureTagByName))];
    doc.updatedAt = nowIso();
    renderLibrary(); persist();
  }
  if (action === "delete" && confirm(`删除「${doc.title}」？`)) {
    state.docs = state.docs.filter(d => d.id !== id);
    if (state.activeDocId === id) state.activeDocId = state.docs[0]?.id;
    if (!state.docs.length) createDocument();
    setActiveDoc(state.activeDocId);
  }
}

function createDocument(markdown="# 未命名文档\n\n从这里开始写 Markdown。"){
  const dir = state.activeDirId && state.activeDirId !== "all" ? state.activeDirId : "uncategorized";
  const doc = { id:uid(), title:firstHeading(markdown), manualTitle:false, markdown, directoryId:dir, tagIds:[], styleId:"default", styleOverrides:{}, createdAt:nowIso(), updatedAt:nowIso() };
  state.docs.unshift(doc);
  setActiveDoc(doc.id);
}

function ensureTagByName(name){
  const clean = name.trim();
  let tag = state.tags.find(t => t.name === clean);
  if (!tag) {
    tag = { id:uid(), name:clean, color:nextTagColor() };
    state.tags.push(tag);
  }
  return tag.id;
}

function handleDirAction(id, action){
  const dir = state.dirs.find(d => d.id === id);
  if (!dir || dir.system) return;
  if (action === "rename") {
    const name = prompt("目录名称", dir.name);
    const clean = name?.trim();
    if (!clean) return;
    if (state.dirs.some(d => d.id !== id && d.name === clean)) return showToast("目录名称已存在", true);
    dir.name = clean;
    renderLibrary(); persist();
  }
  if (action === "delete") {
    const affected = state.docs.filter(d => d.directoryId === id).length;
    if (!confirm(`删除目录「${dir.name}」？${affected ? `其中 ${affected} 篇文档会移到“未分类”。` : ""}`)) return;
    state.docs.forEach(doc => { if (doc.directoryId === id) doc.directoryId = "uncategorized"; });
    state.dirs = state.dirs.filter(d => d.id !== id);
    if (state.activeDirId === id) state.activeDirId = "all";
    renderLibrary(); persist();
  }
}

function addDirectory(){
  const name = prompt("新目录名称");
  const clean = name?.trim();
  if (!clean) return;
  if (state.dirs.some(d => d.name === clean)) return showToast("目录名称已存在", true);
  const id = uid();
  state.dirs.push({ id, name:clean });
  state.activeDirId = id;
  renderLibrary(); persist();
}

function addTag(){
  const name = prompt("新标签名称");
  const clean = name?.trim();
  if (!clean) return;
  if (state.tags.some(t => t.name === clean)) return showToast("标签已存在", true);
  state.tags.push({ id:uid(), name:clean, color:nextTagColor() });
  renderLibrary(); persist();
}

function overrideClasses(overrides={}){
  return [
    overrides.heading ? `heading-${overrides.heading}` : "",
    overrides.font ? "override-body-font" : "",
    overrides.textColor ? "override-text-color" : "",
    overrides.pageBg ? "override-page-bg" : "",
    overrides.strongBg ? "override-strong-bg" : "",
  ].filter(Boolean).join(" ");
}
function applyStyleOverrides(doc, style){
  [...previewPane.style].filter(k => k.startsWith("--custom") || k.startsWith("--override")).forEach(k => previewPane.style.removeProperty(k));
  if (style.customVars) Object.entries(style.customVars).forEach(([k,v]) => previewPane.style.setProperty(k, v));
  const overrides = normalizeStyleOverrides(doc?.styleOverrides);
  const accent = overrides.accent || style.swatches?.[1] || "#5C8A7D";
  const soft = overrides.strongBg || style.swatches?.[2] || "#E7EEEA";
  previewPane.style.setProperty("--override-heading-accent", accent);
  previewPane.style.setProperty("--override-heading-soft", soft);
  previewPane.style.setProperty("--override-heading-text", overrides.textColor || style.swatches?.[0] || "#1A1A18");
  if (overrides.font) previewPane.style.setProperty("--override-font", fontPresets[overrides.font]);
  if (overrides.textColor) previewPane.style.setProperty("--override-text", overrides.textColor);
  if (overrides.pageBg) previewPane.style.setProperty("--override-page-bg", overrides.pageBg);
  if (overrides.strongBg) previewPane.style.setProperty("--override-strong-bg", overrides.strongBg);
}
function updateStyleOverrideControls(){
  const doc = activeDoc();
  const style = styleById(doc?.styleId || "default");
  const overrides = normalizeStyleOverrides(doc?.styleOverrides);
  $("#override-heading").value = overrides.heading || "";
  $("#override-font").value = overrides.font || "";
  $("#override-text").value = overrides.textColor || style.swatches?.[0] || "#1A1A18";
  $("#override-page").value = overrides.pageBg || style.swatches?.[2] || "#FFFFFF";
  $("#override-strong").value = overrides.strongBg || style.swatches?.[2] || "#E7EEEA";
  $("#override-accent").value = overrides.accent || style.swatches?.[1] || "#5C8A7D";
}
function applyStyle(styleId, shouldPersist=true){
  const doc = activeDoc();
  const style = styleById(styleId);
  if (!doc || !style) return;
  doc.styleId = style.id;
  doc.styleOverrides = normalizeStyleOverrides(doc.styleOverrides);
  previewPane.className = `preview-pane ${style.cls || "theme-custom"} ${overrideClasses(doc.styleOverrides)}`.trim();
  applyStyleOverrides(doc, style);
  $("#cur-style-name").textContent = style.name;
  $(".style-chip .chip-dot").style.background = `linear-gradient(135deg, ${style.swatches[0]} 0%, ${style.swatches[1]} 100%)`;
  $(".current-style .nm").innerHTML = `${escapeHtml(style.name)} <span style="font-size:10px;color:var(--ink-3);margin-left:4px">${style.builtin ? "内置" : "自定义"}</span>`;
  $(".current-style .ds").textContent = "当前文档正在使用";
  $$(".current-style .swatches span").forEach((sw, i) => sw.style.background = style.swatches[i] || style.swatches[0]);
  updateStyleOverrideControls();
  if (shouldPersist) { doc.updatedAt = nowIso(); renderStyleCards(); renderLibrary(); persist(); }
}

function renderStyleCards(){
  const grid = $("#style-grid");
  const doc = activeDoc();
  const styles = state.styles.filter(s => {
    if (styleTab === "custom") return !s.builtin;
    if (styleTab === "favorite") return !!s.favorite;
    return !!s.builtin;
  }).filter(s => {
    if (styleCategory !== "all" && (s.cat || (s.builtin ? "内置" : "我的")) !== styleCategory) return false;
    const q = styleSearch.trim().toLowerCase();
    if (!q) return true;
    return `${s.name} ${s.cat || ""} ${s.uc || ""} ${s.description || ""}`.toLowerCase().includes(q);
  });
  grid.innerHTML = styles.map(s => `
    <div class="style-card ${doc?.styleId === s.id ? "applied" : ""}" data-style-id="${escapeAttr(s.id)}">
      ${doc?.styleId === s.id ? '<span class="applied-tag">已应用</span>' : ''}
      <button class="fav ${s.favorite ? "on" : ""}" title="收藏">
        <svg viewBox="0 0 16 16" fill="${s.favorite ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.4" style="width:11px;height:11px"><path d="M8 2l1.8 3.7 4 .6-2.9 2.9.7 4-3.6-1.9-3.6 1.9.7-4L2.2 6.3l4-.6L8 2z"/></svg>
      </button>
      ${thumbHTML[s.thumb || s.id] || customThumb(s)}
      <div class="meta-row">
        <div class="nm">${escapeHtml(s.name)}<span class="cat">${escapeHtml(s.cat || (s.builtin ? "内置" : "我的"))}</span></div>
        <div class="uc">${escapeHtml(s.uc || s.description || "自定义样式")}</div>
      </div>
    </div>`).join("") || `<div class="empty-state" style="grid-column:1 / -1">暂无样式。点击“自定义生成”创建一个。</div>`;
  $$(".style-card", grid).forEach(card => {
    card.addEventListener("click", (e) => {
      const style = styleById(card.dataset.styleId);
      if (e.target.closest(".fav")) {
        style.favorite = !style.favorite;
        renderStyleCards(); persist(); return;
      }
      applyStyle(style.id);
    });
    card.addEventListener("mouseenter", () => showStylePreview(card));
    card.addEventListener("mouseleave", hideStylePreview);
  });
  $$(".style-tabs button").forEach((btn, idx) => {
    btn.classList.toggle("on", (idx === 0 && styleTab === "built-in") || (idx === 1 && styleTab === "custom") || (idx === 2 && styleTab === "favorite"));
    const counts = [state.styles.filter(s => s.builtin).length, state.styles.filter(s => !s.builtin).length, state.styles.filter(s => s.favorite).length];
    btn.textContent = idx === 0 ? `内置（${counts[0]}）` : idx === 1 ? `我的样式（${counts[1]}）` : `收藏（${counts[2]}）`;
  });
  renderStyleCategories();
  $("#style-search").value = styleSearch;
}
function renderStyleCategories(){
  const select = $("#style-category");
  const scoped = state.styles.filter(s => {
    if (styleTab === "custom") return !s.builtin;
    if (styleTab === "favorite") return !!s.favorite;
    return !!s.builtin;
  });
  const cats = [...new Set(scoped.map(s => s.cat || (s.builtin ? "内置" : "我的")))].sort((a,b) => a.localeCompare(b, "zh-CN"));
  if (styleCategory !== "all" && !cats.includes(styleCategory)) styleCategory = "all";
  select.innerHTML = `<option value="all">全部类别</option>${cats.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join("")}`;
  select.value = styleCategory;
}

function customThumb(s){
  return `<div class="thumb t-tech" style="background:${s.swatches[2] || "#fff"};color:${s.swatches[0] || "#111"}">
    <div class="tt">${escapeHtml(s.name)}</div>
    <div class="pp">自定义公众号排版样式。</div>
    <div class="qb" style="border-left-color:${s.swatches[1]};background:${s.swatches[2]}">标题、引用、代码块已生成。</div>
    <div class="cd" style="background:${s.swatches[3] || "#1A1A18"};color:#fff">custom style</div>
  </div>`;
}

let previewFloat;
function showStylePreview(card){
  hideStylePreview();
  previewFloat = document.createElement("div");
  previewFloat.style.cssText = "position:fixed;z-index:80;width:280px;background:#fff;border:1px solid var(--border);border-radius:10px;box-shadow:0 18px 40px -18px rgba(0,0,0,.35);padding:10px;pointer-events:none";
  const rect = card.getBoundingClientRect();
  previewFloat.style.left = `${Math.max(12, rect.left - 288)}px`;
  previewFloat.style.top = `${Math.max(58, rect.top)}px`;
  const clone = card.cloneNode(true);
  clone.style.pointerEvents = "none";
  clone.style.transform = "scale(1)";
  clone.querySelector(".thumb").style.height = "180px";
  previewFloat.appendChild(clone);
  document.body.appendChild(previewFloat);
}
function hideStylePreview(){ if (previewFloat) previewFloat.remove(); previewFloat = null; }

function generateCustomStyle(){
  const base = styleById(activeDoc()?.styleId || "default");
  const name = prompt("新样式名称", `我的${base.name}`);
  const cleanName = name?.trim().slice(0, 40);
  if (!cleanName) return;
  const promptColor = (label, fallback) => {
    const value = prompt(label, fallback);
    return value === null ? null : normalizeCssColor(value, fallback);
  };
  const primary = promptColor("主色（HEX）", base.swatches[0]);
  if (primary === null) return;
  const accent = promptColor("强调色（HEX）", base.swatches[1]);
  if (accent === null) return;
  const soft = promptColor("浅背景色（HEX）", base.swatches[2]);
  if (soft === null) return;
  const style = {
    id:uid(), cls:"theme-custom", name:cleanName, cat:"我的", uc:"用户生成样式", swatches:[primary, accent, soft, "#1A1A18"],
    builtin:false, favorite:false, thumb:"custom",
    customVars:{
      "--custom-primary": primary, "--custom-accent": accent, "--custom-soft": soft,
      "--custom-bg": "#FFFFFF", "--custom-text": "#1A1A18", "--custom-code-bg": "#1A1A18",
      "--custom-code": soft,
    }
  };
  state.styles.push(style);
  styleTab = "custom";
  applyStyle(style.id);
  showToast("已生成并应用新样式");
}

function updateStyleOverride(key, value){
  const doc = activeDoc();
  if (!doc) return;
  const next = normalizeStyleOverrides({ ...(doc.styleOverrides || {}), [key]: value });
  doc.styleOverrides = next;
  doc.updatedAt = nowIso();
  applyStyle(doc.styleId || "default", false);
  renderPreview();
  renderCompatibility();
  renderStatus();
  renderLibrary();
  persist();
}
function resetStyleOverrides(){
  const doc = activeDoc();
  if (!doc) return;
  doc.styleOverrides = {};
  doc.updatedAt = nowIso();
  applyStyle(doc.styleId || "default", false);
  renderPreview();
  renderCompatibility();
  renderStatus();
  renderLibrary();
  persist();
  showToast("已恢复当前样式默认设置");
}

function markdownWithoutCode(md=""){
  return String(md)
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "");
}

function renderCompatibility(){
  const doc = activeDoc();
  const exportHtml = refreshExportResult();
  lastRenderResult.stats = collectStats(doc.markdown, lastRenderResult.html, exportHtml);
  const stats = lastRenderResult.stats;
  const issues = [];
  const title = doc?.title || firstHeading(doc?.markdown || "");
  if (title.length > 32) issues.push({ sev:"danger", code:"META-001", title:"标题超过公众号建议上限", msg:`当前标题 ${title.length} 字，公众号标题建议不超过 32 字。`, sugg:"缩短标题，保留主要信息。" });
  const markdownToInspect = markdownWithoutCode(doc.markdown);
  if (/<script|on\w+=|<iframe|<video|<audio|<form/i.test(markdownToInspect)) issues.push({ sev:"danger", code:"HTML-001", title:"检测到危险 HTML", msg:"原文包含脚本、事件属性或不稳定标签，渲染时会被转义或移除。", sugg:"删除相关 HTML，改用 Markdown 结构。" });
  const tmp = document.createElement("div");
  tmp.innerHTML = lastRenderResult.html;
  const imgs = $$("img", tmp).map(img => img.getAttribute("src") || "");
  const rawImageUrls = [...doc.markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(m => String(m[1] || "").trim().replace(/^["']|["']$/g, ""));
  const localImgs = rawImageUrls.filter(src => src && !/^https?:\/\//i.test(src) && !/^data:image\//i.test(src));
  const riskyImgs = imgs.filter(src => src && !/^https?:\/\/mmbiz\.qpic\.cn/i.test(src));
  if (riskyImgs.length) issues.push({ sev:"warn", code:"IMG-001", title:"外部图片可能被过滤", msg:`检测到 ${riskyImgs.length} 张非微信图床图片。公众号发布时外链图片可能失效。`, sugg:"发布前上传到公众号素材库，或后续开启微信图片上传。" });
  if (imgs.some(src => /^data:/i.test(src))) issues.push({ sev:"warn", code:"IMG-002", title:"Base64 图片不适合公众号", msg:"检测到 base64 图片，复制到公众号后台后通常不可保存。", sugg:"改成 jpg/png 文件并上传。" });
  if (localImgs.length) issues.push({ sev:"warn", code:"IMG-003", title:"本地图片路径无法复制到公众号", msg:`检测到 ${localImgs.length} 张本地或相对路径图片。`, sugg:"先上传图片并替换为 https 图片 URL。" });
  $$("table", tmp).forEach((table, idx) => {
    const cols = table.rows[0]?.cells.length || 0;
    if (cols > 4) issues.push({ sev:"warn", code:"TBL-002", title:`第 ${idx + 1} 个表格列数较多`, msg:`该表格有 ${cols} 列，窄屏上可能横向溢出。`, sugg:"合并相近列，或改写为列表。" });
  });
  const longCode = (doc.markdown.match(/```[\s\S]*?```/g) || []).filter(block => block.split("\n").length > 22).length;
  if (longCode) issues.push({ sev:"info", code:"CODE-001", title:"代码块较长", msg:`检测到 ${longCode} 个超过 20 行的代码块。`, sugg:"拆分代码块或只保留关键片段。" });
  if (stats.htmlBytes > 900000) issues.push({ sev:"danger", code:"SIZE-001", title:"HTML 体积接近限制", msg:`当前 HTML 约 ${formatBytes(stats.htmlBytes)}。`, sugg:"减少长表格、代码块和内联图片。" });
  if (!issues.length) issues.push({ sev:"info", code:"OK-000", title:"未发现阻断问题", msg:"当前内容可以复制到公众号编辑器继续校验。", sugg:"发布前仍建议在公众号后台预览一次。" });
  lastRenderResult.issues = issues;

  $(".compat-summary").innerHTML = `
    <div class="compat-card"><div class="lbl">HTML 体积</div><div class="val">${(stats.htmlBytes/1024).toFixed(1)}<small>KB</small></div><div class="bar"><span style="width:${Math.min(100, stats.htmlBytes/9000)}%"></span></div></div>
    <div class="compat-card"><div class="lbl">字符</div><div class="val">${stats.chars.toLocaleString()}</div><div class="bar"><span style="width:${Math.min(100, stats.chars/200)}%"></span></div></div>
    <div class="compat-card"><div class="lbl">图片</div><div class="val">${stats.imageCount}<small>/ ${riskyImgs.length ? "外部" : "安全"}</small></div><div class="bar"><span class="${riskyImgs.length ? "warn" : ""}" style="width:${Math.min(100, stats.imageCount*20)}%"></span></div></div>`;
  const warnCount = issues.filter(i => i.sev === "warn").length;
  const dangerCount = issues.filter(i => i.sev === "danger").length;
  $(".compat-status").innerHTML = `${dangerCount ? "存在阻断项，请处理后再复制。" : warnCount ? `可复制，存在 ${warnCount} 项警告。` : "兼容性良好，可复制。"} `;
  $(".right-tab[data-tab='compat'] .badge").textContent = String(warnCount + dangerCount);
  $("#btn-check .kbd").textContent = String(warnCount + dangerCount);
  $(".issue-list").innerHTML = issues.map(i => `<div class="issue ${i.sev}">
    <div class="sev"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.5v4M8 11v.5"/></svg></div>
    <div class="body"><div class="title">${escapeHtml(i.title)} <span class="code">${i.code}</span></div><div class="msg">${escapeHtml(i.msg)}</div><div class="sugg"><b>建议：</b>${escapeHtml(i.sugg)}</div></div>
  </div>`).join("");
}
function scheduleCompatibilityRender(){
  clearTimeout(compatibilityTimer);
  compatibilityTimer = setTimeout(() => {
    compatibilityTimer = null;
    renderCompatibility();
    renderStatus();
  }, 120);
}

function renderStatus(){
  const doc = activeDoc();
  const stats = lastRenderResult.stats;
  const groups = $$(".status .gr");
  if (groups[0]) groups[0].innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="6"/><path d="M5 8l2 2 4-4"/></svg> <b>已自动保存</b> · ${new Date().toLocaleTimeString("zh-CN", { hour:"2-digit", minute:"2-digit" })}`;
  if ($("#status-chars")) $("#status-chars").textContent = stats.chars.toLocaleString();
  if (groups[2]) groups[2].innerHTML = `HTML <b>${formatBytes(stats.htmlBytes)}</b>`;
  if (groups[3]) groups[3].innerHTML = `图片 <b>${stats.imageCount}</b>`;
  if (groups[4]) groups[4].innerHTML = `链接 <b>${stats.linkCount}</b>`;
  const issueCount = lastRenderResult.issues.filter(i => i.sev !== "info").length;
  $(".stat-pill.warn").textContent = issueCount ? `兼容性 · ${issueCount} 警告` : "兼容性 · 通过";
  doc.updatedAt = doc.updatedAt || nowIso();
}

const wechatExporterFactory = globalThis.MDStyleWechatExporter;
if (!wechatExporterFactory) throw new Error("WeChat exporter failed to load");
const wechatExporter = wechatExporterFactory.create({ article:preview, page:$(".preview-doc") });
function inlineArticleHtml(){ return wechatExporter.toHtml(); }
function refreshExportResult(){
  const html = inlineArticleHtml();
  lastRenderResult.exportHtml = html;
  lastRenderResult.text = plainText(html);
  return html;
}

async function writeClipboard(html, text){
  if (window.mdStyleClipboard?.writeRich) {
    try {
      await window.mdStyleClipboard.writeRich({ html, text });
      return;
    } catch (_) {}
  }
  if (navigator.clipboard?.write && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([html], { type:"text/html" }),
        "text/plain": new Blob([text], { type:"text/plain" }),
      })]);
      return;
    } catch (_) {}
  }
  const div = document.createElement("div");
  div.contentEditable = "true";
  div.style.position = "fixed";
  div.style.left = "-9999px";
  div.innerHTML = html;
  document.body.appendChild(div);
  const range = document.createRange();
  range.selectNodeContents(div);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  const ok = document.execCommand("copy");
  div.remove();
  sel.removeAllRanges();
  if (!ok) throw new Error("浏览器拒绝写入剪贴板");
}

async function writeTextClipboard(text){
  if (window.mdStyleClipboard?.writeText) {
    try {
      await window.mdStyleClipboard.writeText(text);
      return;
    } catch (_) {}
  }
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (_) {}
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.setAttribute("readonly", "");
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  if (!ok) throw new Error("浏览器拒绝写入剪贴板");
}

async function copyRichText(){
  const html = refreshExportResult();
  await writeClipboard(html, lastRenderResult.text);
  showToast("已复制富文本到剪贴板，可粘贴到公众号编辑器");
}
async function copyHtml(){
  const html = refreshExportResult();
  await writeTextClipboard(html);
  showToast("已复制 HTML 源码");
}
function downloadFile(name, content, type){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 800);
}
function exportLibrary(){
  const payload = {
    version:1,
    exportedAt:nowIso(),
    app:"MD Style",
    state,
  };
  downloadFile(`md-style-library-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
}
async function importLibraryFile(file){
  if (file.size > MAX_IMPORT_BYTES) throw new Error("备份文件超过 25 MB，已拒绝导入");
  const raw = await file.text();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw new Error("JSON 文件无法解析");
  }
  if (Number(payload?.version || 1) > 1) throw new Error("该备份来自更高版本的 MD Style");
  const sourceState = payload?.state || payload;
  if (!sourceState || !Array.isArray(sourceState.docs)) throw new Error("备份缺少有效的文档列表");
  const nextState = normalizeState(sourceState);
  if (!nextState.docs.length) throw new Error("备份里没有可导入的文档");
  const accepted = confirm(`导入将替换当前文档库中的 ${state.docs.length} 篇文档，并载入备份中的 ${nextState.docs.length} 篇文档。继续前会自动创建安全快照。`);
  if (!accepted) return false;
  if (!await createSafetySnapshot("before-import")) throw new Error("无法创建导入前备份，已取消导入");
  state = nextState;
  editor.value = activeDoc().markdown;
  renderAll();
  await persist(true);
  return true;
}
async function restoreImportSafetySnapshot(){
  let payload;
  try {
    const raw = localStorage.getItem(IMPORT_BACKUP_KEY);
    if (!raw) return showToast("没有可恢复的导入前快照", true);
    payload = JSON.parse(raw);
  } catch (error) {
    return showToast("导入前快照已损坏，无法恢复", true);
  }
  const sourceState = payload?.state || payload;
  if (!sourceState || !Array.isArray(sourceState.docs)) return showToast("导入前快照无效", true);
  const nextState = normalizeState(sourceState);
  if (!confirm(`将当前 ${state.docs.length} 篇文档替换为导入前的 ${nextState.docs.length} 篇文档？当前文档库也会先创建安全快照。`)) return;
  if (!await createSafetySnapshot("before-snapshot-restore")) return showToast("无法备份当前文档库，已取消恢复", true);
  state = nextState;
  editor.value = activeDoc().markdown;
  renderAll();
  await persist(true);
  showToast("已恢复导入前文档库");
}
function showToast(message, error=false){
  $("span", toast).textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function setTab(which){
  $$(".right-tab").forEach(x => x.classList.toggle("on", x.dataset.tab === which));
  $("#tab-styles").style.display = which === "styles" ? "" : "none";
  $("#tab-compat").style.display = which === "compat" ? "" : "none";
  $("#tab-export").style.display = which === "export" ? "" : "none";
  $("#btn-styles").classList.toggle("active", which === "styles");
  $("#btn-check").classList.toggle("active", which === "compat");
}
function setLibCollapsed(v){ app.classList.toggle("lib-collapsed", v); lib.classList.toggle("collapsed", v); }
function setRightCollapsed(v){ app.classList.toggle("right-collapsed", v); rightPanel.classList.toggle("collapsed", v); }
function toggleFocusMode(mode){
  const className = `${mode}-focus`;
  const active = !app.classList.contains(className);
  app.classList.remove("editor-focus", "preview-focus");
  if (active) app.classList.add(className);
  $("#toggle-editor-fullscreen").classList.toggle("on", active && mode === "editor");
  $("#toggle-preview-fullscreen").classList.toggle("on", active && mode === "preview");
  $("#toggle-editor-fullscreen").title = active && mode === "editor" ? "退出编辑器全屏" : "编辑器全屏";
  $("#toggle-preview-fullscreen").title = active && mode === "preview" ? "退出预览全屏" : "预览全屏";
}

editor.addEventListener("input", () => {
  const doc = activeDoc();
  doc.markdown = editor.value;
  if (!doc.manualTitle) doc.title = firstHeading(editor.value);
  doc.updatedAt = nowIso();
  renderPreview();
  renderMeta();
  renderLibrary();
  scheduleCompatibilityRender();
  persist();
});

searchInput.addEventListener("input", () => { state.search = searchInput.value; renderLibrary(); persist(); });
sortSelect.querySelectorAll("option").forEach((o, idx) => o.value = ["updated", "created", "chars", "title"][idx]);
sortSelect.addEventListener("change", () => { state.sort = sortSelect.value; renderLibrary(); persist(); });
$("[data-library-action='add-directory']").addEventListener("click", addDirectory);
$("[data-library-action='add-tag']").addEventListener("click", addTag);
$$("[data-toolbar-action='new-doc']").forEach(btn => btn.addEventListener("click", () => createDocument()));
$("[data-toolbar-action='import-md']").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  createDocument(await file.text());
  fileInput.value = "";
  showToast("已导入 Markdown 文件");
});
libraryInput.addEventListener("change", async () => {
  const file = libraryInput.files[0];
  if (!file) return;
  try {
    const imported = await importLibraryFile(file);
    if (imported) showToast("已导入文档库，原文档库已保存为安全快照");
  } catch (error) {
    showToast(`导入失败：${error.message}`, true);
  } finally {
    libraryInput.value = "";
  }
});
$("#style-chip").addEventListener("click", () => { setRightCollapsed(false); setTab("styles"); });
$(".new-btn").addEventListener("click", generateCustomStyle);
$$(".style-tabs button").forEach((btn, idx) => btn.addEventListener("click", () => {
  styleTab = idx === 0 ? "built-in" : idx === 1 ? "custom" : "favorite";
  styleCategory = "all";
  renderStyleCards();
}));
$("#style-search").addEventListener("input", () => { styleSearch = $("#style-search").value; renderStyleCards(); });
$("#style-category").addEventListener("change", () => { styleCategory = $("#style-category").value; renderStyleCards(); });
$("#override-heading").addEventListener("change", (e) => updateStyleOverride("heading", e.target.value));
$("#override-font").addEventListener("change", (e) => updateStyleOverride("font", e.target.value));
$("#override-text").addEventListener("input", (e) => updateStyleOverride("textColor", e.target.value));
$("#override-page").addEventListener("input", (e) => updateStyleOverride("pageBg", e.target.value));
$("#override-strong").addEventListener("input", (e) => updateStyleOverride("strongBg", e.target.value));
$("#override-accent").addEventListener("input", (e) => updateStyleOverride("accent", e.target.value));
$("#reset-overrides").addEventListener("click", resetStyleOverrides);
$$(".right-tab").forEach(t => t.addEventListener("click", () => setTab(t.dataset.tab)));
$("#btn-styles").addEventListener("click", () => setTab("styles"));
$("#btn-check").addEventListener("click", () => setTab("compat"));
$$(".mode-toggle button").forEach(b => b.addEventListener("click", () => {
  $$(".mode-toggle button").forEach(x => x.classList.remove("on"));
  b.classList.add("on");
  const wide = b.textContent.trim() === "PC";
  $(".phone-frame").style.maxWidth = wide ? "640px" : "420px";
  $(".preview-pane .pane-head .label").lastChild.textContent = wide ? " 公众号预览 · PC 宽度" : " 公众号预览 · 手机宽度";
}));
$("#toggle-lib").addEventListener("click", () => setLibCollapsed(!lib.classList.contains("collapsed")));
$("#toggle-right").addEventListener("click", () => setRightCollapsed(!rightPanel.classList.contains("collapsed")));
$("#rail-expand-lib").addEventListener("click", () => setLibCollapsed(false));
$("#rail-expand-right").addEventListener("click", () => setRightCollapsed(false));
$$('[data-library-rail-action]').forEach(btn => btn.addEventListener("click", () => {
  setLibCollapsed(false);
  if (btn.dataset.libraryRailAction === "search") requestAnimationFrame(() => searchInput.focus());
  if (btn.dataset.libraryRailAction === "tags") requestAnimationFrame(() => $(".tag-row")?.scrollIntoView({ block:"center" }));
}));
$$("[data-rail-tab]").forEach(b => b.addEventListener("click", () => { setRightCollapsed(false); setTab(b.dataset.railTab); }));
$("#toggle-wrap").addEventListener("click", () => {
  const noWrap = !editor.classList.contains("no-wrap");
  editor.classList.toggle("no-wrap", noWrap);
  editor.setAttribute("wrap", noWrap ? "off" : "soft");
  $("#toggle-wrap").classList.toggle("on", !noWrap);
  $("#toggle-wrap").title = noWrap ? "开启自动换行" : "关闭自动换行";
});
$("#toggle-editor-fullscreen").addEventListener("click", () => toggleFocusMode("editor"));
$("#toggle-preview-fullscreen").addEventListener("click", () => toggleFocusMode("preview"));
$("#btn-copy").addEventListener("click", () => copyRichText().catch(e => showToast(`复制失败：${e.message}`, true)));

$("[data-export-action='copy-rich']").addEventListener("click", () => copyRichText().catch(e => showToast(`复制失败：${e.message}`, true)));
$("[data-export-action='copy-html']").addEventListener("click", () => copyHtml().catch(e => showToast(`复制失败：${e.message}`, true)));
$("[data-export-action='download-html']").addEventListener("click", () => downloadFile(`${activeDoc().title || "article"}.html`, `<!doctype html><meta charset="utf-8">${inlineArticleHtml()}`, "text/html;charset=utf-8"));
$("[data-export-action='download-md']").addEventListener("click", () => downloadFile(`${activeDoc().title || "article"}.md`, activeDoc().markdown, "text/markdown;charset=utf-8"));
$("[data-export-action='export-library']").addEventListener("click", exportLibrary);
$("[data-export-action='import-library']").addEventListener("click", () => libraryInput.click());
$("[data-export-action='restore-import-backup']").addEventListener("click", () => restoreImportSafetySnapshot().catch(error => showToast(`恢复失败：${error.message}`, true)));

window.addEventListener("keydown", async (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    const ok = await persist(true);
    showToast(ok ? "已保存到本地文档库" : "保存失败", !ok);
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchInput.focus(); }
});

window.addEventListener("beforeunload", flushBrowserState);
window.addEventListener("pagehide", flushBrowserState);

const narrowLayout = window.matchMedia("(max-width: 900px)");
function syncNarrowLayout(event){
  setLibCollapsed(event.matches);
  setRightCollapsed(event.matches);
}
syncNarrowLayout(narrowLayout);
narrowLayout.addEventListener?.("change", syncNarrowLayout);
setActiveDoc(state.activeDocId, false);
restoreElectronLibraryBackup();
