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
const SAMPLE_MD = editor.value;

const BUILTIN_STYLES = [
  { id:"default", cls:"theme-default", name:"默认简洁", cat:"通用", uc:"克制耐读，适合大多数文章", swatches:["#2D2D2A","#5C8A7D","#F7F6F1","#26262B"], fav:true },
  { id:"product", cls:"theme-product", name:"产品更新", cat:"产品", uc:"版本日志、功能发布、路线图", swatches:["#123D5A","#2F8F9D","#E7F4F5","#0E2433"] },
  { id:"brief", cls:"theme-brief", name:"商业简报", cat:"商业", uc:"结论先行，数据和表格更清晰", swatches:["#202124","#B88A2A","#F4EFE2","#0F1115"], fav:true },
  { id:"course", cls:"theme-course", name:"课程讲义", cat:"课程", uc:"知识点、步骤和练习题分层", swatches:["#274C3A","#E0A92F","#F4F1E6","#1E3329"], fav:true },
  { id:"checklist", cls:"theme-checklist", name:"清单卡片", cat:"清单", uc:"SOP、方法论、工具清单", swatches:["#18233A","#FFB84D","#EFF3F8","#283B5B"] },
  { id:"campaign", cls:"theme-campaign", name:"品牌营销", cat:"营销", uc:"活动发布、转化文案、品牌稿", swatches:["#8F2737","#F05A48","#FFF0E8","#32161B"] },
  { id:"column", cls:"theme-column", name:"个人专栏", cat:"专栏", uc:"个人 IP、观点输出、随笔", swatches:["#2B3A31","#9C6F43","#F5F0E7","#DFCDB8"] },
  { id:"essay", cls:"theme-essay", name:"深度长文", cat:"长文", uc:"严肃阅读，引用和章节稳定", swatches:["#2A2926","#8B6A3A","#C9A57A","#FBF8F1"] },
  { id:"academic", cls:"theme-academic", name:"学术笔记", cat:"笔记", uc:"读书、论文、引用和编号", swatches:["#1A1A18","#5C4A2B","#F5F2EA","#C9A57A"] },
  { id:"tech", cls:"theme-tech", name:"科技教程", cat:"技术", uc:"代码块、步骤、表格更突出", swatches:["#0B3D2E","#5C8A7D","#F0F5F2","#0E1A17"] },
  { id:"mag", cls:"theme-mag", name:"视觉杂志", cat:"图文", uc:"图片、引用、标题更有视觉层次", swatches:["#3B2E18","#7A4A18","#D9C9A0","#FBF6EB"] },
  { id:"notice", cls:"theme-notice", name:"正式通知", cat:"通知", uc:"公告、声明、正式说明", swatches:["#A23E2E","#1A1A18","#F4E3DE","#F5F0E6"] },
  { id:"report", cls:"theme-report", name:"数据研报", cat:"商业", uc:"指标、结论、表格和分析报告", swatches:["#1B2A41","#3E6E8E","#EAF1F6","#101820"] },
  { id:"interview", cls:"theme-interview", name:"访谈问答", cat:"访谈", uc:"人物访谈、圆桌纪要、问答稿", swatches:["#243B33","#D17845","#F7ECE3","#13231E"] },
  { id:"newsletter", cls:"theme-newsletter", name:"邮件通讯", cat:"媒体", uc:"Newsletter、周报、信息简报", swatches:["#23324A","#5B78A7","#EEF3FA","#1D2638"] },
  { id:"mono", cls:"theme-mono", name:"黑白锋利", cat:"观点", uc:"短评、态度稿、犀利观点", swatches:["#111111","#6F6F6F","#F3F3F0","#222222"] },
  { id:"soft", cls:"theme-soft", name:"温柔手账", cat:"生活", uc:"生活方式、复盘、轻阅读", swatches:["#5B4A44","#D49A8A","#FFF3EE","#7C5B52"] },
  { id:"nature", cls:"theme-nature", name:"自然笔记", cat:"科普", uc:"科普、观察、自然与健康主题", swatches:["#244837","#7E9B5F","#F1F5E8","#183126"] },
  { id:"classic", cls:"theme-classic", name:"古典书信", cat:"文化", uc:"书评、散文、传统文化内容", swatches:["#4A2F22","#B56A35","#F8EFE2","#2C1D16"] },
  { id:"deck", cls:"theme-deck", name:"路演提案", cat:"商业", uc:"创业计划、方案陈述、项目提案", swatches:["#14213D","#FCA311","#EEF2F7","#0B1324"] },
];

const LEGACY_STYLE_REPLACEMENTS = {
  plain: "default",
  blue: "tech",
  terminal: "tech",
  violet: "column",
  night: "essay",
  news: "mag",
  biz: "brief",
  gov: "notice",
  handbook: "checklist",
};

