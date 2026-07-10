(function(global){
  "use strict";

  const escapeHtml = (s="") => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
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
  
  function normalizeInlineMarkdownMarkers(line){
    let out = "";
    let i = 0;
    while (i < line.length) {
      if (line[i] === "\\" && i + 1 < line.length) {
        out += line.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (line[i] === "`") {
        let runLength = 1;
        while (line[i + runLength] === "`") runLength++;
        const marker = "`".repeat(runLength);
        const closeAt = line.indexOf(marker, i + runLength);
        if (closeAt >= 0) {
          out += line.slice(i, closeAt + runLength);
          i = closeAt + runLength;
          continue;
        }
      }
      out += line[i] === "＊" ? "*" : line[i] === "＿" ? "_" : line[i];
      i++;
    }
    return out;
  }
  
  function normalizeMarkdownMarkers(src){
    let fence = null;
    return String(src || "").replace(/\r\n/g, "\n").split("\n").map((line) => {
      if (fence) {
        const closeMatch = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
        if (closeMatch && closeMatch[1][0] === fence.char && closeMatch[1].length >= fence.length) fence = null;
        return line;
      }
      const openMatch = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (openMatch) {
        fence = { char:openMatch[1][0], length:openMatch[1].length };
        return line;
      }
      return normalizeInlineMarkdownMarkers(line);
    }).join("\n");
  }
  
  function isEscapedMarker(src, index){
    let slashes = 0;
    for (let i = index - 1; i >= 0 && src[i] === "\\"; i--) slashes++;
    return slashes % 2 === 1;
  }
  
  function isInlineWordChar(value){
    return Boolean(value && /[\p{L}\p{N}]/u.test(value));
  }
  
  function findEnhancedEmphasisClose(src, marker, from){
    let index = src.indexOf(marker, from);
    while (index >= 0) {
      const touchesSameMarker = src[index - 1] === marker[0] || src[index + marker.length] === marker[0];
      if (!isEscapedMarker(src, index) && !touchesSameMarker) return index;
      index = src.indexOf(marker, index + 1);
    }
    return -1;
  }
  
  function enhancedEmphasisRule(state, silent){
    const start = state.pos;
    const src = state.src;
    const marker = src.startsWith("**", start) ? "**" : src.startsWith("__", start) ? "__" : src[start] === "*" ? "*" : "";
    if (!marker || isEscapedMarker(src, start)) return false;
    if (src[start + marker.length] === marker[0]) return false;
  
    const end = findEnhancedEmphasisClose(src, marker, start + marker.length);
    if (end < 0 || src.slice(start + marker.length, end).includes("\n")) return false;
  
    const rawInner = src.slice(start + marker.length, end);
    const leading = rawInner.match(/^\s*/)?.[0] || "";
    const trailing = rawInner.match(/\s*$/)?.[0] || "";
    const inner = rawInner.slice(leading.length, rawInner.length - trailing.length);
    if (!inner) return false;
  
    const intrawordDoubleUnderscore = marker === "__" &&
      isInlineWordChar(src[start - 1]) && isInlineWordChar(src[end + marker.length]);
    if (!leading && !trailing && !intrawordDoubleUnderscore) return false;
    if (silent) return true;
  
    if (leading) state.push("text", "", 0).content = leading;
    const tag = marker.length === 2 ? "strong" : "em";
    const open = state.push(`${tag}_open`, tag, 1);
    open.markup = marker;
    state.md.inline.parse(inner, state.md, state.env, state.tokens);
    const close = state.push(`${tag}_close`, tag, -1);
    close.markup = marker;
    if (trailing) state.push("text", "", 0).content = trailing;
    state.pos = end + marker.length;
    return true;
  }
  
  function installEnhancedEmphasis(md){
    md.inline.ruler.before("emphasis", "enhanced_emphasis", enhancedEmphasisRule);
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
    installEnhancedEmphasis(md);
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
    const normalized = normalizeMarkdownMarkers(src);
    return renderer ? renderer.render(normalized) : legacyMdToHtml(normalized);
  }

  global.MDStyleMarkdown = Object.freeze({
    render: mdToHtml,
    normalizeMarkers: normalizeMarkdownMarkers,
    sanitizeLinkUrl,
    sanitizeImageUrl,
  });
})(globalThis);
