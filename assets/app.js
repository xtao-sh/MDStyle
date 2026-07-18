/* MD Style renderer orchestration, local library UI, and export workflows. */
const editor = document.getElementById("editor");
const preview = document.getElementById("preview");
const previewPane = document.getElementById("preview-pane");
const toast = document.getElementById("toast");
const STORAGE_KEY = "md-style-library-v1";
const IMPORT_BACKUP_KEY = "md-style-library-before-import-v1";
const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
const MAX_MARKDOWN_IMPORT_BYTES = 5 * 1024 * 1024;
const NARROW_LAYOUT_QUERY = "(max-width: 1320px)";
const SAMPLE_MD = editor.value;

const themeCatalog = globalThis.MDStyleThemeCatalog;
if (!themeCatalog) throw new Error("Theme catalog failed to load");
const BUILTIN_STYLES = themeCatalog.themes;
const LEGACY_STYLE_REPLACEMENTS = themeCatalog.legacyReplacements;
const BUILTIN_STYLE_FAMILIES = themeCatalog.families;
const documentTemplateCatalog = globalThis.MDStyleDocumentTemplates;
if (!documentTemplateCatalog) throw new Error("Document templates failed to load");
const DOCUMENT_TEMPLATES = documentTemplateCatalog.templates;
const publishingProfileCatalog = globalThis.MDStylePublishingProfiles;
if (!publishingProfileCatalog) throw new Error("Publishing profiles failed to load");
const PUBLISHING_PROFILES = publishingProfileCatalog.profiles;

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
  humanist: '"Avenir Next","Segoe UI","Helvetica Neue","PingFang SC",sans-serif',
  rounded: '"Arial Rounded MT Bold","PingFang SC","Microsoft YaHei",sans-serif',
  mono: '"JetBrains Mono","SFMono-Regular","Cascadia Code","Microsoft YaHei",monospace',
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
  fontPresets,
  targetProfileIds:publishingProfileCatalog.ids,
  legacyTargetId:"wechat",
});
const { tagColors, normalizeCssColor, normalizeTargetId, normalizeStyleOverrides, seedState, normalizeState } = libraryModel;
function colorInputValue(value, fallback="#1A1A18"){
  const color = normalizeCssColor(value, fallback).trim();
  if (/^#[0-9a-f]{3}$/i.test(color)) return `#${[...color.slice(1)].map(char => char + char).join("")}`.toLowerCase();
  if (/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(color)) return color.slice(0, 7).toLowerCase();
  const rgb = color.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (rgb) return `#${rgb.slice(1, 4).map(part => Math.min(255, Number(part)).toString(16).padStart(2, "0")).join("")}`;
  const hsl = color.match(/^hsla?\(\s*(\d{1,3})(?:deg)?\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%/i);
  if (hsl) {
    const hue = (Number(hsl[1]) % 360) / 360;
    const saturation = Math.min(100, Number(hsl[2])) / 100;
    const lightness = Math.min(100, Number(hsl[3])) / 100;
    const channel = (offset) => {
      const k = (offset + hue * 12) % 12;
      const a = saturation * Math.min(lightness, 1 - lightness);
      return Math.round(255 * (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    return `#${[channel(0), channel(8), channel(4)].map(part => part.toString(16).padStart(2, "0")).join("")}`;
  }
  return /^#[0-9a-f]{6}$/i.test(fallback) ? fallback.toLowerCase() : "#1a1a18";
}
function contrastTextColor(value){
  const hex = colorInputValue(value, "#FFFFFF").slice(1);
  const [r, g, b] = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#1A1A18" : "#FFFFFF";
}
function nextTagColor(){ return tagColors[state.tags.length % tagColors.length]; }

const markdownEngine = globalThis.MDStyleMarkdown;
if (!markdownEngine) throw new Error("Markdown engine failed to load");
const mdToHtml = markdownEngine.render;


let storageLoadError = "";
let storageHadLocalState = false;
let browserStorageRecord = null;
function latestStateTimestamp(saved){
  const timestamps = Array.isArray(saved?.docs) ? saved.docs.map(doc => new Date(doc?.updatedAt || doc?.createdAt || 0).getTime()) : [];
  const latest = Math.max(0, ...timestamps.filter(Number.isFinite));
  return latest ? new Date(latest).toISOString() : new Date(0).toISOString();
}
function normalizeStorageRecord(payload){
  const enveloped = payload?.state && Array.isArray(payload.state.docs);
  const savedState = enveloped ? payload.state : payload;
  if (!savedState || !Array.isArray(savedState.docs) || !savedState.docs.some(doc => doc && typeof doc === "object" && !Array.isArray(doc))) return null;
  const parsedTime = new Date(enveloped ? payload.savedAt : latestStateTimestamp(savedState)).getTime();
  return {
    version:Number(enveloped ? payload.version : 1) || 1,
    savedAt:Number.isFinite(parsedTime) ? new Date(parsedTime).toISOString() : latestStateTimestamp(savedState),
    revision:Number(enveloped ? payload.revision : 0) || 0,
    state:savedState,
  };
}
function storageRecordTime(record){
  const value = new Date(record?.savedAt || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}
function compareStorageRecords(left, right){
  const timeDifference = storageRecordTime(left) - storageRecordTime(right);
  if (timeDifference) return timeDifference;
  return Number(left?.revision || 0) - Number(right?.revision || 0);
}
function loadSavedState(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    storageHadLocalState = !!raw;
    if (!raw) return null;
    browserStorageRecord = normalizeStorageRecord(JSON.parse(raw));
    if (!browserStorageRecord) throw new Error("本地文档库缺少有效数据");
    return browserStorageRecord.state;
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
let styleIntensity = "all";
let styleSearch = "";
let templateCategory = "all";
let templateSearch = "";
let editingTemplateId = "";
let libraryEditorState = { mode:"", id:"" };
let pendingConfirmResolve = null;
let previewWidth = "mobile";
let saveTimer = null;
let saveRevision = 0;
let saveQueue = Promise.resolve(true);
let compatibilityTimer = null;
let lastRenderResult = { html:"", exportHtml:"", text:"", stats:{ chars:0, htmlBytes:0, imageCount:0, linkCount:0 }, issues:[] };

const app = $(".app");
const lib = $("#library");
const rightPanel = $("#right");
const mainPanel = $(".main");
const drawerBackdrop = $("#drawer-backdrop");
const searchInput = $(".search-wrap input");
const sortSelect = $(".lib-sort select");
const confirmDialog = $("#confirm-dialog");
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

function settleConfirm(result){
  if (!pendingConfirmResolve) return;
  const resolve = pendingConfirmResolve;
  pendingConfirmResolve = null;
  if (confirmDialog.open) confirmDialog.close();
  resolve(result);
}

function confirmAction({ title="确认操作", message="", confirmLabel="确认", danger=false }={}){
  if (pendingConfirmResolve) settleConfirm(false);
  $("#confirm-title").textContent = title;
  $("#confirm-message").textContent = message;
  $("#confirm-accept").textContent = confirmLabel;
  confirmDialog.classList.toggle("danger", danger);
  return new Promise(resolve => {
    pendingConfirmResolve = resolve;
    if (typeof confirmDialog.showModal === "function") confirmDialog.showModal();
    else confirmDialog.setAttribute("open", "");
    requestAnimationFrame(() => $("#confirm-cancel").focus());
  });
}

function activeDoc(){ return state.docs.find(d => d.id === state.activeDocId) || state.docs[0]; }
function styleById(id){ return state.styles.find(s => s.id === id) || state.styles[0]; }
function publishingProfile(doc=activeDoc()){ return publishingProfileCatalog.get(doc?.targetId); }
function stateSnapshot(){
  return JSON.parse(JSON.stringify(state));
}
async function backupLibraryState(snapshot=state, savedAt=nowIso(), revision=0){
  if (!window.mdStyleStorage?.saveLibrary) return null;
  await window.mdStyleStorage.saveLibrary({ state:snapshot, savedAt, revision });
  return true;
}
function saveBrowserState(snapshot=state, savedAt=nowIso(), revision=saveRevision){
  const record = { version:2, savedAt, revision, state:snapshot };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  browserStorageRecord = record;
  storageHadLocalState = true;
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
      await window.mdStyleStorage.createSnapshot({ state:snapshot, savedAt:nowIso(), revision:saveRevision }, reason);
      fileSaved = true;
    } catch (error) {
      console.warn("Failed to save file safety snapshot", error);
    }
  }
  return browserSaved || fileSaved;
}
async function restoreElectronLibraryBackup(){
  if (!window.mdStyleStorage?.loadLibrary) return;
  try {
    const payload = await window.mdStyleStorage.loadLibrary();
    const fileRecord = normalizeStorageRecord(payload);
    if (!fileRecord) return;
    const nextState = normalizeState(fileRecord.state);
    if (!nextState.docs.length) return;
    const fileComparison = compareStorageRecords(fileRecord, browserStorageRecord);
    if (!storageHadLocalState || fileComparison > 0) {
      state = nextState;
      editor.value = activeDoc().markdown;
      renderAll();
      await persist(true);
      showToast(storageLoadError ? "已从本地文件备份恢复文档库" : "已载入较新的本地文件版本");
      return;
    }
    if (fileComparison < 0) await persist(true);
  } catch (error) {
    console.warn("Failed to restore Electron library backup", error);
  }
}
function persist(immediate=false){
  const revision = ++saveRevision;
  const enqueue = () => {
    const snapshot = stateSnapshot();
    const savedAt = nowIso();
    const run = async () => {
      let localSaved = false;
      let backupSaved = null;
      let localError = null;
      let backupError = null;
      try {
        localSaved = saveBrowserState(snapshot, savedAt, revision);
      } catch (error) {
        localError = error;
      }
      try {
        backupSaved = await backupLibraryState(snapshot, savedAt, revision);
      } catch (error) {
        backupError = error;
      }
      if (localSaved || backupSaved) {
        if (revision === saveRevision) {
          if (localSaved && backupSaved !== false && !backupError) updateSaveState("已保存", "ok", savedAt);
          else if (backupSaved && !localSaved) updateSaveState("已保存到文件，浏览器副本失败", "warn", savedAt);
          else updateSaveState("已保存到浏览器，文件备份失败", "warn", savedAt);
        }
        if (backupError) console.warn("Failed to write Electron library backup", backupError);
        if (localError) console.warn("Failed to save browser library", localError);
        return true;
      }
      if (revision === saveRevision) updateSaveState("保存失败", "error");
      console.warn("Failed to save library", localError || backupError);
      return false;
    };
    const current = saveQueue.catch(() => false).then(run);
    saveQueue = current;
    return current;
  };
  clearTimeout(saveTimer);
  saveTimer = null;
  updateSaveState("保存中", "pending");
  if (immediate) return enqueue();
  saveTimer = setTimeout(() => {
    saveTimer = null;
    enqueue();
  }, 450);
  return true;
}
let saveUiState = {
  label:storageHadLocalState ? "已加载" : "待保存",
  tone:storageHadLocalState ? "ok" : "pending",
  savedAt:browserStorageRecord?.savedAt || "",
};
function saveStateColor(tone){
  if (tone === "ok") return "var(--accent-2)";
  if (tone === "error") return "var(--danger)";
  return "var(--warn)";
}
function saveStateTime(savedAt){
  const date = savedAt ? new Date(savedAt) : new Date();
  return date.toLocaleTimeString("zh-CN", { hour:"2-digit", minute:"2-digit" });
}
function renderSaveState(){
  const el = $(".save-state");
  const statusGroup = $$(".status .gr")[0];
  const time = saveStateTime(saveUiState.savedAt);
  const color = saveStateColor(saveUiState.tone);
  if (el) el.innerHTML = `<span class="save-dot" style="background:${color}"></span>${escapeHtml(saveUiState.label)} · ${time}`;
  if (statusGroup) statusGroup.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="6"/><path d="M5 8l2 2 4-4"/></svg> <b>${escapeHtml(saveUiState.label)}</b> · ${time}`;
}
function updateSaveState(label, tone="ok", savedAt=""){
  saveUiState = { label, tone, savedAt:savedAt || (tone === "ok" || tone === "warn" ? nowIso() : saveUiState.savedAt) };
  renderSaveState();
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
  renderTemplateLibrary();
  renderMeta();
  renderPublishingTarget();
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
  document.title = `${doc.title || "MD Style"} · Markdown 富文本排版`;
}

function renderPublishingTarget(){
  const doc = activeDoc();
  if (!doc) return;
  doc.targetId = normalizeTargetId(doc.targetId);
  const profile = publishingProfile(doc);
  const select = $("#target-profile");
  select.innerHTML = PUBLISHING_PROFILES.map(item => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.name)}</option>`).join("");
  select.value = profile.id;
  $("#target-description").textContent = profile.description;
  $("#preview-label-text").textContent = `${profile.name} · ${previewWidth === "desktop" ? "桌面" : "移动"}宽度`;
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
function activateFirstFilteredDocIfNeeded(){
  const docs = filteredDocs();
  if (!docs.length || docs.some(doc => doc.id === state.activeDocId)) return false;
  setActiveDoc(docs[0].id, false);
  return true;
}

function renderLibrary(){
  const dirsWrap = $(".dir-tree");
  dirsWrap.innerHTML = state.dirs.map(dir => {
    const count = dir.id === "all" ? state.docs.length : state.docs.filter(d => d.directoryId === dir.id).length;
    const actions = dir.system ? "" : `<span class="dir-actions">
      <button type="button" class="doc-action" data-dir-action="rename" title="重命名目录" aria-label="重命名目录“${escapeAttr(dir.name)}”">✎</button>
      <button type="button" class="doc-action" data-dir-action="delete" title="删除目录" aria-label="删除目录“${escapeAttr(dir.name)}”">×</button>
    </span>`;
    return `<div class="dir-item ${state.activeDirId === dir.id ? "on" : ""}" data-dir="${escapeAttr(dir.id)}" role="button" tabindex="0" aria-label="打开目录“${escapeAttr(dir.name)}”" aria-current="${state.activeDirId === dir.id ? "true" : "false"}">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 12V5a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/></svg>
      ${escapeHtml(dir.name)} <span class="dir-count ${dir.system ? "" : "has-actions"}">${count}</span>${actions}
    </div>`;
  }).join("");
  $$(".dir-item", dirsWrap).forEach(item => item.addEventListener("click", (e) => {
    const action = e.target.closest("[data-dir-action]")?.dataset.dirAction;
    if (action) return handleDirAction(item.dataset.dir, action);
    state.activeDirId = item.dataset.dir;
    if (!activateFirstFilteredDocIfNeeded()) renderLibrary();
    persist();
  }));
  $$(".dir-item", dirsWrap).forEach(item => item.addEventListener("keydown", (event) => {
    if (event.target !== item || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    item.click();
  }));

  const tagWrap = $(".tag-row");
  tagWrap.innerHTML = state.tags.map(tag => `<span class="tag-item">
    <button type="button" class="tag-chip ${state.activeTagIds.includes(tag.id) ? "on" : ""}" data-tag="${escapeAttr(tag.id)}" aria-pressed="${state.activeTagIds.includes(tag.id)}">
      <span class="dot" style="background:${tag.color}"></span>${escapeHtml(tag.name)}
    </button>
    <span class="tag-actions">
      <button type="button" class="tag-action" data-tag-action="edit" data-tag-id="${escapeAttr(tag.id)}" aria-label="编辑标签“${escapeAttr(tag.name)}”">✎</button>
      <button type="button" class="tag-action" data-tag-action="delete" data-tag-id="${escapeAttr(tag.id)}" aria-label="删除标签“${escapeAttr(tag.name)}”">×</button>
    </span>
  </span>`).join("");
  $$(".tag-chip", tagWrap).forEach(item => item.addEventListener("click", () => {
    const id = item.dataset.tag;
    state.activeTagIds = state.activeTagIds.includes(id) ? state.activeTagIds.filter(x => x !== id) : [...state.activeTagIds, id];
    if (!activateFirstFilteredDocIfNeeded()) renderLibrary();
    persist();
  }));
  $$('[data-tag-action]', tagWrap).forEach(button => button.addEventListener("click", () => handleTagAction(button.dataset.tagId, button.dataset.tagAction)));

  searchInput.value = state.search || "";
  sortSelect.value = sortSelect.querySelector(`option[value="${state.sort}"]`) ? state.sort : sortSelect.value;

  const docs = filteredDocs();
  const list = $("#doc-list");
  const activeOutsideFilter = !docs.some(doc => doc.id === state.activeDocId);
  const contextNote = activeOutsideFilter ? `<div class="filter-context-note">当前编辑文档不在筛选结果中。清除筛选或选择下方文档可切换。</div>` : "";
  if (!docs.length) {
    list.innerHTML = `${contextNote}<div class="empty-state">没有匹配的文档。<br>点击顶部“新建”开始写作。</div>`;
  } else {
    list.innerHTML = contextNote + docs.map(doc => {
      const tags = doc.tagIds.slice(0, 2).map(id => state.tags.find(t => t.id === id)?.name).filter(Boolean).map(t => `<span class="tg">${escapeHtml(t)}</span>`).join("");
      return `<div class="doc-item ${doc.id === state.activeDocId ? "on" : ""}" data-doc="${escapeAttr(doc.id)}" role="button" tabindex="0" aria-label="打开文档“${escapeAttr(doc.title || firstHeading(doc.markdown))}”" aria-current="${doc.id === state.activeDocId ? "true" : "false"}">
        <div class="ttl"><span>${escapeHtml(doc.title || firstHeading(doc.markdown))}</span>
          <span class="doc-actions">
            <button type="button" class="doc-action" data-action="rename" title="重命名" aria-label="重命名文档">✎</button>
            <button type="button" class="doc-action" data-action="move" title="移动目录" aria-label="移动文档到其他目录">⇄</button>
            <button type="button" class="doc-action" data-action="tags" title="编辑标签" aria-label="编辑文档标签">#</button>
            <button type="button" class="doc-action" data-action="delete" title="删除" aria-label="删除文档">×</button>
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
    item.addEventListener("keydown", (event) => {
      if (event.target !== item || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      item.click();
    });
  });
  $(".lib-sort span").textContent = `共 ${docs.length} 篇`;
}

function closeLibraryEditor(){
  $("#library-editor").hidden = true;
  $("#library-editor-fields").replaceChildren();
  libraryEditorState = { mode:"", id:"" };
}

function openLibraryEditor(mode, id=""){
  const form = $("#library-editor");
  const fields = $("#library-editor-fields");
  const doc = mode.startsWith("doc-") ? state.docs.find(item => item.id === id) : null;
  const dir = mode === "dir-rename" ? state.dirs.find(item => item.id === id && !item.system) : null;
  const tag = mode === "tag-edit" ? state.tags.find(item => item.id === id) : null;
  let title = "编辑文档";
  let hint = "修改会自动保存到本地文档库。";
  let submitLabel = "保存";
  let content = "";

  if (mode === "doc-rename" && doc) {
    title = "重命名文档";
    hint = "自定义标题后，不再随一级标题自动变化。";
    content = `<label class="builder-field builder-field-wide">文档标题<input id="library-doc-title" maxlength="80" value="${escapeAttr(doc.title || firstHeading(doc.markdown))}" required></label>`;
  } else if (mode === "doc-move" && doc) {
    title = "移动文档";
    hint = `为“${doc.title || firstHeading(doc.markdown)}”选择目标目录。`;
    content = `<label class="builder-field builder-field-wide">目标目录<select id="library-doc-directory">${state.dirs.filter(item => item.id !== "all").map(item => `<option value="${escapeAttr(item.id)}" ${item.id === doc.directoryId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>`;
  } else if (mode === "doc-tags" && doc) {
    title = "编辑文档标签";
    hint = "可多选；全部取消即可清除标签。";
    const options = state.tags.map(tag => `<label class="library-tag-option"><input type="checkbox" name="library-doc-tag" value="${escapeAttr(tag.id)}" ${doc.tagIds.includes(tag.id) ? "checked" : ""}><span class="dot" style="background:${escapeAttr(tag.color)}"></span><span>${escapeHtml(tag.name)}</span></label>`).join("");
    content = `<div class="builder-field builder-field-wide"><span>标签</span><div class="library-tag-options">${options || `<div class="library-field-empty">还没有标签。先点击标签区右侧的“+”创建一个。</div>`}</div></div>`;
  } else if (mode === "dir-add") {
    title = "新建目录";
    hint = "目录用于归档文档，可随时移动。";
    submitLabel = "创建";
    content = `<label class="builder-field builder-field-wide">目录名称<input id="library-directory-name" maxlength="40" autocomplete="off" required></label>`;
  } else if (mode === "dir-rename" && dir) {
    title = "重命名目录";
    hint = "目录中的文档不会受到影响。";
    content = `<label class="builder-field builder-field-wide">目录名称<input id="library-directory-name" maxlength="40" value="${escapeAttr(dir.name)}" required></label>`;
  } else if (mode === "tag-add") {
    title = "新建标签";
    hint = "颜色用于文档库中的快速识别。";
    submitLabel = "创建";
    content = `<label class="builder-field builder-field-wide">标签名称<input id="library-tag-name" maxlength="24" autocomplete="off" required></label><label class="builder-field builder-field-wide">标签颜色<input type="color" id="library-tag-color" value="${colorInputValue(nextTagColor(), "#5C8A7D")}"></label>`;
  } else if (mode === "tag-edit" && tag) {
    title = "编辑标签";
    hint = "名称和颜色会同步更新到所有使用该标签的文档。";
    content = `<label class="builder-field builder-field-wide">标签名称<input id="library-tag-name" maxlength="24" value="${escapeAttr(tag.name)}" required></label><label class="builder-field builder-field-wide">标签颜色<input type="color" id="library-tag-color" value="${colorInputValue(tag.color, "#5C8A7D")}"></label>`;
  } else {
    return;
  }

  libraryEditorState = { mode, id };
  $("#library-editor-title").textContent = title;
  $("#library-editor-hint").textContent = hint;
  $("#save-library-editor").textContent = submitLabel;
  fields.innerHTML = content;
  form.hidden = false;
  requestAnimationFrame(() => {
    form.scrollIntoView({ block:"nearest" });
    $("input,select", fields)?.focus();
  });
}

function submitLibraryEditor(event){
  event.preventDefault();
  const { mode, id } = libraryEditorState;
  const doc = state.docs.find(item => item.id === id);
  const dir = state.dirs.find(item => item.id === id && !item.system);
  const tag = state.tags.find(item => item.id === id);
  let message = "修改已保存";

  if (mode === "doc-rename" && doc) {
    const name = $("#library-doc-title").value.trim().slice(0, 80);
    if (!name) return showToast("文档标题不能为空", true);
    doc.title = name;
    doc.manualTitle = true;
    doc.updatedAt = nowIso();
    message = "文档已重命名";
  } else if (mode === "doc-move" && doc) {
    const directoryId = $("#library-doc-directory").value;
    if (!state.dirs.some(item => item.id === directoryId && item.id !== "all")) return showToast("目标目录不存在", true);
    doc.directoryId = directoryId;
    doc.updatedAt = nowIso();
    message = "文档已移动";
  } else if (mode === "doc-tags" && doc) {
    doc.tagIds = $$('input[name="library-doc-tag"]:checked', $("#library-editor-fields")).map(input => input.value);
    doc.updatedAt = nowIso();
    message = "文档标签已更新";
  } else if (mode === "dir-add") {
    const name = $("#library-directory-name").value.trim().slice(0, 40);
    if (!name) return showToast("目录名称不能为空", true);
    if (state.dirs.some(item => item.name === name)) return showToast("目录名称已存在", true);
    const directoryId = uid();
    state.dirs.push({ id:directoryId, name });
    state.activeDirId = directoryId;
    message = `已创建目录“${name}”`;
  } else if (mode === "dir-rename" && dir) {
    const name = $("#library-directory-name").value.trim().slice(0, 40);
    if (!name) return showToast("目录名称不能为空", true);
    if (state.dirs.some(item => item.id !== id && item.name === name)) return showToast("目录名称已存在", true);
    dir.name = name;
    message = "目录已重命名";
  } else if (mode === "tag-add") {
    const name = $("#library-tag-name").value.trim().slice(0, 24);
    if (!name) return showToast("标签名称不能为空", true);
    if (state.tags.some(item => item.name === name)) return showToast("标签已存在", true);
    state.tags.push({ id:uid(), name, color:colorInputValue($("#library-tag-color").value, nextTagColor()) });
    message = `已创建标签“${name}”`;
  } else if (mode === "tag-edit" && tag) {
    const previousName = tag.name;
    const name = $("#library-tag-name").value.trim().slice(0, 24);
    if (!name) return showToast("标签名称不能为空", true);
    if (state.tags.some(item => item.id !== id && item.name === name)) return showToast("标签已存在", true);
    tag.name = name;
    tag.color = colorInputValue($("#library-tag-color").value, tag.color);
    (state.customTemplates || []).forEach(template => {
      template.tags = template.tags.map(item => item === previousName ? name : item);
    });
    message = "标签已更新";
  } else {
    return closeLibraryEditor();
  }

  closeLibraryEditor();
  renderLibrary();
  renderMeta();
  persist();
  showToast(message);
}

async function handleDocAction(id, action){
  const doc = state.docs.find(d => d.id === id);
  if (!doc) return;
  if (["rename", "move", "tags"].includes(action)) return openLibraryEditor(`doc-${action}`, id);
  if (action === "delete" && await confirmAction({
    title:"删除文档",
    message:`确定删除“${doc.title || firstHeading(doc.markdown)}”吗？此操作无法撤销。`,
    confirmLabel:"删除文档",
    danger:true,
  })) {
    const deletingActive = state.activeDocId === id;
    state.docs = state.docs.filter(d => d.id !== id);
    if (deletingActive) state.activeDocId = filteredDocs()[0]?.id || state.docs[0]?.id;
    if (!state.docs.length) createDocument();
    else if (deletingActive) setActiveDoc(state.activeDocId);
    else { renderLibrary(); persist(); }
    showToast("文档已删除");
  }
}

function createDocument(markdown="# 未命名文档\n\n从这里开始写 Markdown。", options={}){
  const activeDirectory = state.activeDirId && state.activeDirId !== "all" ? state.activeDirId : "uncategorized";
  const directoryId = state.dirs.some(dir => dir.id === options.directoryId && dir.id !== "all") ? options.directoryId : activeDirectory;
  const styleId = state.styles.some(style => style.id === options.styleId) ? options.styleId : "default";
  const targetId = normalizeTargetId(options.targetId, "general");
  const templateTagIds = Array.isArray(options.tags) ? options.tags.map(ensureTagByName) : [];
  const tagIds = [...new Set([...state.activeTagIds, ...templateTagIds])];
  const doc = {
    id:uid(), title:firstHeading(markdown), manualTitle:false, markdown, directoryId, tagIds, styleId, targetId,
    styleOverrides:{}, templateId:options.templateId || "", createdAt:nowIso(), updatedAt:nowIso(),
  };
  state.search = "";
  state.docs.unshift(doc);
  setActiveDoc(doc.id);
  return doc;
}

function allTemplates(){ return [...DOCUMENT_TEMPLATES, ...(state.customTemplates || [])]; }
function templateById(id){ return allTemplates().find(template => template.id === id); }
function closeRightOnNarrow(){ if (window.matchMedia(NARROW_LAYOUT_QUERY).matches) setRightCollapsed(true); }

function createDocumentFromTemplate(templateId){
  const template = templateById(templateId);
  if (!template) return showToast("模板不存在或已移除", true);
  createDocument(template.markdown, { templateId:template.id, styleId:template.styleId, targetId:template.targetId, tags:template.tags });
  closeRightOnNarrow();
  showToast(`已用“${template.name}”创建文档`);
}

function templateOutline(markdown){
  return [...String(markdown).matchAll(/^#{1,3}\s+(.+)$/gm)].map(match => match[1].trim()).filter(Boolean).slice(0, 6);
}

function openTemplateBuilder(templateId=""){
  const doc = activeDoc();
  if (!doc) return;
  const template = templateId ? (state.customTemplates || []).find(item => item.id === templateId) : null;
  if (templateId && !template) return showToast("个人模板不存在或已移除", true);
  const sourceTemplate = templateById(doc.templateId);
  editingTemplateId = template?.id || "";
  $("#template-builder-title").textContent = template ? "编辑个人模板" : "保存个人模板";
  $("#template-builder-hint").textContent = template ? "修改模板信息；也可选择用当前文档刷新模板内容。" : "保留当前 Markdown、推荐样式、标签和发布目标。";
  $("#submit-template").textContent = template ? "更新模板" : "保存模板";
  $("#template-name").value = template?.name || doc.title || firstHeading(doc.markdown);
  $("#template-custom-category").value = template?.cat || sourceTemplate?.cat || "我的模板";
  $("#template-description").value = template?.description || `基于“${doc.title || "当前文档"}”保存的个人模板`;
  $("#template-refresh-row").hidden = !template;
  $("#template-refresh-content").checked = false;
  $("#template-builder").hidden = false;
  requestAnimationFrame(() => $("#template-name").focus());
}

function closeTemplateBuilder(){
  $("#template-builder").hidden = true;
  $("#template-refresh-content").checked = false;
  editingTemplateId = "";
}

function saveCurrentAsTemplate(event){
  event.preventDefault();
  const doc = activeDoc();
  if (!doc) return;
  const name = $("#template-name").value.trim().slice(0, 50);
  const cat = $("#template-custom-category").value.trim().slice(0, 24);
  const description = $("#template-description").value.trim().slice(0, 120);
  if (!name || !cat || !description) return showToast("请完整填写模板名称、场景和用途说明", true);
  if ((state.customTemplates || []).some(template => template.id !== editingTemplateId && template.name === name)) return showToast("个人模板名称已存在", true);
  const tags = doc.tagIds.map(id => state.tags.find(tag => tag.id === id)?.name).filter(Boolean);
  const template = editingTemplateId ? (state.customTemplates || []).find(item => item.id === editingTemplateId) : null;
  if (editingTemplateId && !template) return showToast("个人模板不存在或已移除", true);
  const wasEditing = !!template;
  if (template) {
    template.name = name;
    template.cat = cat;
    template.description = description;
    template.updatedAt = nowIso();
    if ($("#template-refresh-content").checked) {
      template.tags = tags;
      template.markdown = doc.markdown;
      template.outline = templateOutline(doc.markdown);
      template.styleId = doc.styleId || "default";
      template.targetId = normalizeTargetId(doc.targetId, "general");
    }
  } else {
    state.customTemplates = [{
      id:`custom-${uid()}`, name, cat, description, tags, markdown:doc.markdown,
      outline:templateOutline(doc.markdown), styleId:doc.styleId || "default",
      targetId:normalizeTargetId(doc.targetId, "general"), custom:true, createdAt:nowIso(), updatedAt:nowIso(),
    }, ...(state.customTemplates || [])];
  }
  templateCategory = "all";
  templateSearch = "";
  closeTemplateBuilder();
  renderTemplateLibrary();
  persist();
  showToast(wasEditing ? `已更新个人模板“${name}”` : `已保存个人模板“${name}”`);
}

async function deleteCustomTemplate(templateId){
  const template = (state.customTemplates || []).find(item => item.id === templateId);
  if (!template || !await confirmAction({
    title:"删除个人模板",
    message:`确定删除“${template.name}”吗？已用该模板创建的文档不会受到影响。`,
    confirmLabel:"删除模板",
    danger:true,
  })) return;
  state.customTemplates = state.customTemplates.filter(item => item.id !== templateId);
  if (editingTemplateId === templateId) closeTemplateBuilder();
  renderTemplateLibrary();
  persist();
  showToast("已删除个人模板");
}

function openTemplateLibrary(){
  setRightCollapsed(false);
  setTab("templates");
  requestAnimationFrame(() => $("#template-search")?.focus());
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

async function handleDirAction(id, action){
  const dir = state.dirs.find(d => d.id === id);
  if (!dir || dir.system) return;
  if (action === "rename") return openLibraryEditor("dir-rename", id);
  if (action === "delete") {
    const affected = state.docs.filter(d => d.directoryId === id).length;
    if (!await confirmAction({
      title:"删除目录",
      message:`确定删除“${dir.name}”吗？${affected ? `其中 ${affected} 篇文档会移到“未分类”。` : "该目录中没有文档。"}`,
      confirmLabel:"删除目录",
      danger:true,
    })) return;
    state.docs.forEach(doc => { if (doc.directoryId === id) doc.directoryId = "uncategorized"; });
    state.dirs = state.dirs.filter(d => d.id !== id);
    if (state.activeDirId === id) state.activeDirId = "all";
    if (libraryEditorState.id === id) closeLibraryEditor();
    renderLibrary(); persist();
    showToast("目录已删除");
  }
}

function addDirectory(){
  openLibraryEditor("dir-add");
}

function addTag(){
  openLibraryEditor("tag-add");
}

async function handleTagAction(id, action){
  const tag = state.tags.find(item => item.id === id);
  if (!tag) return;
  if (action === "edit") return openLibraryEditor("tag-edit", id);
  if (action !== "delete" || !await confirmAction({
    title:"删除标签",
    message:`确定删除“${tag.name}”吗？该标签会从所有文档中移除。`,
    confirmLabel:"删除标签",
    danger:true,
  })) return;
  state.tags = state.tags.filter(item => item.id !== id);
  state.docs.forEach(doc => { doc.tagIds = doc.tagIds.filter(tagId => tagId !== id); });
  (state.customTemplates || []).forEach(template => { template.tags = template.tags.filter(name => name !== tag.name); });
  state.activeTagIds = state.activeTagIds.filter(tagId => tagId !== id);
  if (libraryEditorState.id === id) closeLibraryEditor();
  renderLibrary();
  persist();
  showToast("标签已删除");
}

function overrideClasses(overrides={}, style={}){
  const heading = overrides.heading || style.headingPreset || "";
  return [
    heading ? `heading-${heading}` : "",
    overrides.font ? "override-body-font" : "",
    overrides.textColor ? "override-text-color" : "",
    overrides.pageBg ? "override-page-bg" : "",
    overrides.strongBg ? "override-strong-bg" : "",
    overrides.paragraphBg ? "override-paragraph-bg" : "",
    overrides.paragraphSpacing ? "override-paragraph-spacing" : "",
    overrides.quoteBg ? "override-quote-bg" : "",
    overrides.codeBg ? "override-code-bg" : "",
    overrides.tableHeaderBg ? "override-table-header" : "",
    overrides.linkColor ? "override-link-color" : "",
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
  if (overrides.paragraphBg) previewPane.style.setProperty("--override-paragraph-bg", overrides.paragraphBg);
  if (overrides.paragraphSpacing) previewPane.style.setProperty("--override-paragraph-spacing", `${overrides.paragraphSpacing}px`);
  if (overrides.quoteBg) previewPane.style.setProperty("--override-quote-bg", overrides.quoteBg);
  if (overrides.codeBg) {
    previewPane.style.setProperty("--override-code-bg", overrides.codeBg);
    previewPane.style.setProperty("--override-code-text", contrastTextColor(overrides.codeBg));
  }
  if (overrides.tableHeaderBg) {
    previewPane.style.setProperty("--override-table-header", overrides.tableHeaderBg);
    previewPane.style.setProperty("--override-table-text", contrastTextColor(overrides.tableHeaderBg));
  }
  if (overrides.linkColor) previewPane.style.setProperty("--override-link-color", overrides.linkColor);
}
function updateStyleOverrideControls(){
  const doc = activeDoc();
  const style = styleById(doc?.styleId || "default");
  const overrides = normalizeStyleOverrides(doc?.styleOverrides);
  $("#override-heading").value = overrides.heading || "";
  $("#override-font").value = overrides.font || "";
  $("#override-text").value = colorInputValue(overrides.textColor || style.swatches?.[0], "#1A1A18");
  $("#override-page").value = colorInputValue(overrides.pageBg || style.swatches?.[2], "#FFFFFF");
  $("#override-strong").value = colorInputValue(overrides.strongBg || style.swatches?.[2], "#E7EEEA");
  $("#override-accent").value = colorInputValue(overrides.accent || style.swatches?.[1], "#5C8A7D");
  $("#override-paragraph").value = colorInputValue(overrides.paragraphBg, "#FFFFFF");
  $("#override-paragraph-spacing").value = String(overrides.paragraphSpacing || 14);
  $("#override-quote").value = colorInputValue(overrides.quoteBg || style.swatches?.[2], "#F7F6F1");
  $("#override-code-bg").value = colorInputValue(overrides.codeBg || style.swatches?.[3], "#26262B");
  $("#override-table-header").value = colorInputValue(overrides.tableHeaderBg || style.swatches?.[0], "#2F5D4F");
  $("#override-link").value = colorInputValue(overrides.linkColor || style.swatches?.[1], "#2F5D4F");
}
function applyStyle(styleId, shouldPersist=true){
  const doc = activeDoc();
  const style = styleById(styleId);
  if (!doc || !style) return;
  doc.styleId = style.id;
  doc.styleOverrides = normalizeStyleOverrides(doc.styleOverrides);
  previewPane.className = `preview-pane ${style.cls || "theme-custom"} ${overrideClasses(doc.styleOverrides, style)}`.trim();
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
    if (styleCategory !== "all" && styleFamily(s) !== styleCategory) return false;
    if (styleIntensity !== "all" && (s.intensity || "自定义") !== styleIntensity) return false;
    const q = styleSearch.trim().toLowerCase();
    if (!q) return true;
    return `${s.name} ${styleFamily(s)} ${s.cat || ""} ${s.intensity || ""} ${s.uc || ""} ${s.description || ""}`.toLowerCase().includes(q);
  });
  grid.innerHTML = styles.map(s => `
    <div class="style-card ${doc?.styleId === s.id ? "applied" : ""} ${s.builtin ? "" : "has-delete"}" data-style-id="${escapeAttr(s.id)}" data-style-intensity="${escapeAttr(s.intensity || "自定义")}" role="button" tabindex="0" aria-label="应用样式“${escapeAttr(s.name)}”" aria-pressed="${doc?.styleId === s.id}">
      ${doc?.styleId === s.id ? '<span class="applied-tag">已应用</span>' : ''}
      <button type="button" class="fav ${s.favorite ? "on" : ""}" title="收藏" aria-label="${s.favorite ? "取消收藏" : "收藏"}样式“${escapeAttr(s.name)}”" aria-pressed="${!!s.favorite}">
        <svg viewBox="0 0 16 16" fill="${s.favorite ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.4" style="width:11px;height:11px"><path d="M8 2l1.8 3.7 4 .6-2.9 2.9.7 4-3.6-1.9-3.6 1.9.7-4L2.2 6.3l4-.6L8 2z"/></svg>
      </button>
      ${s.builtin ? "" : `<button type="button" class="delete-style" title="删除个人样式" aria-label="删除个人样式“${escapeAttr(s.name)}”"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4h10M6 4V2.5h4V4M5 6v6M8 6v6M11 6v6M4 4l.7 10h6.6L12 4"/></svg></button>`}
      ${thumbHTML[s.thumb || s.id] || customThumb(s)}
      <div class="meta-row">
        <div class="nm">${escapeHtml(s.name)}<span class="cat">${escapeHtml(styleFamily(s))}</span><span class="intensity">${escapeHtml(s.intensity || "自定义")}</span></div>
        <div class="uc">${escapeHtml(s.uc || s.description || "自定义样式")}</div>
      </div>
    </div>`).join("") || `<div class="empty-state" style="grid-column:1 / -1">暂无样式。点击“自定义生成”创建一个。</div>`;
  $$(".style-card", grid).forEach(card => {
    card.addEventListener("click", (e) => {
      const style = styleById(card.dataset.styleId);
      if (e.target.closest(".delete-style")) {
        deleteCustomStyle(style.id);
        return;
      }
      if (e.target.closest(".fav")) {
        style.favorite = !style.favorite;
        renderStyleCards(); persist(); return;
      }
      applyStyle(style.id);
      closeRightOnNarrow();
    });
    card.addEventListener("mouseenter", () => showStylePreview(card));
    card.addEventListener("mouseleave", hideStylePreview);
    card.addEventListener("focus", () => showStylePreview(card));
    card.addEventListener("blur", (event) => { if (!card.contains(event.relatedTarget)) hideStylePreview(); });
    card.addEventListener("keydown", (event) => {
      if (event.target !== card || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      applyStyle(card.dataset.styleId);
      closeRightOnNarrow();
    });
  });
  $$(".style-tabs button").forEach((btn, idx) => {
    btn.classList.toggle("on", (idx === 0 && styleTab === "built-in") || (idx === 1 && styleTab === "custom") || (idx === 2 && styleTab === "favorite"));
    const counts = [state.styles.filter(s => s.builtin).length, state.styles.filter(s => !s.builtin).length, state.styles.filter(s => s.favorite).length];
    btn.textContent = idx === 0 ? `内置（${counts[0]}）` : idx === 1 ? `我的样式（${counts[1]}）` : `收藏（${counts[2]}）`;
  });
  renderStyleCategories();
  $("#style-search").value = styleSearch;
  $("#style-intensity").value = styleIntensity;
}
function styleFamily(style){
  return style.family || (style.builtin ? "其他" : "自定义");
}
function renderStyleCategories(){
  const select = $("#style-category");
  const scoped = state.styles.filter(s => {
    if (styleTab === "custom") return !s.builtin;
    if (styleTab === "favorite") return !!s.favorite;
    return !!s.builtin;
  });
  const available = new Set(scoped.map(styleFamily));
  const cats = [
    ...BUILTIN_STYLE_FAMILIES.filter(family => available.has(family)),
    ...[...available].filter(family => !BUILTIN_STYLE_FAMILIES.includes(family)).sort((a,b) => a.localeCompare(b, "zh-CN")),
  ];
  if (styleCategory !== "all" && !cats.includes(styleCategory)) styleCategory = "all";
  select.innerHTML = `<option value="all">全部视觉家族</option>${cats.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join("")}`;
  select.value = styleCategory;
}

function renderTemplateLibrary(){
  const grid = $("#template-grid");
  const categorySelect = $("#template-category");
  if (!grid || !categorySelect) return;
  const catalog = allTemplates();
  const categories = [...new Set(catalog.map(template => template.cat))].sort((a,b) => a.localeCompare(b, "zh-CN"));
  if (templateCategory !== "all" && !categories.includes(templateCategory)) templateCategory = "all";
  categorySelect.innerHTML = `<option value="all">全部场景</option>${categories.map(cat => `<option value="${escapeAttr(cat)}">${escapeHtml(cat)}</option>`).join("")}`;
  categorySelect.value = templateCategory;
  $("#template-search").value = templateSearch;

  const query = templateSearch.trim().toLowerCase();
  const templates = catalog.filter(template => {
    if (templateCategory !== "all" && template.cat !== templateCategory) return false;
    if (!query) return true;
    return `${template.name} ${template.cat} ${template.description} ${template.tags.join(" ")} ${template.outline.join(" ")}`.toLowerCase().includes(query);
  });
  $("#template-count").textContent = `共 ${catalog.length} 套 · 个人 ${(state.customTemplates || []).length} 套 · 当前显示 ${templates.length} 套`;
  grid.innerHTML = templates.map(template => {
    const style = styleById(template.styleId);
    const profile = publishingProfileCatalog.get(template.targetId);
    const swatches = style?.swatches || ["#1A1A18", "#5C8A7D", "#F7F6F1", "#26262B"];
    return `<div class="template-card ${template.custom ? "custom" : ""}" data-template-id="${escapeAttr(template.id)}" style="--template-ink:${swatches[0]};--template-accent:${swatches[1]};--template-soft:${swatches[2]}">
      <button class="template-card-main" data-template-use="${escapeAttr(template.id)}" title="使用“${escapeAttr(template.name)}”创建文档">
        <span class="template-sheet" aria-hidden="true">
          <i class="sheet-kicker"></i><i class="sheet-title"></i><i class="sheet-line"></i><i class="sheet-line short"></i><i class="sheet-section"></i><i class="sheet-line"></i><i class="sheet-line short"></i><i class="sheet-box"></i>
        </span>
        <span class="template-meta">
          <span class="template-top"><span class="template-name">${escapeHtml(template.name)}</span><span class="template-cat">${template.custom ? "个人 · " : ""}${escapeHtml(template.cat)}</span></span>
          <span class="template-desc">${escapeHtml(template.description)}</span>
          <span class="template-outline">${template.outline.slice(0, 4).map(item => `<span>${escapeHtml(item)}</span>`).join("")}</span>
          <span class="template-foot"><span class="template-theme">${escapeHtml(profile.shortName)} · ${escapeHtml(style?.name || "默认简洁")}</span><span class="template-use">创建 →</span></span>
        </span>
      </button>
      ${template.custom ? `<button class="template-edit" data-template-edit="${escapeAttr(template.id)}" title="编辑个人模板" aria-label="编辑个人模板"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 11.5V13h1.5L12 5.5 10.5 4z"/><path d="M9.5 5l1.5 1.5"/></svg></button><button class="template-delete" data-template-delete="${escapeAttr(template.id)}" title="删除个人模板" aria-label="删除个人模板"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4h10M6 4V2.5h4V4M5 6v6M8 6v6M11 6v6M4 4l.7 10h6.6L12 4"/></svg></button>` : ""}
    </div>`;
  }).join("") || `<div class="empty-state">没有匹配的模板，请调整关键词或场景。</div>`;
  $$("[data-template-use]", grid).forEach(button => button.addEventListener("click", () => createDocumentFromTemplate(button.dataset.templateUse)));
  $$("[data-template-edit]", grid).forEach(button => button.addEventListener("click", () => openTemplateBuilder(button.dataset.templateEdit)));
  $$("[data-template-delete]", grid).forEach(button => button.addEventListener("click", () => deleteCustomTemplate(button.dataset.templateDelete)));
}

function customThumb(s){
  return `<div class="thumb t-tech" style="background:${s.swatches[2] || "#fff"};color:${s.swatches[0] || "#111"}">
    <div class="tt">${escapeHtml(s.name)}</div>
    <div class="pp">自定义富文本排版样式。</div>
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

function openStyleBuilder(){
  const base = styleById(activeDoc()?.styleId || "default");
  const vars = base.customVars || {};
  const fontId = Object.entries(fontPresets).find(([, value]) => value === vars["--custom-font"])?.[0] || "ui";
  $("#custom-style-name").value = `我的${base.name}`.slice(0, 40);
  $("#custom-style-use").value = base.uc || "个人文档与富文本发布";
  $("#custom-style-intensity").value = base.intensity === "先锋" ? "先锋" : "鲜明";
  $("#custom-style-heading").value = base.headingPreset || "left";
  $("#custom-style-font").value = fontId;
  $("#custom-style-size").value = parseFloat(vars["--custom-body"]) || 15.5;
  $("#custom-style-line").value = parseFloat(vars["--custom-line"]) || 1.85;
  $("#custom-style-text").value = colorInputValue(vars["--custom-text"] || base.swatches[0], "#1A1A18");
  $("#custom-style-primary").value = colorInputValue(vars["--custom-primary"] || base.swatches[0], "#2F5D4F");
  $("#custom-style-accent").value = colorInputValue(vars["--custom-accent"] || base.swatches[1], "#5C8A7D");
  $("#custom-style-soft").value = colorInputValue(vars["--custom-soft"] || base.swatches[2], "#E7EEEA");
  $("#custom-style-page").value = colorInputValue(vars["--custom-bg"], "#FFFFFF");
  $("#custom-style-code").value = colorInputValue(vars["--custom-code-bg"] || base.swatches[3], "#1A1A18");
  $("#style-builder").hidden = false;
  requestAnimationFrame(() => $("#custom-style-name").focus());
}

function closeStyleBuilder(){ $("#style-builder").hidden = true; }

function generateCustomStyle(event){
  event.preventDefault();
  const cleanName = $("#custom-style-name").value.trim().slice(0, 40);
  const useCase = $("#custom-style-use").value.trim().slice(0, 80);
  if (!cleanName || !useCase) return showToast("请填写样式名称和适用场景", true);
  if (state.styles.some(style => !style.builtin && style.name === cleanName)) return showToast("个人样式名称已存在", true);
  const bodySize = Math.min(18, Math.max(14, Number($("#custom-style-size").value) || 15.5));
  const lineHeight = Math.min(2.1, Math.max(1.5, Number($("#custom-style-line").value) || 1.85));
  const primary = normalizeCssColor($("#custom-style-primary").value, "#2F5D4F");
  const accent = normalizeCssColor($("#custom-style-accent").value, "#5C8A7D");
  const soft = normalizeCssColor($("#custom-style-soft").value, "#E7EEEA");
  const page = normalizeCssColor($("#custom-style-page").value, "#FFFFFF");
  const text = normalizeCssColor($("#custom-style-text").value, "#1A1A18");
  const codeBg = normalizeCssColor($("#custom-style-code").value, "#1A1A18");
  const fontId = fontPresets[$("#custom-style-font").value] ? $("#custom-style-font").value : "ui";
  const style = {
    id:uid(), cls:"theme-custom", name:cleanName, cat:"我的", family:"自定义", uc:useCase, swatches:[primary, accent, soft, codeBg],
    builtin:false, favorite:false, intensity:$("#custom-style-intensity").value, headingPreset:$("#custom-style-heading").value, thumb:"custom",
    customVars:{
      "--custom-primary": primary, "--custom-accent": accent, "--custom-soft": soft,
      "--custom-bg": page, "--custom-text": text, "--custom-code-bg": codeBg,
      "--custom-code": soft, "--custom-font":fontPresets[fontId], "--custom-body":`${bodySize}px`,
      "--custom-line":String(lineHeight), "--custom-h1":`${bodySize + 8}px`,
      "--custom-h2":`${bodySize + 3}px`, "--custom-h3":`${bodySize + 1}px`,
    }
  };
  state.styles.push(style);
  styleTab = "custom";
  styleCategory = "all";
  styleIntensity = "all";
  styleSearch = "";
  closeStyleBuilder();
  activeDoc().styleOverrides = {};
  applyStyle(style.id);
  showToast("已创建并应用个人样式");
}

async function deleteCustomStyle(styleId){
  const style = state.styles.find(item => item.id === styleId && !item.builtin);
  if (!style) return;
  const affected = state.docs.filter(doc => doc.styleId === style.id).length;
  if (!await confirmAction({
    title:"删除个人样式",
    message:`确定删除“${style.name}”吗？${affected ? `使用它的 ${affected} 篇文档会改用默认简洁。` : ""}`,
    confirmLabel:"删除样式",
    danger:true,
  })) return;
  state.styles = state.styles.filter(item => item.id !== style.id);
  state.docs.forEach(doc => { if (doc.styleId === style.id) doc.styleId = "default"; });
  (state.customTemplates || []).forEach(template => { if (template.styleId === style.id) template.styleId = "default"; });
  renderAll();
  persist();
  showToast("已删除个人样式");
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

function stripInlineCode(line){
  let out = "";
  let cursor = 0;
  while (cursor < line.length) {
    const start = line.indexOf("`", cursor);
    if (start < 0) return out + line.slice(cursor);
    out += line.slice(cursor, start);
    let runLength = 1;
    while (line[start + runLength] === "`") runLength++;
    const marker = "`".repeat(runLength);
    let end = line.indexOf(marker, start + runLength);
    while (end >= 0 && (line[end - 1] === "`" || line[end + runLength] === "`")) end = line.indexOf(marker, end + 1);
    if (end < 0) return out + line.slice(start);
    out += " ";
    cursor = end + runLength;
  }
  return out;
}
function scanMarkdownCode(md=""){
  const lines = String(md).replace(/\r\n/g, "\n").split("\n");
  const visible = [];
  const blocks = [];
  let fence = null;
  lines.forEach(line => {
    if (fence) {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length) {
        blocks.push({ lines:fence.lines, marker:fence.char });
        fence = null;
      } else {
        fence.lines++;
      }
      visible.push("");
      return;
    }
    const open = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (open) {
      fence = { char:open[1][0], length:open[1].length, lines:0 };
      visible.push("");
      return;
    }
    visible.push(stripInlineCode(line));
  });
  if (fence) blocks.push({ lines:fence.lines, marker:fence.char });
  return { text:visible.join("\n"), blocks };
}
function markdownWithoutCode(md=""){
  return scanMarkdownCode(md).text;
}

function renderCompatibility(){
  const doc = activeDoc();
  const profile = publishingProfile(doc);
  const exportHtml = refreshExportResult();
  lastRenderResult.stats = collectStats(doc.markdown, lastRenderResult.html, exportHtml);
  const stats = lastRenderResult.stats;
  const issues = [];
  const title = doc?.title || firstHeading(doc?.markdown || "");
  if (profile.titleMax && title.length > profile.titleMax) issues.push({ sev:"danger", code:"META-001", title:`标题超过${profile.name}建议上限`, msg:`当前标题 ${title.length} 字，建议不超过 ${profile.titleMax} 字。`, sugg:"缩短标题，保留主要信息。" });
  const markdownToInspect = markdownWithoutCode(doc.markdown);
  if (/<script|on\w+=|<iframe|<video|<audio|<form/i.test(markdownToInspect)) issues.push({ sev:"danger", code:"HTML-001", title:"检测到危险 HTML", msg:"原文包含脚本、事件属性或不稳定标签，渲染时会被转义或移除。", sugg:"删除相关 HTML，改用 Markdown 结构。" });
  const tmp = document.createElement("div");
  tmp.innerHTML = lastRenderResult.html;
  const imgs = $$("img", tmp).map(img => img.getAttribute("src") || "");
  const localImgs = imgs.filter(src => src && !/^https?:\/\//i.test(src) && !/^data:image\//i.test(src));
  const remoteImgs = imgs.filter(src => /^https?:\/\//i.test(src));
  const dataImgs = imgs.filter(src => /^data:image\//i.test(src));
  const nonWechatRemoteImgs = remoteImgs.filter(src => !/^https?:\/\/mmbiz\.qpic\.cn/i.test(src));
  if (profile.remoteImagePolicy === "wechat" && nonWechatRemoteImgs.length) issues.push({ sev:"warn", code:"IMG-001", title:"外部图片可能被过滤", msg:`检测到 ${nonWechatRemoteImgs.length} 张非微信图床图片，公众号发布时可能失效。`, sugg:"发布前上传到公众号素材库并替换图片。" });
  if (profile.remoteImagePolicy === "email" && remoteImgs.length) issues.push({ sev:"warn", code:"IMG-001", title:"邮件客户端可能拦截远程图片", msg:`检测到 ${remoteImgs.length} 张远程图片，部分收件人需要手动允许后才会显示。`, sugg:"使用稳定的 HTTPS 图床，并为图片提供有意义的替代文字。" });
  if (dataImgs.length) issues.push({ sev:"warn", code:"IMG-002", title:"内嵌图片兼容性有限", msg:`检测到 ${dataImgs.length} 张 Base64 图片，部分目标编辑器不会保存。`, sugg:"改为 jpg/png 文件并上传到目标平台或稳定图床。" });
  if (localImgs.length) issues.push({ sev:"warn", code:"IMG-003", title:"本地图片路径无法发布", msg:`检测到 ${localImgs.length} 张本地或相对路径图片。`, sugg:"先上传图片并替换为 HTTPS 图片 URL。" });
  $$("table", tmp).forEach((table, idx) => {
    const cols = table.rows[0]?.cells.length || 0;
    if (cols > profile.tableMaxColumns) issues.push({ sev:"warn", code:"TBL-002", title:`第 ${idx + 1} 个表格列数较多`, msg:`该表格有 ${cols} 列，${profile.name}的窄屏预览可能横向溢出。`, sugg:"合并相近列，或改写为列表。" });
  });
  const longCode = scanMarkdownCode(doc.markdown).blocks.filter(block => block.lines > profile.longCodeLines).length;
  if (longCode) issues.push({ sev:"info", code:"CODE-001", title:"代码块较长", msg:`检测到 ${longCode} 个超过 ${profile.longCodeLines} 行的代码块。`, sugg:"拆分代码块或只保留关键片段。" });
  if (stats.htmlBytes > profile.maxHtmlBytes) issues.push({ sev:"danger", code:"SIZE-001", title:"HTML 体积较大", msg:`当前 HTML 约 ${formatBytes(stats.htmlBytes)}，超过${profile.name}的保守阈值。`, sugg:"减少长表格、代码块和内联图片。" });
  if (!issues.length) issues.push({ sev:"info", code:"OK-000", title:"未发现阻断问题", msg:profile.readyMessage, sugg:profile.readySuggestion });
  lastRenderResult.issues = issues;

  const imageNeedsAttention = dataImgs.length || localImgs.length || (profile.remoteImagePolicy === "wechat" && nonWechatRemoteImgs.length) || (profile.remoteImagePolicy === "email" && remoteImgs.length);
  const htmlProgress = Math.min(100, (stats.htmlBytes / profile.maxHtmlBytes) * 100);
  const charProgress = Math.min(100, (stats.chars / 20000) * 100);
  $(".compat-summary").innerHTML = `
    <div class="compat-card"><div class="lbl">HTML 体积</div><div class="val">${(stats.htmlBytes/1024).toFixed(1)}<small>KB</small></div><div class="bar"><span style="width:${htmlProgress}%"></span></div></div>
    <div class="compat-card"><div class="lbl">字符</div><div class="val">${stats.chars.toLocaleString()}</div><div class="bar"><span style="width:${charProgress}%"></span></div></div>
    <div class="compat-card"><div class="lbl">图片</div><div class="val">${stats.imageCount}<small>/ ${imageNeedsAttention ? "检查" : "正常"}</small></div><div class="bar"><span class="${imageNeedsAttention ? "warn" : ""}" style="width:${Math.min(100, stats.imageCount*20)}%"></span></div></div>`;
  const warnCount = issues.filter(i => i.sev === "warn").length;
  const dangerCount = issues.filter(i => i.sev === "danger").length;
  const status = $(".compat-status");
  status.className = `compat-status ${dangerCount ? "danger" : warnCount ? "warn" : "ok"}`;
  status.textContent = dangerCount ? "存在阻断项，请处理后再复制。" : warnCount ? `可复制，存在 ${warnCount} 项警告。` : `${profile.name}兼容性良好，可复制。`;
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
  renderSaveState();
  if ($("#status-chars")) $("#status-chars").textContent = stats.chars.toLocaleString();
  if (groups[2]) groups[2].innerHTML = `HTML <b>${formatBytes(stats.htmlBytes)}</b>`;
  if (groups[3]) groups[3].innerHTML = `图片 <b>${stats.imageCount}</b>`;
  if (groups[4]) groups[4].innerHTML = `链接 <b>${stats.linkCount}</b>`;
  const issueCount = lastRenderResult.issues.filter(i => i.sev !== "info").length;
  $(".stat-pill.warn").textContent = issueCount ? `兼容性 · ${issueCount} 警告` : "兼容性 · 通过";
  doc.updatedAt = doc.updatedAt || nowIso();
}

const richTextExporterFactory = globalThis.MDStyleRichTextExporter;
if (!richTextExporterFactory) throw new Error("Rich text exporter failed to load");
const richTextExporter = richTextExporterFactory.create({ article:preview, page:$(".preview-doc") });
function inlineArticleHtml(){ return richTextExporter.toHtml(); }
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
  showToast(`已复制富文本，可粘贴到${publishingProfile().name}编辑器`);
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
function exportedDocumentHtml(){
  const title = escapeHtml(activeDoc()?.title || "MD Style 文档");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0">${inlineArticleHtml()}</body></html>`;
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
async function importMarkdownFile(file){
  if (file.size > MAX_MARKDOWN_IMPORT_BYTES) throw new Error("Markdown 文件超过 5 MB，已拒绝导入");
  const markdown = await file.text();
  createDocument(markdown || "# 未命名文档\n\n");
  return true;
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
  const accepted = await confirmAction({
    title:"替换当前文档库",
    message:`导入将替换当前文档库中的 ${state.docs.length} 篇文档，并载入备份中的 ${nextState.docs.length} 篇文档。继续前会自动创建安全快照。`,
    confirmLabel:"创建快照并导入",
    danger:true,
  });
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
  if (!await confirmAction({
    title:"恢复导入前文档库",
    message:`将当前 ${state.docs.length} 篇文档替换为导入前的 ${nextState.docs.length} 篇文档。恢复前也会先创建当前状态的安全快照。`,
    confirmLabel:"创建快照并恢复",
    danger:true,
  })) return;
  if (!await createSafetySnapshot("before-snapshot-restore")) return showToast("无法备份当前文档库，已取消恢复", true);
  state = nextState;
  editor.value = activeDoc().markdown;
  renderAll();
  await persist(true);
  showToast("已恢复导入前文档库");
}
function closeRecoveryBrowser(){
  $("#recovery-browser").hidden = true;
}
function recoveryReasonLabel(reason){
  const labels = {
    "before-import":"导入前快照",
    "before-snapshot-restore":"恢复导入快照前",
    "before-recovery":"历史恢复前",
    "manual":"手动快照",
  };
  return labels[reason] || String(reason || "安全快照").replace(/-/g, " ");
}
async function openRecoveryBrowser(){
  if (!window.mdStyleStorage?.listRecoveryPoints) return showToast("历史备份仅在桌面 App 中可用", true);
  const points = await window.mdStyleStorage.listRecoveryPoints();
  if (!Array.isArray(points) || !points.length) return showToast("尚未生成可恢复的本地历史备份", true);
  $("#recovery-point-select").innerHTML = points.map(point => {
    const time = new Date(point.savedAt).toLocaleString("zh-CN", { dateStyle:"short", timeStyle:"short" });
    return `<option value="${escapeAttr(point.id)}">${escapeHtml(time)} · ${escapeHtml(recoveryReasonLabel(point.reason))} · ${Number(point.documentCount || 0)} 篇</option>`;
  }).join("");
  $("#recovery-browser").hidden = false;
  requestAnimationFrame(() => $("#recovery-point-select").focus());
}
async function restoreSelectedRecoveryPoint(){
  const id = $("#recovery-point-select").value;
  if (!id || !window.mdStyleStorage?.loadRecoveryPoint) return;
  const payload = await window.mdStyleStorage.loadRecoveryPoint(id);
  const sourceState = payload?.state || payload;
  if (!sourceState || !Array.isArray(sourceState.docs)) throw new Error("恢复点内容无效");
  const nextState = normalizeState(sourceState);
  if (!nextState.docs.length) throw new Error("恢复点中没有文档");
  if (!await confirmAction({
    title:"恢复本地历史备份",
    message:`将当前 ${state.docs.length} 篇文档替换为所选版本中的 ${nextState.docs.length} 篇文档。`,
    confirmLabel:"创建快照并恢复",
    danger:true,
  })) return;
  if (!await createSafetySnapshot("before-recovery")) throw new Error("无法备份当前文档库，已取消恢复");
  state = nextState;
  editor.value = activeDoc().markdown;
  closeRecoveryBrowser();
  renderAll();
  await persist(true);
  showToast("已恢复所选本地历史版本");
}
let toastTimer = null;
function showToast(message, error=false){
  clearTimeout(toastTimer);
  $("span", toast).textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.add("show");
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    toastTimer = null;
  }, 2200);
}

function setTab(which){
  const tabs = ["styles", "templates", "compat", "export"];
  if (!tabs.includes(which)) which = "styles";
  $$(".right-tab").forEach(x => {
    const active = x.dataset.tab === which;
    x.classList.toggle("on", active);
    x.setAttribute("aria-selected", String(active));
    x.tabIndex = active ? 0 : -1;
  });
  $$("[data-rail-tab]").forEach(x => x.classList.toggle("on", x.dataset.railTab === which));
  tabs.forEach(tab => { $(`#tab-${tab}`).style.display = which === tab ? "" : "none"; });
  $("#btn-styles").classList.toggle("active", which === "styles");
  $("#btn-check").classList.toggle("active", which === "compat");
}
function narrowDrawerPanel(){
  if (!window.matchMedia(NARROW_LAYOUT_QUERY).matches) return null;
  if (!lib.classList.contains("collapsed")) return lib;
  if (!rightPanel.classList.contains("collapsed")) return rightPanel;
  return null;
}
function drawerFocusable(panel){
  return $$("button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]", panel)
    .filter(element => element.tabIndex >= 0 && !element.hidden && element.getClientRects().length);
}
function syncDrawerAccessibility(){
  const narrow = window.matchMedia(NARROW_LAYOUT_QUERY).matches;
  const openPanel = narrowDrawerPanel();
  drawerBackdrop.hidden = !openPanel;
  mainPanel.inert = !!openPanel;
  $("#toggle-lib").setAttribute("aria-expanded", String(!lib.classList.contains("collapsed")));
  $("#toggle-right").setAttribute("aria-expanded", String(!rightPanel.classList.contains("collapsed")));
  [lib, rightPanel].forEach(panel => {
    const open = narrow && panel === openPanel;
    panel.setAttribute("aria-hidden", String(narrow && !open));
    if (open) {
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
    } else {
      panel.removeAttribute("role");
      panel.removeAttribute("aria-modal");
    }
  });
}
function focusNarrowDrawer(panel){
  if (!window.matchMedia(NARROW_LAYOUT_QUERY).matches) return;
  requestAnimationFrame(() => {
    const target = panel === lib ? searchInput : $(".right-tab.on", rightPanel);
    target?.focus();
  });
}
function setLibCollapsed(v){
  if (!v && window.matchMedia(NARROW_LAYOUT_QUERY).matches) setRightCollapsed(true);
  app.classList.toggle("lib-collapsed", v);
  lib.classList.toggle("collapsed", v);
  if (!v) lib.scrollTop = 0;
  syncDrawerAccessibility();
  if (!v) focusNarrowDrawer(lib);
}
function setRightCollapsed(v){
  if (!v && window.matchMedia(NARROW_LAYOUT_QUERY).matches) setLibCollapsed(true);
  app.classList.toggle("right-collapsed", v);
  rightPanel.classList.toggle("collapsed", v);
  if (!v) rightPanel.scrollTop = 0;
  syncDrawerAccessibility();
  if (!v) focusNarrowDrawer(rightPanel);
}
function openRightTab(which){
  setRightCollapsed(false);
  setTab(which);
}
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
$("#library-editor").addEventListener("submit", submitLibraryEditor);
$("#close-library-editor").addEventListener("click", closeLibraryEditor);
$("#cancel-library-editor").addEventListener("click", closeLibraryEditor);
$$("[data-toolbar-action='new-doc']").forEach(btn => btn.addEventListener("click", openTemplateLibrary));
$("[data-toolbar-action='import-md']").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  try {
    await importMarkdownFile(file);
    showToast("已导入 Markdown 文件");
  } catch (error) {
    showToast(`导入失败：${error.message}`, true);
  } finally {
    fileInput.value = "";
  }
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
$("#style-chip").addEventListener("click", () => openRightTab("styles"));
$("#generate-style").addEventListener("click", openStyleBuilder);
$("#style-builder").addEventListener("submit", generateCustomStyle);
$("#cancel-style").addEventListener("click", closeStyleBuilder);
$("#cancel-style-secondary").addEventListener("click", closeStyleBuilder);
$("#save-template").addEventListener("click", () => openTemplateBuilder());
$("#template-builder").addEventListener("submit", saveCurrentAsTemplate);
$("#cancel-template").addEventListener("click", closeTemplateBuilder);
$("#cancel-template-secondary").addEventListener("click", closeTemplateBuilder);
$("#confirm-cancel").addEventListener("click", () => settleConfirm(false));
$("#confirm-accept").addEventListener("click", () => settleConfirm(true));
confirmDialog.addEventListener("cancel", event => { event.preventDefault(); settleConfirm(false); });
$("#create-blank-doc").addEventListener("click", () => { createDocument(); closeRightOnNarrow(); showToast("已创建空白文档"); });
$$(".style-tabs button").forEach((btn, idx) => btn.addEventListener("click", () => {
  styleTab = idx === 0 ? "built-in" : idx === 1 ? "custom" : "favorite";
  styleCategory = "all";
  styleIntensity = "all";
  renderStyleCards();
}));
$("#style-search").addEventListener("input", () => { styleSearch = $("#style-search").value; renderStyleCards(); });
$("#style-category").addEventListener("change", () => { styleCategory = $("#style-category").value; renderStyleCards(); });
$("#style-intensity").addEventListener("change", () => { styleIntensity = $("#style-intensity").value; renderStyleCards(); });
$("#template-search").addEventListener("input", () => { templateSearch = $("#template-search").value; renderTemplateLibrary(); });
$("#template-category").addEventListener("change", () => { templateCategory = $("#template-category").value; renderTemplateLibrary(); });
$("#target-profile").addEventListener("change", (event) => {
  const doc = activeDoc();
  if (!doc) return;
  doc.targetId = normalizeTargetId(event.target.value, "general");
  doc.updatedAt = nowIso();
  renderPublishingTarget();
  renderCompatibility();
  renderStatus();
  persist();
});
$("#override-heading").addEventListener("change", (e) => updateStyleOverride("heading", e.target.value));
$("#override-font").addEventListener("change", (e) => updateStyleOverride("font", e.target.value));
$("#override-text").addEventListener("input", (e) => updateStyleOverride("textColor", e.target.value));
$("#override-page").addEventListener("input", (e) => updateStyleOverride("pageBg", e.target.value));
$("#override-strong").addEventListener("input", (e) => updateStyleOverride("strongBg", e.target.value));
$("#override-accent").addEventListener("input", (e) => updateStyleOverride("accent", e.target.value));
$("#override-paragraph").addEventListener("input", (e) => updateStyleOverride("paragraphBg", e.target.value));
$("#override-paragraph-spacing").addEventListener("input", (e) => updateStyleOverride("paragraphSpacing", Number(e.target.value)));
$("#override-quote").addEventListener("input", (e) => updateStyleOverride("quoteBg", e.target.value));
$("#override-code-bg").addEventListener("input", (e) => updateStyleOverride("codeBg", e.target.value));
$("#override-table-header").addEventListener("input", (e) => updateStyleOverride("tableHeaderBg", e.target.value));
$("#override-link").addEventListener("input", (e) => updateStyleOverride("linkColor", e.target.value));
$("#reset-overrides").addEventListener("click", resetStyleOverrides);
$$(".right-tab").forEach(t => t.addEventListener("click", () => setTab(t.dataset.tab)));
$("#btn-styles").addEventListener("click", () => openRightTab("styles"));
$("#btn-check").addEventListener("click", () => openRightTab("compat"));
$$(".mode-toggle button").forEach(b => b.addEventListener("click", () => {
  $$(".mode-toggle button").forEach(x => { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); });
  b.classList.add("on");
  b.setAttribute("aria-pressed", "true");
  const wide = b.dataset.previewWidth === "desktop";
  previewWidth = wide ? "desktop" : "mobile";
  $(".phone-frame").style.maxWidth = wide ? "640px" : "420px";
  renderPublishingTarget();
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
drawerBackdrop.addEventListener("click", () => {
  setLibCollapsed(true);
  setRightCollapsed(true);
});

$("[data-export-action='copy-rich']").addEventListener("click", () => copyRichText().catch(e => showToast(`复制失败：${e.message}`, true)));
$("[data-export-action='import-md']").addEventListener("click", () => fileInput.click());
$("[data-export-action='copy-html']").addEventListener("click", () => copyHtml().catch(e => showToast(`复制失败：${e.message}`, true)));
$("[data-export-action='download-html']").addEventListener("click", () => downloadFile(`${activeDoc().title || "article"}.html`, exportedDocumentHtml(), "text/html;charset=utf-8"));
$("[data-export-action='download-md']").addEventListener("click", () => downloadFile(`${activeDoc().title || "article"}.md`, activeDoc().markdown, "text/markdown;charset=utf-8"));
$("[data-export-action='export-library']").addEventListener("click", exportLibrary);
$("[data-export-action='import-library']").addEventListener("click", () => libraryInput.click());
$("[data-export-action='restore-import-backup']").addEventListener("click", () => restoreImportSafetySnapshot().catch(error => showToast(`恢复失败：${error.message}`, true)));
const browseRecoveryButton = $("[data-export-action='browse-recovery']");
browseRecoveryButton.hidden = !window.mdStyleStorage?.listRecoveryPoints;
browseRecoveryButton.addEventListener("click", () => openRecoveryBrowser().catch(error => showToast(`读取备份失败：${error.message}`, true)));
$("#close-recovery").addEventListener("click", closeRecoveryBrowser);
$("#cancel-recovery").addEventListener("click", closeRecoveryBrowser);
$("#restore-recovery").addEventListener("click", () => restoreSelectedRecoveryPoint().catch(error => showToast(`恢复失败：${error.message}`, true)));

window.addEventListener("keydown", async (e) => {
  const openDrawer = narrowDrawerPanel();
  if (e.key === "Escape" && openDrawer && !confirmDialog.open) {
    e.preventDefault();
    setLibCollapsed(true);
    setRightCollapsed(true);
    (openDrawer === lib ? $("#toggle-lib") : $("#toggle-right")).focus();
    return;
  }
  if (e.key === "Tab" && openDrawer && !confirmDialog.open) {
    const focusable = drawerFocusable(openDrawer);
    if (focusable.length) {
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!openDrawer.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    const ok = await persist(true);
    showToast(ok ? "已保存到本地文档库" : "保存失败", !ok);
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchInput.focus(); }
});

window.addEventListener("beforeunload", flushBrowserState);
window.addEventListener("pagehide", flushBrowserState);

const narrowLayout = window.matchMedia(NARROW_LAYOUT_QUERY);
let narrowLayoutActive = null;
function syncNarrowLayout(matches){
  if (matches === narrowLayoutActive) return;
  narrowLayoutActive = matches;
  setLibCollapsed(matches);
  setRightCollapsed(matches);
}
syncNarrowLayout(narrowLayout.matches);
narrowLayout.addEventListener?.("change", event => syncNarrowLayout(event.matches));
window.addEventListener("resize", () => syncNarrowLayout(narrowLayout.matches));
setActiveDoc(state.activeDocId, false);
restoreElectronLibraryBackup();