const thumbHTML = {
  default: `<div class="thumb t-default">
    <div class="tt">从 Markdown 到公众号</div>
    <div class="pp">创作者经常用 Markdown 写文章，但公众号后台是富文本编辑器。</div>
    <div class="qb">一句话：能进公众号的 HTML，是一个相当受限的子集。</div>
    <div class="pp">• 移除 script 标签</div>
    <div class="pp">• 内联 CSS</div>
    <div class="cd">renderWeChatHtml(ast)</div>
  </div>`,
  product: `<div class="thumb t-product">
    <div class="tt">产品更新</div>
    <div class="pp">v2.4 发布：编辑器、样式库、复制链路。</div>
    <div class="qb">新增：文档标签 / 目录 / 样式预览</div>
    <div class="cd">CHANGELOG</div>
  </div>`,
  brief: `<div class="thumb t-brief">
    <div class="tt">商业简报</div>
    <div class="pp">本周核心结论：转化率提升，留存稳定。</div>
    <div class="tbl"><span>指标</span><span>变化</span><span>判断</span></div>
    <div class="tbl"><span>留存</span><span>+4%</span><span>健康</span></div>
  </div>`,
  course: `<div class="thumb t-course">
    <div class="tt">课程讲义</div>
    <div class="pp">01 概念：先建立心智模型。</div>
    <div class="qb">练习：用自己的话复述这个定义。</div>
    <div class="cd">step 1 / 3</div>
  </div>`,
  checklist: `<div class="thumb t-checklist">
    <div class="tt">清单卡片</div>
    <div class="pp">☐ 目标清楚</div>
    <div class="pp">☐ 输入完整</div>
    <div class="qb">适合 SOP、复盘、工具清单。</div>
  </div>`,
  campaign: `<div class="thumb t-campaign">
    <div class="tt">新品限时发布</div>
    <div class="pp">给高频写作者的一套排版工具。</div>
    <div class="qb">今日开放：样式库 + 一键复制</div>
    <div class="cd">CTA</div>
  </div>`,
  column: `<div class="thumb t-column">
    <div class="tt">个人专栏</div>
    <div class="pp">今天想谈一个经常被忽略的问题。</div>
    <div class="qb">观点不怕锋利，排版要稳。</div>
  </div>`,
  tech: `<div class="thumb t-tech">
    <div class="tt">从 Markdown 到公众号</div>
    <div class="pp">公众号编辑器对 HTML 兼容性有几个规则。</div>
    <div class="qb">能进公众号的 HTML，是一个相当受限的子集。</div>
    <div class="cd">function render(ast){...}</div>
  </div>`,
  essay: `<div class="thumb t-essay">
    <div class="tt">从 Markdown 到公众号</div>
    <div class="pp" style="text-align:left">创作者经常用 Markdown 写文章，但公众号后台是富文本编辑器。</div>
    <div class="qb">能进公众号的 HTML，是一个相当受限的子集。</div>
  </div>`,
  mag: `<div class="thumb t-mag">
    <div class="tt">从 Markdown<br/>到公众号</div>
    <div class="hh">— 排版方法论</div>
    <div class="qb">能进公众号的 HTML，是一个受限的子集。</div>
  </div>`,
  notice: `<div class="thumb t-notice">
    <div class="tt">关于排版规范的通知</div>
    <div class="pp">请各位作者统一使用稳定样式。</div>
    <div class="qb">重点事项：复制前完成兼容性检查。</div>
  </div>`,
  academic: `<div class="thumb t-academic">
    <div class="tt">从 Markdown 到公众号</div>
    <div class="pp">编辑器对 HTML 兼容性有限。</div>
    <div class="qb">能进公众号的 HTML 是子集。</div>
  </div>`,
  report: `<div class="thumb t-report">
    <div class="tt">数据研报</div>
    <div class="pp">核心指标：增长、留存、转化。</div>
    <div class="tbl"><span>指标</span><span>本周</span><span>判断</span></div>
    <div class="qb">结论：结构比装饰更重要。</div>
  </div>`,
  interview: `<div class="thumb t-interview">
    <div class="tt">访谈问答</div>
    <div class="pp"><b>Q</b> 为什么要做这件事？</div>
    <div class="qb"><b>A</b> 因为写作者需要更稳定的复制链路。</div>
  </div>`,
  newsletter: `<div class="thumb t-newsletter">
    <div class="tt">本周通讯</div>
    <div class="pp">三条新闻，一个判断。</div>
    <div class="qb">阅读时间：5 分钟</div>
    <div class="cd">Issue 018</div>
  </div>`,
  mono: `<div class="thumb t-mono">
    <div class="tt">黑白锋利</div>
    <div class="pp">观点要短，排版要硬。</div>
    <div class="qb">一句话放在这里，直接给判断。</div>
  </div>`,
  soft: `<div class="thumb t-soft">
    <div class="tt">温柔手账</div>
    <div class="pp">今天记录一个很小但重要的变化。</div>
    <div class="qb">适合复盘、生活方式和轻阅读。</div>
  </div>`,
  nature: `<div class="thumb t-nature">
    <div class="tt">自然笔记</div>
    <div class="pp">从一个观察开始，慢慢解释机制。</div>
    <div class="qb">知识需要一点呼吸感。</div>
  </div>`,
  classic: `<div class="thumb t-classic">
    <div class="tt">古典书信</div>
    <div class="pp">见字如面，先把气韵放稳。</div>
    <div class="qb">适合书评、散文、文化笔记。</div>
  </div>`,
  deck: `<div class="thumb t-deck">
    <div class="tt">路演提案</div>
    <div class="pp">问题 / 方案 / 进展 / 下一步。</div>
    <div class="qb">重点：一个段落只讲一个结论。</div>
    <div class="cd">Pitch Deck</div>
  </div>`,
};

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
const tagColors = ["#5C8A7D", "#C9A04A", "#8B6A3A", "#A23E2E", "#3D5E92", "#8B7AA8"];
const fontPresets = {
  ui: "var(--ui)",
  serif: "var(--serif)",
  fangsong: '"FangSong","STFangsong","SimSun","Source Han Serif SC",serif',
  kaiti: '"Kaiti SC","STKaiti","KaiTi","Source Han Serif SC",serif',
};
const headingPresets = new Set(["", "left", "underline", "block", "center"]);
const fontPresetIds = new Set(["", ...Object.keys(fontPresets)]);
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
function normalizeCssColor(value, fallback="#1A1A18"){
  const v = String(value || "").trim();
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return v;
  if (/^rgba?\(\s*(?:\d{1,3}\s*,\s*){2}\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(v)) return v;
  if (/^hsla?\(\s*\d{1,3}(?:deg)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(v)) return v;
  return fallback;
}
function nextTagColor(){ return tagColors[state.tags.length % tagColors.length]; }
function normalizeStyleRecord(style){
  const fallback = ["#2D2D2A", "#5C8A7D", "#F7F6F1", "#26262B"];
  const swatches = (style.swatches || fallback).map((color, idx) => normalizeCssColor(color, fallback[idx] || fallback[0]));
  const customVars = style.customVars ? Object.fromEntries(Object.entries(style.customVars).map(([k,v], idx) => [k, normalizeCssColor(v, swatches[idx % swatches.length] || fallback[0])])) : undefined;
  return { ...style, swatches, ...(customVars ? { customVars } : {}) };
}
function normalizeStyleOverrides(input={}){
  const heading = headingPresets.has(input.heading) ? input.heading : "";
  const font = fontPresetIds.has(input.font) ? input.font : "";
  const out = {};
  if (heading) out.heading = heading;
  if (font) out.font = font;
  if (input.textColor) out.textColor = normalizeCssColor(input.textColor, "#1A1A18");
  if (input.pageBg) out.pageBg = normalizeCssColor(input.pageBg, "#FFFFFF");
  if (input.strongBg) out.strongBg = normalizeCssColor(input.strongBg, "#E7EEEA");
  if (input.accent) out.accent = normalizeCssColor(input.accent, "#5C8A7D");
  return out;
}
function uniqueRecords(records, fallbackRecords=[], normalize=(x) => x){
  const seen = new Set();
  const out = [];
  [...(Array.isArray(records) ? records : []), ...fallbackRecords].forEach((record) => {
    if (!record?.id || seen.has(record.id)) return;
    seen.add(record.id);
    out.push(normalize(record, out.length));
  });
  return out;
}
function validIso(value, fallback=nowIso()){
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
}

function sanitizeLinkUrl(raw){
  const url = String(raw || "").trim().replace(/^["']|["']$/g, "");
  return /^https?:\/\//i.test(url) ? url : "#";
}
function sanitizeImageUrl(raw){
  const url = String(raw || "").trim().replace(/^["']|["']$/g, "");
  if (/^https?:\/\//i.test(url)) return url;
  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(url)) return url;
  if (/^(javascript|vbscript|file|data):/i.test(url)) return "#";
  return url || "#";
}

function formatInline(s){
  const code = [];
  s = String(s).replace(/`([^`]+)`/g, (_, c) => {
    code.push(`<code>${escapeHtml(c)}</code>`);
    return `\u0000CODE${code.length - 1}\u0000`;
  });
  s = escapeHtml(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const safe = sanitizeImageUrl(src);
    return `<img src="${escapeHtml(safe)}" alt="${escapeHtml(alt)}">`;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
    const safe = sanitizeLinkUrl(href);
    return `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return s.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => code[Number(i)] || "");
}

function legacyMdToHtml(src){
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  const isTableSep = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(l);
  let i = 0;

  while (i < lines.length) {
    const ln = lines[i];
    if (/^```/.test(ln)) {
      const lang = ln.replace(/^```/, "").trim();
      i++;
      const buf = [];
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      if (i < lines.length) i++;
      out.push(`<pre><code class="lang-${escapeHtml(lang)}">${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(ln)) { out.push("<hr>"); i++; continue; }
    const h = ln.match(/^(#{1,4})\s+(.*)$/);
    if (h) { const lvl = h[1].length; out.push(`<h${lvl}>${formatInline(h[2])}</h${lvl}>`); i++; continue; }
    if (/^>\s?/.test(ln)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote><p>${formatInline(buf.join(" "))}</p></blockquote>`);
      continue;
    }
    if (/^\s*\|.+\|\s*$/.test(ln) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = ln.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) rows.push(lines[i++].trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
      out.push(`<table><thead><tr>${head.map(c => `<th>${formatInline(c)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${formatInline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
      continue;
    }
    if (/^[-*+]\s+/.test(ln)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) items.push(lines[i++].replace(/^[-*+]\s+/, ""));
      out.push(`<ul>${items.map(x => `<li>${formatInline(x)}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(ln)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\d+\.\s+/, ""));
      out.push(`<ol>${items.map(x => `<li>${formatInline(x)}</li>`).join("")}</ol>`);
      continue;
    }
    if (/^\s*$/.test(ln)) { i++; continue; }

    const buf = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^[-*+]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*(---|\*\*\*|___)\s*$/.test(lines[i]) &&
      !(/^\s*\|.+\|\s*$/.test(lines[i]) && i + 1 < lines.length && isTableSep(lines[i + 1]))
    ) buf.push(lines[i++]);
    out.push(`<p>${formatInline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}

let markdownRenderer;
function getMarkdownRenderer(){
  if (markdownRenderer !== undefined) return markdownRenderer;
  const factory = (typeof globalThis !== "undefined" && globalThis.markdownit) || (typeof window !== "undefined" && window.markdownit);
  if (!factory) { markdownRenderer = null; return markdownRenderer; }
  const md = factory({
    html:false,
    linkify:false,
    typographer:false,
    breaks:false,
  });
  const defaultLinkOpen = md.renderer.rules.link_open || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const hrefIndex = tokens[idx].attrIndex("href");
    if (hrefIndex >= 0) tokens[idx].attrs[hrefIndex][1] = sanitizeLinkUrl(tokens[idx].attrs[hrefIndex][1]);
    tokens[idx].attrSet("target", "_blank");
    tokens[idx].attrSet("rel", "noopener noreferrer");
    return defaultLinkOpen(tokens, idx, options, env, self);
  };
  const defaultImage = md.renderer.rules.image || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const srcIndex = tokens[idx].attrIndex("src");
    if (srcIndex >= 0) tokens[idx].attrs[srcIndex][1] = sanitizeImageUrl(tokens[idx].attrs[srcIndex][1]);
    return defaultImage(tokens, idx, options, env, self);
  };
  markdownRenderer = md;
  return markdownRenderer;
}

function mdToHtml(src){
  const renderer = getMarkdownRenderer();
  return renderer ? renderer.render(String(src || "")) : legacyMdToHtml(String(src || ""));
}

function seedState(){
  const dirs = [
    { id:"all", name:"全部文档", system:true },
    { id:"products", name:"产品周记" },
    { id:"books", name:"读书笔记" },
    { id:"tech-dir", name:"技术教程" },
    { id:"uncategorized", name:"未分类", system:true },
  ];
  const tags = [
    { id:"product", name:"产品", color:"#5C8A7D" },
    { id:"interview", name:"访谈", color:"#C9A04A" },
    { id:"longform", name:"长文", color:"#8B6A3A" },
    { id:"tutorial", name:"教程", color:"#A23E2E" },
    { id:"reading", name:"读书", color:"#3D5E92" },
  ];
  const docs = [
    { id:uid(), title:firstHeading(SAMPLE_MD), manualTitle:false, markdown:SAMPLE_MD, directoryId:"products", tagIds:["product"], styleId:"default", createdAt:nowIso(), updatedAt:nowIso() },
    { id:uid(), title:"本周 3 个产品决策的复盘", manualTitle:false, markdown:"# 本周 3 个产品决策的复盘\n\n把上周遗留的几个待决问题分别拆成 What / Why / How 三段。\n\n## 结论\n\n- 先收缩功能面\n- 保留样式库作为差异化\n- 文档库进入 MVP\n", directoryId:"products", tagIds:["product"], styleId:"brief", createdAt:nowIso(), updatedAt:new Date(Date.now() - 86400000).toISOString() },
    { id:uid(), title:"读《卓有成效的管理者》笔记", manualTitle:false, markdown:"# 读《卓有成效的管理者》笔记\n\n德鲁克对**有效性**的定义非常工程化：记录时间、归集时间、整合时间。\n\n> 管理者的成果来自少数关键动作。\n", directoryId:"books", tagIds:["reading", "longform"], styleId:"academic", createdAt:nowIso(), updatedAt:new Date(Date.now() - 3 * 86400000).toISOString() },
    { id:uid(), title:"SvelteKit 实战：表单与 Action", manualTitle:false, markdown:"# SvelteKit 实战：表单与 Action\n\n表单是 Web 应用最古老的东西，也是 SvelteKit 处理得很优雅的部分。\n\n```ts\nexport const actions = {\n  default: async ({ request }) => {\n    return { ok: true };\n  }\n};\n```\n", directoryId:"tech-dir", tagIds:["tutorial"], styleId:"tech", createdAt:nowIso(), updatedAt:new Date(Date.now() - 7 * 86400000).toISOString() },
  ];
  return { dirs, tags, docs, activeDocId:docs[0].id, activeDirId:"all", activeTagIds:[], search:"", sort:"updated", styles:BUILTIN_STYLES.map(s => ({ ...s, builtin:true, favorite:!!s.fav })) };
}

function normalizeState(saved){
  const base = seedState();
  if (!saved || !Array.isArray(saved.docs)) return base;
  const builtinStyleIds = new Set(BUILTIN_STYLES.map(s => s.id));
  const custom = uniqueRecords(Array.isArray(saved.styles) ? saved.styles.filter(s => !s.builtin && !builtinStyleIds.has(s.id)) : [], [], normalizeStyleRecord);
  const favoriteMap = new Map((saved.styles || []).map(s => [s.id, !!s.favorite]));
  Object.entries(LEGACY_STYLE_REPLACEMENTS).forEach(([legacyId, nextId]) => {
    if (favoriteMap.has(legacyId) && !favoriteMap.has(nextId)) favoriteMap.set(nextId, favoriteMap.get(legacyId));
  });
  const savedDirs = saved.dirs?.length ? saved.dirs : base.dirs;
  const normalizedDirs = uniqueRecords(savedDirs, base.dirs.filter(d => d.system), (dir) => ({
    ...dir,
    name: String(dir.name || "未命名目录").trim().slice(0, 40) || "未命名目录",
    system: dir.id === "all" || dir.id === "uncategorized" ? true : !!dir.system,
  }));
  const dirIds = new Set(normalizedDirs.map(d => d.id));
  const tags = uniqueRecords(saved.tags?.length ? saved.tags : base.tags, [], (tag, idx) => ({
    ...tag,
    name: String(tag.name || "未命名标签").trim().slice(0, 24) || "未命名标签",
    color: normalizeCssColor(tag.color, tagColors[idx % tagColors.length]),
  }));
  const tagIds = new Set(tags.map(t => t.id));
  const styles = [
    ...BUILTIN_STYLES.map(s => normalizeStyleRecord({ ...s, builtin:true, favorite:favoriteMap.get(s.id) ?? !!s.fav })),
    ...custom,
  ];
  const styleIds = new Set(styles.map(s => s.id));
  const seenDocIds = new Set();
  const docs = (saved.docs.length ? saved.docs : base.docs).map((doc) => {
    const markdown = String(doc.markdown || "");
    const createdAt = validIso(doc.createdAt);
    let docId = doc.id || uid();
    let suffix = 1;
    while (seenDocIds.has(docId)) docId = `${doc.id || "doc"}-${suffix++}-${uid()}`;
    seenDocIds.add(docId);
    return {
      ...doc,
      id: docId,
      title: doc.manualTitle ? (String(doc.title || "").trim().slice(0, 80) || firstHeading(markdown)) : firstHeading(markdown),
      manualTitle: !!doc.manualTitle,
      tagIds: Array.isArray(doc.tagIds) ? [...new Set(doc.tagIds.filter(id => tagIds.has(id)))] : [],
      markdown,
      directoryId: dirIds.has(doc.directoryId) && doc.directoryId !== "all" ? doc.directoryId : "uncategorized",
      styleId: styleIds.has(doc.styleId) ? doc.styleId : (LEGACY_STYLE_REPLACEMENTS[doc.styleId] || "default"),
      styleOverrides: normalizeStyleOverrides(doc.styleOverrides),
      createdAt,
      updatedAt: validIso(doc.updatedAt, createdAt),
    };
  });
  const docIds = new Set(docs.map(d => d.id));
  const activeDocId = docIds.has(saved.activeDocId) ? saved.activeDocId : docs[0]?.id || base.activeDocId;
  const activeDirId = dirIds.has(saved.activeDirId) ? saved.activeDirId : "all";
  const activeTagIds = Array.isArray(saved.activeTagIds) ? saved.activeTagIds.filter(id => tagIds.has(id)) : [];
  const allowedSorts = new Set(["updated", "created", "title", "chars"]);
  return {
    ...base,
    ...saved,
    dirs: normalizedDirs,
    tags,
    docs,
    styles,
    activeDocId,
    activeDirId,
    activeTagIds,
    search: String(saved.search || ""),
    sort: allowedSorts.has(saved.sort) ? saved.sort : "updated",
  };
}

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
    return null;
  }
}

let state = normalizeState(loadSavedState());
let styleTab = "built-in";
let styleCategory = "all";
let styleSearch = "";
let saveTimer = null;
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
async function backupLibraryState(){
  if (!window.mdStyleStorage?.saveLibrary) return true;
  await window.mdStyleStorage.saveLibrary({ state });
  return true;
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
    persist(true);
    if (storageLoadError) showToast("已从本地备份恢复文档库");
  } catch (error) {
    console.warn("Failed to restore Electron library backup", error);
  }
}
function persist(immediate=false){
  const run = async () => {
    let localSaved = false;
    let backupSaved = false;
    let localError = null;
    let backupError = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localSaved = true;
    } catch (error) {
      localError = error;
    }
    try {
      backupSaved = await backupLibraryState();
    } catch (error) {
      backupError = error;
    }
    if (localSaved || backupSaved) {
      updateSaveState(backupError ? "已保存到浏览器，文件备份失败" : "已保存", !backupError);
      if (backupError) console.warn("Failed to write Electron library backup", backupError);
      if (localError) console.warn("Failed to save browser library", localError);
      return true;
    }
    updateSaveState("保存失败", false);
    console.warn("Failed to save library", localError || backupError);
    return false;
  };
  clearTimeout(saveTimer);
  updateSaveState("保存中", false);
  if (immediate) return run();
  saveTimer = setTimeout(() => { run(); }, 450);
  return true;
}
function updateSaveState(label, done){
  const el = $(".save-state");
  if (!el) return;
  el.innerHTML = `<span class="save-dot" style="background:${done ? "var(--accent-2)" : "var(--warn)"}"></span>${label} · ${new Date().toLocaleTimeString("zh-CN", { hour:"2-digit", minute:"2-digit" })}`;
}

function setActiveDoc(id){
  state.activeDocId = id;
  const doc = activeDoc();
  editor.value = doc.markdown;
  applyStyle(doc.styleId || "default", false);
  renderAll();
  persist(true);
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
  if (!name) return;
  const primary = normalizeCssColor(prompt("主色（HEX）", base.swatches[0]), base.swatches[0]);
  const accent = normalizeCssColor(prompt("强调色（HEX）", base.swatches[1]), base.swatches[1]);
  const soft = normalizeCssColor(prompt("浅背景色（HEX）", base.swatches[2]), base.swatches[2]);
  const style = {
    id:uid(), cls:"theme-custom", name:name.trim().slice(0, 40), cat:"我的", uc:"用户生成样式", swatches:[primary, accent, soft, "#1A1A18"],
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

function cssDecl(map){
  return Object.entries(map)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
}
function normalizedLineHeight(computed, fallback=1.8){
  const raw = computed.lineHeight;
  const fontSize = parseFloat(computed.fontSize) || 16;
  if (!raw || raw === "normal") return String(fallback);
  if (/px$/i.test(raw)) {
    const ratio = parseFloat(raw) / fontSize;
    if (Number.isFinite(ratio)) return String(Math.min(2.2, Math.max(1.35, Number(ratio.toFixed(2)))));
  }
  return raw;
}
function copyBackground(computed){
  const color = computed.backgroundColor && computed.backgroundColor !== "rgba(0, 0, 0, 0)" ? computed.backgroundColor : "";
  const image = computed.backgroundImage && computed.backgroundImage !== "none" ? computed.backgroundImage : "";
  if (image && color) return `${color} ${image}`;
  return image || color;
}
function copyBorder(computed, side){
  const cap = side.charAt(0).toUpperCase() + side.slice(1);
  return computed[`border${cap}Style`] !== "none" ? computed[`border${cap}`] : "";
}
function isUsefulBoxShadow(value){
  return value && value !== "none" && !/^rgba?\(0,\s*0,\s*0,\s*0\)/i.test(value);
}
function copyBoxStyles(computed, extras={}){
  return cssDecl({
    "font-family": computed.fontFamily,
    "font-size": computed.fontSize,
    "font-weight": computed.fontWeight,
    "font-style": computed.fontStyle,
    "line-height": normalizedLineHeight(computed),
    "letter-spacing": computed.letterSpacing,
    "color": computed.color,
    "background": copyBackground(computed),
    "background-color": computed.backgroundColor && computed.backgroundColor !== "rgba(0, 0, 0, 0)" ? computed.backgroundColor : "",
    "background-image": computed.backgroundImage && computed.backgroundImage !== "none" ? computed.backgroundImage : "",
    "background-size": computed.backgroundSize && computed.backgroundSize !== "auto" ? computed.backgroundSize : "",
    "background-position": computed.backgroundPosition && computed.backgroundPosition !== "0% 0%" ? computed.backgroundPosition : "",
    "border-top": copyBorder(computed, "top"),
    "border-right": copyBorder(computed, "right"),
    "border-bottom": copyBorder(computed, "bottom"),
    "border-left": copyBorder(computed, "left"),
    "border-radius": computed.borderRadius !== "0px" ? computed.borderRadius : "",
    "box-shadow": isUsefulBoxShadow(computed.boxShadow) ? computed.boxShadow : "",
    "padding": computed.padding !== "0px" ? computed.padding : "",
    "margin": computed.margin,
    "text-align": computed.textAlign,
    "text-decoration": computed.textDecorationLine !== "none" ? computed.textDecoration : "",
    "text-transform": computed.textTransform !== "none" ? computed.textTransform : "",
    "display": ["inline-block", "block", "table", "table-row", "table-cell"].includes(computed.display) ? computed.display : "",
    "vertical-align": computed.verticalAlign && computed.verticalAlign !== "baseline" ? computed.verticalAlign : "",
    "word-break": "break-word",
    "overflow-wrap": "break-word",
    "white-space": "normal",
    ...extras,
  });
}
function counterValueFor(node, name){
  if (name === "h2") return `${[...preview.querySelectorAll("h2")].indexOf(node) + 1}`;
  return "";
}
function pseudoContentText(raw, node){
  if (!raw || raw === "none" || raw === "normal") return "";
  if (raw.startsWith('"') || raw.startsWith("'")) {
    try {
      return JSON.parse(raw.replace(/^'/, '"').replace(/'$/, '"'));
    } catch (_) {
      return raw.slice(1, -1);
    }
  }
  if (raw.includes("counter(")) {
    const parts = [];
    raw.replace(/counter\(([^)]+)\)|"([^"]*)"|'([^']*)'/g, (_match, name, dbl, sgl) => {
      parts.push(name ? counterValueFor(node, name.trim()) : (dbl || sgl || ""));
      return "";
    });
    if (parts.length) return parts.join("");
  }
  return raw;
}
function pseudoHasBox(computed){
  const width = parseFloat(computed.width) || 0;
  const height = parseFloat(computed.height) || 0;
  return width > 0 || height > 0 || copyBackground(computed) || copyBorder(computed, "top") || copyBorder(computed, "bottom") || copyBorder(computed, "left") || copyBorder(computed, "right");
}
function safeCopyPseudoNode(node, pseudo){
  const computed = getComputedStyle(node, pseudo);
  const text = pseudoContentText(computed.content, node);
  if (!text && !pseudoHasBox(computed)) return null;
  const span = document.createElement("span");
  span.textContent = text;
  span.setAttribute("style", copyBoxStyles(computed, {
    "display": computed.display === "block" || computed.display === "inline-block" ? computed.display : (text ? "inline" : "block"),
    "width": computed.width && computed.width !== "auto" ? computed.width : "",
    "height": computed.height && computed.height !== "auto" ? computed.height : "",
    "content": "",
    "flex-shrink": computed.flexShrink && computed.flexShrink !== "1" ? computed.flexShrink : "",
  }));
  return span;
}
function appendListItemInline(target, li, nested){
  [...li.childNodes].forEach(child => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName.toLowerCase();
      if (tag === "p") {
        [...child.childNodes].forEach(grandchild => target.appendChild(safeCopyNode(grandchild)));
        return;
      }
      if (tag === "ul" || tag === "ol") {
        nested.push(safeCopyNode(child));
        return;
      }
    }
    target.appendChild(safeCopyNode(child));
  });
}
function safeCopyNode(node){
  if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
  if (node.nodeType !== Node.ELEMENT_NODE) return document.createTextNode("");

  const tag = node.tagName.toLowerCase();
  if (["script","style","iframe","object","embed","form","input","button","video","audio"].includes(tag)) return document.createTextNode("");
  const computed = getComputedStyle(node);

  if (tag === "ul" || tag === "ol") {
    const list = document.createElement("section");
    list.setAttribute("style", cssDecl({
      "max-width": "100%",
      margin: "0 0 14px",
      padding: "0",
      "font-family": computed.fontFamily,
      "font-size": computed.fontSize,
      "line-height": normalizedLineHeight(computed),
      color: computed.color,
      "word-break": "break-word",
      "overflow-wrap": "break-word",
      "white-space": "normal",
    }));
    const directItems = [...node.children].filter(child => child.tagName.toLowerCase() === "li");
    const start = Number.parseInt(node.getAttribute("start") || "1", 10) || 1;
    directItems.forEach((li, idx) => {
      const liComputed = getComputedStyle(li);
      const item = document.createElement("p");
      const marker = tag === "ol" ? `${start + idx}. ` : "• ";
      item.setAttribute("style", copyBoxStyles(liComputed, {
        margin: "0 0 10px",
        padding: "0 0 0 1.8em",
        "text-indent": "-1.8em",
        "list-style": "none",
      }));
      item.appendChild(document.createTextNode(marker));
      const nested = [];
      appendListItemInline(item, li, nested);
      list.appendChild(item);
      nested.forEach(n => list.appendChild(n));
    });
    return list;
  }

  const out = document.createElement(tag);

  if (tag === "a") {
    const href = node.getAttribute("href");
    if (href && !/^javascript:/i.test(href)) out.setAttribute("href", href);
  }
  if (tag === "img") {
    const src = node.getAttribute("src");
    if (src) out.setAttribute("src", src);
    const alt = node.getAttribute("alt");
    if (alt) out.setAttribute("alt", alt);
  }
  if (tag === "th" || tag === "td") {
    const colspan = node.getAttribute("colspan");
    const rowspan = node.getAttribute("rowspan");
    if (colspan) out.setAttribute("colspan", colspan);
    if (rowspan) out.setAttribute("rowspan", rowspan);
  }

  const before = safeCopyPseudoNode(node, "::before");
  if (before) out.appendChild(before);
  [...node.childNodes].forEach(child => out.appendChild(safeCopyNode(child)));
  const after = safeCopyPseudoNode(node, "::after");
  if (after) out.appendChild(after);

  const base = {
    p: () => copyBoxStyles(computed, { margin: "0 0 14px" }),
    h1: () => copyBoxStyles(computed, { margin: "24px 0 14px" }),
    h2: () => copyBoxStyles(computed, { margin: "26px 0 12px" }),
    h3: () => copyBoxStyles(computed, { margin: "22px 0 10px" }),
    h4: () => copyBoxStyles(computed, { margin: "18px 0 8px" }),
    blockquote: () => copyBoxStyles(computed, { margin: "18px 0", padding: computed.padding || "12px 14px" }),
    li: () => copyBoxStyles(computed, { margin: "6px 0" }),
    pre: () => copyBoxStyles(computed, {
      margin: "16px 0",
      "line-height": normalizedLineHeight(computed, 1.6),
      "white-space": "pre-wrap",
      "word-break": "break-word",
      "overflow-wrap": "break-word",
    }),
    code: () => copyBoxStyles(computed, {
      "font-family": computed.fontFamily,
      "line-height": normalizedLineHeight(computed, 1.6),
      "white-space": node.closest("pre") ? "pre-wrap" : "normal",
    }),
    table: () => copyBoxStyles(computed, {
      "width": "100%",
      "max-width": "100%",
      "border-collapse": "collapse",
      "table-layout": "auto",
      margin: "18px 0",
      "font-size": computed.fontSize,
      "line-height": normalizedLineHeight(computed, 1.6),
    }),
    th: () => copyBoxStyles(computed, { padding: computed.padding || "8px 10px", "line-height": normalizedLineHeight(computed, 1.6) }),
    td: () => copyBoxStyles(computed, { padding: computed.padding || "8px 10px", "line-height": normalizedLineHeight(computed, 1.6) }),
    img: () => cssDecl({
      "max-width": "100%",
      "height": "auto",
      "display": "block",
      "margin": "14px auto",
      "border-radius": computed.borderRadius !== "0px" ? computed.borderRadius : "",
    }),
    hr: () => cssDecl({
      border: "0",
      "border-top": computed.borderTopStyle !== "none" ? computed.borderTop : "1px solid #E6E3DA",
      margin: "24px auto",
      width: "60%",
    }),
    strong: () => copyBoxStyles(computed, { margin: "", padding: computed.padding !== "0px" ? computed.padding : "" }),
    em: () => copyBoxStyles(computed, { margin: "" }),
    span: () => copyBoxStyles(computed, { margin: "" }),
    a: () => copyBoxStyles(computed, { margin: "", color: computed.color, "text-decoration": computed.textDecorationLine !== "none" ? computed.textDecoration : "none" }),
  };
  const style = base[tag]?.() || copyBoxStyles(computed, { margin: computed.margin === "0px" ? "" : computed.margin });
  out.setAttribute("style", style);
  return out;
}
function inlineArticleHtml(){
  const article = safeCopyNode(preview);
  const computed = getComputedStyle(preview);
  const docComputed = getComputedStyle($(".preview-doc"));
  const outer = document.createElement("section");
  const inner = document.createElement("section");
  outer.setAttribute("style", cssDecl({
    "max-width": "100%",
    "box-sizing": "border-box",
    "margin": "0 auto",
    "padding": "0",
    "background": copyBackground(docComputed),
  }));
  article.setAttribute("style", cssDecl({
    "max-width": "100%",
    "box-sizing": "border-box",
    "background": copyBackground(docComputed),
    "background-color": docComputed.backgroundColor && docComputed.backgroundColor !== "rgba(0, 0, 0, 0)" ? docComputed.backgroundColor : "",
    "padding": docComputed.padding !== "0px" ? docComputed.padding : "",
    "font-family": computed.fontFamily,
    "font-size": computed.fontSize,
    "line-height": normalizedLineHeight(computed),
    "letter-spacing": computed.letterSpacing,
    "color": computed.color,
    "word-break": "break-word",
    "overflow-wrap": "break-word",
    "white-space": "normal",
  }));
  inner.setAttribute("style", article.getAttribute("style"));
  inner.innerHTML = article.innerHTML;
  outer.appendChild(inner);
  return outer.outerHTML;
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
  const html = inlineArticleHtml();
  await writeClipboard(html, plainText(html));
  showToast("已复制富文本到剪贴板，可粘贴到公众号编辑器");
}
async function copyHtml(){
  const html = inlineArticleHtml();
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
  const raw = await file.text();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw new Error("JSON 文件无法解析");
  }
  const nextState = normalizeState(payload.state || payload);
  if (!nextState.docs.length) throw new Error("备份里没有可导入的文档");
  state = nextState;
  editor.value = activeDoc().markdown;
  renderAll();
  persist(true);
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

editor.addEventListener("input", () => {
  const doc = activeDoc();
  doc.markdown = editor.value;
  if (!doc.manualTitle) doc.title = firstHeading(editor.value);
  doc.updatedAt = nowIso();
  renderPreview();
  renderMeta();
  renderCompatibility();
  renderStatus();
  renderLibrary();
  persist();
});

searchInput.addEventListener("input", () => { state.search = searchInput.value; renderLibrary(); persist(); });
sortSelect.querySelectorAll("option").forEach((o, idx) => o.value = ["updated", "created", "chars", "title"][idx]);
sortSelect.addEventListener("change", () => { state.sort = sortSelect.value; renderLibrary(); persist(); });
$(".lib-section-title button").addEventListener("click", addDirectory);
$$(".lib-section-title button")[1].addEventListener("click", addTag);
$$(".toolbar .tbtn").find(b => b.title === "新建文档").addEventListener("click", () => createDocument());
$$(".toolbar .tbtn").find(b => b.title === "导入 .md 文件").addEventListener("click", () => fileInput.click());
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
    await importLibraryFile(file);
    showToast("已导入文档库");
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
$$("[data-rail-tab]").forEach(b => b.addEventListener("click", () => { setRightCollapsed(false); setTab(b.dataset.railTab); }));
$("#btn-copy").addEventListener("click", () => copyRichText().catch(e => showToast(`复制失败：${e.message}`, true)));

const exportButtons = $$("#tab-export button.issue");
exportButtons[0].addEventListener("click", () => copyRichText().catch(e => showToast(`复制失败：${e.message}`, true)));
exportButtons[1].addEventListener("click", () => copyHtml().catch(e => showToast(`复制失败：${e.message}`, true)));
exportButtons[2].addEventListener("click", () => downloadFile(`${activeDoc().title || "article"}.html`, `<!doctype html><meta charset="utf-8">${inlineArticleHtml()}`, "text/html;charset=utf-8"));
exportButtons[3].addEventListener("click", () => downloadFile(`${activeDoc().title || "article"}.md`, activeDoc().markdown, "text/markdown;charset=utf-8"));
exportButtons[4].addEventListener("click", exportLibrary);
exportButtons[5].addEventListener("click", () => libraryInput.click());

window.addEventListener("keydown", async (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    const ok = await persist(true);
    showToast(ok ? "已保存到本地文档库" : "保存失败", !ok);
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchInput.focus(); }
});

setActiveDoc(state.activeDocId);
restoreElectronLibraryBackup();
