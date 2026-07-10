import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

ipcMain.handle("library:load", () => null);
ipcMain.handle("library:save", () => true);
ipcMain.handle("clipboard:write-rich", () => true);
ipcMain.handle("clipboard:write-text", () => true);

function waitForLoad(win) {
  return new Promise((resolve, reject) => {
    win.webContents.once("did-finish-load", resolve);
    win.webContents.once("did-fail-load", (_event, _code, description) => reject(new Error(description)));
  });
}

app.whenReady().then(async () => {
  const messages = [];
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(root, "electron", "preload.js"),
    },
  });

  win.webContents.on("console-message", (_event, level, message) => {
    if (level >= 2) messages.push(message);
  });

  const loaded = waitForLoad(win);
  await win.loadFile(path.join(root, "index.html"));
  await loaded;

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const editor = document.querySelector("#editor");
      editor.value = [
        "# 主标题",
        "",
        "## 第一节",
        "",
        "这是一段 **重点内容**，用于验证背景高亮。",
        "",
        "> 这里是一段引用。",
        "",
        "1. 第一项内容",
        "2. 第二项内容"
      ].join("\\n");
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      await frame();

      const initialStyleCount = document.querySelectorAll("#style-grid .style-card").length;
      const category = document.querySelector("#style-category");
      category.value = "访谈";
      category.dispatchEvent(new Event("change", { bubbles: true }));
      await frame();
      const interviewFilterWorks = [...document.querySelectorAll("#style-grid .style-card .nm")].some(el => el.textContent.includes("访谈问答"));
      const search = document.querySelector("#style-search");
      category.value = "all";
      category.dispatchEvent(new Event("change", { bubbles: true }));
      search.value = "黑白";
      search.dispatchEvent(new Event("input", { bubbles: true }));
      await frame();
      const searchWorks = [...document.querySelectorAll("#style-grid .style-card .nm")].some(el => el.textContent.includes("黑白锋利"));
      search.value = "";
      search.dispatchEvent(new Event("input", { bubbles: true }));
      await frame();

      applyStyle("brief");
      await frame();
      const brief = inlineArticleHtml();

      applyStyle("essay");
      await frame();
      const essay = inlineArticleHtml();

      applyStyle("academic");
      await frame();
      const academic = inlineArticleHtml();

      document.querySelector("#override-heading").value = "block";
      document.querySelector("#override-heading").dispatchEvent(new Event("change", { bubbles: true }));
      document.querySelector("#override-font").value = "kaiti";
      document.querySelector("#override-font").dispatchEvent(new Event("change", { bubbles: true }));
      document.querySelector("#override-text").value = "#123456";
      document.querySelector("#override-text").dispatchEvent(new Event("input", { bubbles: true }));
      document.querySelector("#override-page").value = "#fff3ee";
      document.querySelector("#override-page").dispatchEvent(new Event("input", { bubbles: true }));
      document.querySelector("#override-strong").value = "#fed7aa";
      document.querySelector("#override-strong").dispatchEvent(new Event("input", { bubbles: true }));
      await frame();
      const overridden = inlineArticleHtml();
      const reportedExportBytes = lastRenderResult.stats.htmlBytes;
      const actualExportBytes = new Blob([lastRenderResult.exportHtml]).size;
      const previewBytes = new Blob([lastRenderResult.html]).size;
      const parsed = new DOMParser().parseFromString(overridden, "text/html");
      const parsedInner = parsed.body.querySelector("section > section");
      const parsedH1 = parsed.body.querySelector("h1");

      return {
        initialStyleCount,
        interviewFilterWorks,
        searchWorks,
        briefHasGradient: /background-image:\\s*linear-gradient/i.test(brief) || /background:[^;]*linear-gradient/i.test(brief),
        briefHasQuoteBackground: /background(?:-color)?:rgb\\(244, 239, 226\\)/i.test(brief),
        essayHasSectionMark: essay.includes(">§<") || essay.includes("§"),
        essayHasDecorativeRule: /width:30px/i.test(essay) && /height:2px/i.test(essay),
        academicHasCounter: academic.includes(">1. <") || academic.includes("1. 第一节"),
        listKeepsHangingIndent: /text-indent:-1\\.8em/i.test(academic),
        overrideClassApplied: document.querySelector("#preview-pane").className.includes("heading-block") && document.querySelector("#preview-pane").className.includes("override-body-font"),
        overrideTextExported: /color:rgb\\(18, 52, 86\\)/i.test(overridden),
        overridePageBgExported: /background:rgb\\(255, 243, 238\\)/i.test(overridden) || /background-color:rgb\\(255, 243, 238\\)/i.test(overridden),
        overrideStrongBgExported: /background(?:-color)?:rgb\\(254, 215, 170\\)/i.test(overridden),
        compatibilityUsesFinalExport: reportedExportBytes === actualExportBytes && actualExportBytes > previewBytes,
        exportHtmlParses: !!parsedInner && !!parsedH1,
        exportStyleHasFontFamily: parsedInner?.style.fontFamily.includes("Kaiti") || parsedInner?.getAttribute("style")?.includes("font-family"),
        exportHasEscapedQuotes: overridden.includes("&quot;") || !/font-family:"/.test(overridden),
        samples: {
          brief: brief.slice(0, 900),
          essay: essay.slice(0, 900),
          academic: academic.slice(0, 1800),
          overridden: overridden.slice(0, 1200)
        }
      };
    })()
  `);

  const failures = [];
  if (result.initialStyleCount < 20) failures.push(`expected at least 20 built-in styles, got ${result.initialStyleCount}`);
  if (!result.interviewFilterWorks) failures.push("style category filter did not show interview styles");
  if (!result.searchWorks) failures.push("style search did not find black-white style");
  if (!result.briefHasGradient) failures.push("brief strong gradient was not exported");
  if (!result.briefHasQuoteBackground) failures.push("brief quote background was not exported");
  if (!result.essayHasSectionMark) failures.push("essay h2 ::before mark was not materialized");
  if (!result.essayHasDecorativeRule) failures.push("essay h1 ::after rule was not materialized");
  if (!result.academicHasCounter) failures.push("academic CSS counter was not materialized");
  if (!result.listKeepsHangingIndent) failures.push("list hanging indentation was not preserved");
  if (!result.overrideClassApplied) failures.push("style override classes were not applied");
  if (!result.overrideTextExported) failures.push("text color override was not exported");
  if (!result.overridePageBgExported) failures.push("page background override was not exported");
  if (!result.overrideStrongBgExported) failures.push("strong background override was not exported");
  if (!result.compatibilityUsesFinalExport) failures.push("compatibility stats did not use final inline export HTML");
  if (!result.exportHtmlParses) failures.push("exported HTML did not parse into expected wrapper structure");
  if (!result.exportStyleHasFontFamily) failures.push("exported style attribute lost font-family");
  if (!result.exportHasEscapedQuotes) failures.push("exported style attribute contains unescaped font quotes");
  if (messages.length) failures.push(`renderer console errors: ${messages.join(" | ")}`);

  if (failures.length) {
    console.error(JSON.stringify({ failures, result }, null, 2));
    app.exit(1);
    return;
  }

  console.log("copy export verification passed");
  app.exit(0);
}).catch(error => {
  console.error(error);
  app.exit(1);
});
