(function(global){
  "use strict";

  function create({ article:preview, page }={}){
    if (!preview?.ownerDocument) throw new Error("WeChat exporter requires a preview element");
    const document = preview.ownerDocument;
    const previewPage = page || preview.parentElement;
    if (!previewPage) throw new Error("WeChat exporter requires a preview page element");
    const view = document.defaultView || global;
    const getComputedStyle = view.getComputedStyle.bind(view);
    const Node = view.Node || { ELEMENT_NODE:1, TEXT_NODE:3 };

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
      const docComputed = getComputedStyle(previewPage);
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

    return Object.freeze({ toHtml:inlineArticleHtml });
  }

  global.MDStyleWechatExporter = Object.freeze({ create });
})(globalThis);
