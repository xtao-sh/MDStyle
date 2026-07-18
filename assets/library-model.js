(function(global){
  "use strict";

  const DEFAULT_TAG_COLORS = Object.freeze(["#5C8A7D", "#C9A04A", "#8B6A3A", "#A23E2E", "#3D5E92", "#8B7AA8"]);

  function create(options={}){
    const BUILTIN_STYLES = Array.isArray(options.themes) ? options.themes : [];
    if (!BUILTIN_STYLES.length) throw new Error("Library model requires built-in themes");
    const LEGACY_STYLE_REPLACEMENTS = options.legacyReplacements || {};
    const SAMPLE_MD = String(options.sampleMarkdown || "");
    const uid = options.uid || (() => `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const nowIso = options.nowIso || (() => new Date().toISOString());
    const firstHeading = options.firstHeading || ((md) => (String(md).match(/^#\s+(.+)$/m)?.[1] || "未命名文档").trim().slice(0, 80));
    const tagColors = Array.isArray(options.tagColors) && options.tagColors.length ? [...options.tagColors] : [...DEFAULT_TAG_COLORS];
    const headingPresets = new Set(["", "left", "underline", "block", "center"]);
    const fontPresetIds = new Set(["", ...(options.fontPresetIds || [])]);
    const fontPresetValues = new Set(Object.values(options.fontPresets || {}));
    const targetProfileIds = new Set(options.targetProfileIds || ["general"]);
    const legacyTargetId = targetProfileIds.has(options.legacyTargetId) ? options.legacyTargetId : [...targetProfileIds][0];

    function normalizeCssColor(value, fallback="#1A1A18"){
      const v = String(value || "").trim();
      if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return v;
      if (/^rgba?\(\s*(?:\d{1,3}\s*,\s*){2}\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(v)) return v;
      if (/^hsla?\(\s*\d{1,3}(?:deg)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(v)) return v;
      return fallback;
    }
    function isRecord(value){
      return Boolean(value && typeof value === "object" && !Array.isArray(value));
    }
    function normalizeId(value){
      if (typeof value !== "string" && typeof value !== "number") return "";
      return String(value).trim().slice(0, 160);
    }
    function normalizeTargetId(value, fallback=legacyTargetId){
      if (targetProfileIds.has(value)) return value;
      return targetProfileIds.has(fallback) ? fallback : legacyTargetId;
    }
    function normalizeStyleRecord(style={}){
      const source = isRecord(style) ? style : {};
      const fallback = ["#2D2D2A", "#5C8A7D", "#F7F6F1", "#26262B"];
      const sourceSwatches = Array.isArray(source.swatches) ? source.swatches : [];
      const swatches = fallback.map((color, idx) => normalizeCssColor(sourceSwatches[idx], color));
      const colorFallbacks = {
        "--custom-primary":swatches[0], "--custom-accent":swatches[1], "--custom-soft":swatches[2],
        "--custom-bg":"#FFFFFF", "--custom-text":swatches[0], "--custom-code-bg":swatches[3], "--custom-code":swatches[2],
      };
      const sizeRanges = {
        "--custom-body":[12, 22], "--custom-h1":[18, 42], "--custom-h2":[16, 32], "--custom-h3":[14, 26],
      };
      const customVars = {};
      if (isRecord(source.customVars)) Object.entries(source.customVars).forEach(([key, value]) => {
        if (colorFallbacks[key]) {
          customVars[key] = normalizeCssColor(value, colorFallbacks[key]);
          return;
        }
        if (key === "--custom-font" && fontPresetValues.has(value)) {
          customVars[key] = value;
          return;
        }
        if (sizeRanges[key]) {
          const match = String(value || "").match(/^(\d+(?:\.\d+)?)px$/);
          const numeric = match ? Number(match[1]) : NaN;
          if (Number.isFinite(numeric) && numeric >= sizeRanges[key][0] && numeric <= sizeRanges[key][1]) customVars[key] = `${numeric}px`;
          return;
        }
        if (key === "--custom-line") {
          const numeric = Number(value);
          if (Number.isFinite(numeric) && numeric >= 1.2 && numeric <= 2.4) customVars[key] = String(numeric);
        }
      });
      const { customVars:_ignoredCustomVars, ...rest } = source;
      const headingPreset = headingPresets.has(source.headingPreset) ? source.headingPreset : "";
      return { ...rest, headingPreset, swatches, ...(Object.keys(customVars).length ? { customVars } : {}) };
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
      if (input.paragraphBg) out.paragraphBg = normalizeCssColor(input.paragraphBg, "#FFFFFF");
      if (input.quoteBg) out.quoteBg = normalizeCssColor(input.quoteBg, "#F7F6F1");
      if (input.codeBg) out.codeBg = normalizeCssColor(input.codeBg, "#26262B");
      if (input.tableHeaderBg) out.tableHeaderBg = normalizeCssColor(input.tableHeaderBg, "#2F5D4F");
      if (input.linkColor) out.linkColor = normalizeCssColor(input.linkColor, "#2F5D4F");
      const paragraphSpacing = Number(input.paragraphSpacing);
      if (Number.isFinite(paragraphSpacing) && paragraphSpacing >= 6 && paragraphSpacing <= 36) out.paragraphSpacing = paragraphSpacing;
      return out;
    }
    function uniqueRecords(records, fallbackRecords=[], normalize=(x) => x){
      const seen = new Set();
      const out = [];
      [...(Array.isArray(records) ? records : []), ...fallbackRecords].forEach((record) => {
        const id = normalizeId(record?.id);
        if (!id || seen.has(id)) return;
        seen.add(id);
        out.push(normalize({ ...record, id }, out.length));
      });
      return out;
    }
    function validIso(value, fallback=nowIso()){
      const time = new Date(value).getTime();
      return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
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
      docs.forEach(doc => { doc.targetId = legacyTargetId; });
      return { dirs, tags, docs, customTemplates:[], activeDocId:docs[0].id, activeDirId:"all", activeTagIds:[], search:"", sort:"updated", styles:BUILTIN_STYLES.map(s => ({ ...s, builtin:true, favorite:!!s.fav })) };
    }
    
    function normalizeState(saved){
      const base = seedState();
      if (!saved || !Array.isArray(saved.docs)) return base;
      const builtinStyleIds = new Set(BUILTIN_STYLES.map(s => s.id));
      const savedStyles = Array.isArray(saved.styles) ? saved.styles.filter(isRecord) : [];
      const custom = uniqueRecords(savedStyles.filter(s => !s.builtin && !builtinStyleIds.has(normalizeId(s.id))), [], normalizeStyleRecord);
      const favoriteMap = new Map(savedStyles.map(s => [normalizeId(s.id), !!s.favorite]).filter(([id]) => id));
      Object.entries(LEGACY_STYLE_REPLACEMENTS).forEach(([legacyId, nextId]) => {
        if (favoriteMap.has(legacyId) && !favoriteMap.has(nextId)) favoriteMap.set(nextId, favoriteMap.get(legacyId));
      });
      const savedDirs = Array.isArray(saved.dirs) && saved.dirs.length ? saved.dirs : base.dirs;
      const normalizedDirs = uniqueRecords(savedDirs, base.dirs.filter(d => d.system), (dir) => ({
        ...dir,
        name: String(dir.name || "未命名目录").trim().slice(0, 40) || "未命名目录",
        system: dir.id === "all" || dir.id === "uncategorized" ? true : !!dir.system,
      }));
      const dirIds = new Set(normalizedDirs.map(d => d.id));
      const tags = uniqueRecords(Array.isArray(saved.tags) && saved.tags.length ? saved.tags : base.tags, [], (tag, idx) => ({
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
      const customTemplates = uniqueRecords(Array.isArray(saved.customTemplates) ? saved.customTemplates.filter(isRecord) : [], [], (template) => {
        const markdown = String(template.markdown || "");
        const headings = [...markdown.matchAll(/^#{1,3}\s+(.+)$/gm)].map(match => match[1].trim()).filter(Boolean).slice(0, 6);
        return {
          ...template,
          name:String(template.name || firstHeading(markdown) || "未命名模板").trim().slice(0, 50) || "未命名模板",
          cat:String(template.cat || "我的模板").trim().slice(0, 24) || "我的模板",
          description:String(template.description || "个人保存的文档结构").trim().slice(0, 120) || "个人保存的文档结构",
          tags:Array.isArray(template.tags) ? [...new Set(template.tags.map(tag => String(tag).trim().slice(0, 24)).filter(Boolean))].slice(0, 12) : [],
          outline:Array.isArray(template.outline) && template.outline.length ? template.outline.map(item => String(item).trim().slice(0, 40)).filter(Boolean).slice(0, 6) : headings,
          markdown,
          styleId:styleIds.has(normalizeId(template.styleId)) ? normalizeId(template.styleId) : "default",
          targetId:normalizeTargetId(template.targetId, "general"),
          custom:true,
          createdAt:validIso(template.createdAt),
        };
      });
      const seenDocIds = new Set();
      const savedDocs = saved.docs.filter(isRecord);
      const docs = (savedDocs.length ? savedDocs : base.docs).map((doc) => {
        const markdown = String(doc.markdown || "");
        const createdAt = validIso(doc.createdAt);
        const sourceDocId = normalizeId(doc.id);
        let docId = sourceDocId || normalizeId(uid());
        let suffix = 1;
        while (seenDocIds.has(docId)) docId = `${sourceDocId || "doc"}-${suffix++}-${normalizeId(uid())}`;
        seenDocIds.add(docId);
        const sourceStyleId = normalizeId(doc.styleId);
        const sourceDirectoryId = normalizeId(doc.directoryId);
        const migratedStyleId = LEGACY_STYLE_REPLACEMENTS[sourceStyleId];
        return {
          ...doc,
          id: docId,
          title: doc.manualTitle ? (String(doc.title || "").trim().slice(0, 80) || firstHeading(markdown)) : firstHeading(markdown),
          manualTitle: !!doc.manualTitle,
          tagIds: Array.isArray(doc.tagIds) ? [...new Set(doc.tagIds.map(normalizeId).filter(id => tagIds.has(id)))] : [],
          markdown,
          directoryId: dirIds.has(sourceDirectoryId) && sourceDirectoryId !== "all" ? sourceDirectoryId : "uncategorized",
          styleId: styleIds.has(sourceStyleId) ? sourceStyleId : (styleIds.has(migratedStyleId) ? migratedStyleId : "default"),
          targetId: normalizeTargetId(doc.targetId),
          styleOverrides: normalizeStyleOverrides(doc.styleOverrides),
          createdAt,
          updatedAt: validIso(doc.updatedAt, createdAt),
        };
      });
      const docIds = new Set(docs.map(d => d.id));
      const savedActiveDocId = normalizeId(saved.activeDocId);
      const savedActiveDirId = normalizeId(saved.activeDirId);
      const activeDocId = docIds.has(savedActiveDocId) ? savedActiveDocId : docs[0]?.id || base.activeDocId;
      const activeDirId = dirIds.has(savedActiveDirId) ? savedActiveDirId : "all";
      const activeTagIds = Array.isArray(saved.activeTagIds) ? [...new Set(saved.activeTagIds.map(normalizeId).filter(id => tagIds.has(id)))] : [];
      const allowedSorts = new Set(["updated", "created", "title", "chars"]);
      return {
        ...base,
        ...saved,
        dirs: normalizedDirs,
        tags,
        docs,
        customTemplates,
        styles,
        activeDocId,
        activeDirId,
        activeTagIds,
        search: String(saved.search || ""),
        sort: allowedSorts.has(saved.sort) ? saved.sort : "updated",
      };
    }

    return Object.freeze({
      tagColors: Object.freeze([...tagColors]),
      normalizeCssColor,
      normalizeTargetId,
      normalizeStyleRecord,
      normalizeStyleOverrides,
      seedState,
      normalizeState,
    });
  }

  global.MDStyleLibraryModel = Object.freeze({ create });
})(globalThis);
