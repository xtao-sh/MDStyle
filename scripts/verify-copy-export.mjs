import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let libraryLoadPayload = null;
const savedLibraryPayloads = [];
const recoveryPoints = [{
  id:"snapshot:2026-07-18T08-00-00-000Z-before-import.json",
  kind:"snapshot",
  reason:"before-import",
  savedAt:"2026-07-18T08:00:00.000Z",
  documentCount:2,
}];
ipcMain.handle("library:load", () => libraryLoadPayload);
ipcMain.handle("library:save", (_event, payload) => { savedLibraryPayloads.push(payload); return true; });
ipcMain.handle("library:snapshot", () => true);
ipcMain.handle("library:list-recovery", () => recoveryPoints);
ipcMain.handle("library:load-recovery", () => null);
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
      partition:`md-style-copy-test-${Date.now()}`,
      preload: path.join(root, "electron", "preload.js"),
    },
  });

  win.webContents.on("console-message", (_event, ...args) => {
    const details = args[0];
    const level = details && typeof details === "object" ? details.level : details;
    const message = details && typeof details === "object" ? details.message : args[1];
    if (level === "error" || level === "warning" || Number(level) >= 2) messages.push(String(message));
  });

  const loaded = waitForLoad(win);
  await win.loadFile(path.join(root, "index.html"));
  await loaded;

  let result;
  try {
    result = await win.webContents.executeJavaScript(`
    (async () => {
      try {
      const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const resolveConfirmation = async (pending, accept=true) => {
        await frame();
        const dialog = document.querySelector("#confirm-dialog");
        if (!dialog?.open) throw new Error("expected app confirmation dialog to be open");
        document.querySelector(accept ? "#confirm-accept" : "#confirm-cancel").click();
        await pending;
        await frame();
      };
      const editor = document.querySelector("#editor");
      const initialDocCount = state.docs.length;
      const initialTemplateCount = document.querySelectorAll("#template-grid .template-card").length;
      const colorInputValuesWork = colorInputValue("rgb(17, 34, 51)") === "#112233" && colorInputValue("hsl(0, 100%, 50%)") === "#ff0000";
      const templateCategory = document.querySelector("#template-category");
      templateCategory.value = "商业协作";
      templateCategory.dispatchEvent(new Event("change", { bubbles: true }));
      await frame();
      const templateCategoryWorks = [...document.querySelectorAll("#template-grid .template-name")].some(el => el.textContent.includes("决策备忘录"));
      templateCategory.value = "all";
      templateCategory.dispatchEvent(new Event("change", { bubbles: true }));
      const templateSearch = document.querySelector("#template-search");
      templateSearch.value = "研究问题";
      templateSearch.dispatchEvent(new Event("input", { bubbles: true }));
      await frame();
      const templateSearchWorks = [...document.querySelectorAll("#template-grid .template-name")].some(el => el.textContent.includes("论文与研究笔记"));
      templateSearch.value = "";
      templateSearch.dispatchEvent(new Event("input", { bubbles: true }));
      templateCategory.value = "all";
      templateCategory.dispatchEvent(new Event("change", { bubbles: true }));
      createDocumentFromTemplate("decision-memo");
      await frame();
      const templateCreateWorks = state.docs.length === initialDocCount + 1 && activeDoc().styleId === "brief" && activeDoc().targetId === "general" && activeDoc().markdown.includes("决策备忘录") && activeDoc().tagIds.length === 2;

      const targetProfile = document.querySelector("#target-profile");
      const publishingProfilesWork = targetProfile.options.length === 3 && targetProfile.value === "general";
      activeDoc().manualTitle = true;
      activeDoc().title = "超".repeat(40);
      editor.value = "# 超长标题\\n\\n![远程图片](https://example.com/test.png)";
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      targetProfile.value = "general";
      targetProfile.dispatchEvent(new Event("change", { bubbles: true }));
      await frame();
      const generalProfileWorks = !lastRenderResult.issues.some(issue => issue.code === "META-001" || issue.code === "IMG-001");
      targetProfile.value = "wechat";
      targetProfile.dispatchEvent(new Event("change", { bubbles: true }));
      await frame();
      const wechatProfileWorks = lastRenderResult.issues.some(issue => issue.code === "META-001") && lastRenderResult.issues.some(issue => issue.code === "IMG-001" && issue.title.includes("外部图片"));
      targetProfile.value = "email";
      targetProfile.dispatchEvent(new Event("change", { bubbles: true }));
      await frame();
      const emailProfileWorks = !lastRenderResult.issues.some(issue => issue.code === "META-001") && lastRenderResult.issues.some(issue => issue.code === "IMG-001" && issue.title.includes("邮件客户端"));
      editor.value = "# 内嵌图片\\n\\n![测试图片](data:image/png;base64,AAAA)";
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      targetProfile.value = "wechat";
      targetProfile.dispatchEvent(new Event("change", { bubbles: true }));
      await frame();
      const base64WarningIsUnique = !lastRenderResult.issues.some(issue => issue.code === "IMG-001") && lastRenderResult.issues.filter(issue => issue.code === "IMG-002").length === 1;
      targetProfile.value = "general";
      targetProfile.dispatchEvent(new Event("change", { bubbles: true }));
      activeDoc().manualTitle = false;

      editor.value = [
        "# 链接与资源检查",
        "",
        "[邮件](mailto:editor@example.com) · [电话](tel:+8613800138000) · [章节](#section)",
        "",
        "![本地图片][local-image]",
        "",
        "[local-image]: ./images/local-cover.png",
        "",
        "~~~html",
        "<script>代码示例不应触发危险 HTML 警告</script>",
        "~~~"
      ].join("\\n");
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      await delay(180);
      await frame();
      const previewLinks = [...document.querySelectorAll("#preview a")].map(link => link.getAttribute("href"));
      const enhancedLinksWork = previewLinks.includes("mailto:editor@example.com") && previewLinks.includes("tel:+8613800138000") && previewLinks.includes("#section");
      const referenceLocalImageWarns = lastRenderResult.issues.some(issue => issue.code === "IMG-003");
      const tildeFenceIgnoredByHtmlCheck = !lastRenderResult.issues.some(issue => issue.code === "HTML-001");

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

      const customTemplateCount = state.customTemplates.length;
      openTemplateBuilder();
      document.querySelector("#template-name").value = "自动测试模板";
      document.querySelector("#template-custom-category").value = "测试场景";
      document.querySelector("#template-description").value = "验证个人模板保存与恢复";
      saveCurrentAsTemplate({ preventDefault(){} });
      await frame();
      const savedTemplate = state.customTemplates.find(template => template.name === "自动测试模板");
      const customTemplateSaved = state.customTemplates.length === customTemplateCount + 1 && !!savedTemplate && savedTemplate.targetId === "general" && savedTemplate.outline.includes("主标题") && !!document.querySelector('[data-template-id="' + savedTemplate.id + '"]');
      editor.value += "\\n\\n## 更新后的结构\\n\\n模板刷新验证。";
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      openTemplateBuilder(savedTemplate.id);
      document.querySelector("#template-name").value = "自动测试模板（更新）";
      document.querySelector("#template-description").value = "验证个人模板可编辑并刷新内容";
      document.querySelector("#template-refresh-content").checked = true;
      saveCurrentAsTemplate({ preventDefault(){} });
      await frame();
      const customTemplateUpdated = savedTemplate.name === "自动测试模板（更新）" && savedTemplate.description.includes("可编辑") && savedTemplate.markdown.includes("更新后的结构") && savedTemplate.outline.includes("更新后的结构");
      const docsBeforeCustomTemplate = state.docs.length;
      createDocumentFromTemplate(savedTemplate.id);
      await frame();
      const customTemplateUsed = state.docs.length === docsBeforeCustomTemplate + 1 && activeDoc().templateId === savedTemplate.id && activeDoc().markdown.includes("重点内容") && activeDoc().markdown.includes("更新后的结构");
      const cancelledTemplateDeletion = deleteCustomTemplate(savedTemplate.id);
      await resolveConfirmation(cancelledTemplateDeletion, false);
      const confirmCancelWorks = state.customTemplates.some(template => template.id === savedTemplate.id);
      const confirmedTemplateDeletion = deleteCustomTemplate(savedTemplate.id);
      await resolveConfirmation(confirmedTemplateDeletion, true);
      const customTemplateDeleted = !state.customTemplates.some(template => template.id === savedTemplate.id);

      const directoriesBefore = state.dirs.length;
      addDirectory();
      document.querySelector("#library-directory-name").value = "自动测试目录";
      submitLibraryEditor({ preventDefault(){} });
      const testDirectory = state.dirs.find(directory => directory.name === "自动测试目录");
      addTag();
      document.querySelector("#library-tag-name").value = "自动标签";
      document.querySelector("#library-tag-color").value = "#336699";
      submitLibraryEditor({ preventDefault(){} });
      const testTag = state.tags.find(tag => tag.name === "自动标签");
      const managedDoc = activeDoc();
      await handleDocAction(managedDoc.id, "rename");
      document.querySelector("#library-doc-title").value = "侧栏编辑后的文档";
      submitLibraryEditor({ preventDefault(){} });
      await handleDocAction(managedDoc.id, "move");
      document.querySelector("#library-doc-directory").value = testDirectory.id;
      submitLibraryEditor({ preventDefault(){} });
      await handleDocAction(managedDoc.id, "tags");
      document.querySelector('input[name="library-doc-tag"][value="' + testTag.id + '"]').checked = true;
      submitLibraryEditor({ preventDefault(){} });
      const libraryEditorWorks = state.dirs.length === directoriesBefore + 1 && managedDoc.title === "侧栏编辑后的文档" && managedDoc.manualTitle && managedDoc.directoryId === testDirectory.id && managedDoc.tagIds.includes(testTag.id) && testTag.color === "#336699";
      openLibraryEditor("tag-edit", testTag.id);
      document.querySelector("#library-tag-name").value = "自动标签（已编辑）";
      document.querySelector("#library-tag-color").value = "#8844aa";
      submitLibraryEditor({ preventDefault(){} });
      const tagEditingWorks = testTag.name === "自动标签（已编辑）" && testTag.color === "#8844aa" && managedDoc.tagIds.includes(testTag.id);
      const confirmedTagDeletion = handleTagAction(testTag.id, "delete");
      await resolveConfirmation(confirmedTagDeletion, true);
      const tagDeletionWorks = !state.tags.some(tag => tag.id === testTag.id) && !managedDoc.tagIds.includes(testTag.id) && !state.activeTagIds.includes(testTag.id);

      const initialStyleCount = document.querySelectorAll("#style-grid .style-card").length;
      const category = document.querySelector("#style-category");
      category.value = "媒体叙事";
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
      const intensity = document.querySelector("#style-intensity");
      intensity.value = "先锋";
      intensity.dispatchEvent(new Event("change", { bubbles: true }));
      await frame();
      const experimentalCards = [...document.querySelectorAll("#style-grid .style-card")];
      const intensityFilterWorks = experimentalCards.length >= 10 && experimentalCards.every(card => card.dataset.styleIntensity === "先锋") && experimentalCards.some(card => card.dataset.styleId === "brutalist");
      intensity.value = "all";
      intensity.dispatchEvent(new Event("change", { bubbles: true }));
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

      applyStyle("brutalist");
      await frame();
      const brutalist = inlineArticleHtml();

      applyStyle("cyber");
      await frame();
      const cyber = inlineArticleHtml();

      applyStyle("blueprint");
      await frame();
      const blueprint = inlineArticleHtml();

      editor.value = [
        "# 嵌套列表",
        "",
        "1. 一级条目",
        "   1. 二级有序条目",
        "      - 三级无序条目",
        "2. 第二个一级条目"
      ].join("\\n");
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      await frame();
      const nestedListHtml = inlineArticleHtml();
      const parsedNestedList = new DOMParser().parseFromString(nestedListHtml, "text/html");
      const exportedLists = [...parsedNestedList.body.querySelectorAll("section")].filter(section => [...section.children].some(child => child.tagName === "P"));
      const nestedListIndentWorks = exportedLists.length >= 3 && exportedLists[0].style.paddingLeft === "0px" && exportedLists.slice(1).every(section => parseFloat(section.style.paddingLeft) > 0);
      const nestedListMarkersWork = parsedNestedList.body.textContent.includes("1. 一级条目") && parsedNestedList.body.textContent.includes("1. 二级有序条目") && parsedNestedList.body.textContent.includes("• 三级无序条目");

      editor.value = [
        "# 主标题",
        "",
        "这是一段 **重点内容**，包含 [示例链接](https://example.com) 与 \`行内代码\`。",
        "",
        "> 这里是一段引用。",
        "",
        "| 项目 | 说明 |",
        "| --- | --- |",
        "| Alpha | Beta |"
      ].join("\\n");
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      applyStyle("academic");
      await frame();

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
      document.querySelector("#override-paragraph").value = "#eef7f2";
      document.querySelector("#override-paragraph").dispatchEvent(new Event("input", { bubbles: true }));
      document.querySelector("#override-paragraph-spacing").value = "22";
      document.querySelector("#override-paragraph-spacing").dispatchEvent(new Event("input", { bubbles: true }));
      document.querySelector("#override-quote").value = "#ddeeff";
      document.querySelector("#override-quote").dispatchEvent(new Event("input", { bubbles: true }));
      document.querySelector("#override-code-bg").value = "#112233";
      document.querySelector("#override-code-bg").dispatchEvent(new Event("input", { bubbles: true }));
      document.querySelector("#override-table-header").value = "#334455";
      document.querySelector("#override-table-header").dispatchEvent(new Event("input", { bubbles: true }));
      document.querySelector("#override-link").value = "#cc3366";
      document.querySelector("#override-link").dispatchEvent(new Event("input", { bubbles: true }));
      await frame();
      const overridden = inlineArticleHtml();
      const reportedExportBytes = lastRenderResult.stats.htmlBytes;
      const actualExportBytes = new Blob([lastRenderResult.exportHtml]).size;
      const previewBytes = new Blob([lastRenderResult.html]).size;
      const parsed = new DOMParser().parseFromString(overridden, "text/html");
      const parsedInner = parsed.body.querySelector("section > section");
      const parsedH1 = parsed.body.querySelector("h1");
      const overrideClassApplied = document.querySelector("#preview-pane").className.includes("heading-block") && document.querySelector("#preview-pane").className.includes("override-body-font");
      const fullHtmlDocument = exportedDocumentHtml();
      const fullHtmlDocumentWorks = /^<!doctype html><html/i.test(fullHtmlDocument) && fullHtmlDocument.includes("<title>") && fullHtmlDocument.includes("viewport");

      const stylesBeforeCustom = state.styles.length;
      openStyleBuilder();
      document.querySelector("#custom-style-name").value = "自动测试样式";
      document.querySelector("#custom-style-use").value = "自动化验证";
      document.querySelector("#custom-style-intensity").value = "先锋";
      document.querySelector("#custom-style-heading").value = "center";
      document.querySelector("#custom-style-font").value = "serif";
      document.querySelector("#custom-style-size").value = "16.5";
      document.querySelector("#custom-style-line").value = "1.9";
      document.querySelector("#custom-style-text").value = "#223344";
      document.querySelector("#custom-style-primary").value = "#335577";
      document.querySelector("#custom-style-accent").value = "#cc4455";
      document.querySelector("#custom-style-soft").value = "#ffe4e6";
      document.querySelector("#custom-style-page").value = "#f0fff4";
      document.querySelector("#custom-style-code").value = "#112233";
      generateCustomStyle({ preventDefault(){} });
      await frame();
      const customStyle = state.styles.find(style => style.name === "自动测试样式");
      const customStyleHtml = inlineArticleHtml();
      const parsedCustomStyle = new DOMParser().parseFromString(customStyleHtml, "text/html");
      const customStyleHeading = parsedCustomStyle.body.querySelector("h1");
      const customStyleHeadingCentered = customStyleHeading?.style.textAlign === "center";
      const customStyleRule = customStyleHeading?.querySelector("span");
      const customStyleCenteredRuleResponsive = customStyleRule?.style.marginLeft === "auto" && customStyleRule?.style.marginRight === "auto";
      const customStyleHasPageBackground = /background(?:-color)?:rgb\\(240, 255, 244\\)/i.test(customStyleHtml);
      const customStyleHasFont = /font-family:/i.test(customStyleHtml);
      const customStyleCreated = state.styles.length === stylesBeforeCustom + 1 && activeDoc().styleId === customStyle.id && customStyle.customVars["--custom-font"] === "var(--serif)" && customStyle.customVars["--custom-body"] === "16.5px";
      const customStyleRendered = customStyleHeadingCentered && customStyleHasPageBackground && customStyleHasFont;
      const confirmedStyleDeletion = deleteCustomStyle(customStyle.id);
      await resolveConfirmation(confirmedStyleDeletion, true);
      const customStyleDeleted = !state.styles.some(style => style.id === customStyle.id) && activeDoc().styleId === "default";

      styleTab = "built-in";
      renderStyleCards();
      const interactiveRowsAccessible = [".dir-item", ".doc-item", ".style-card"].every(selector => {
        const element = document.querySelector(selector);
        return element?.getAttribute("role") === "button" && element.tabIndex === 0 && !!element.getAttribute("aria-label");
      });
      await openRecoveryBrowser();
      const recoveryBrowserWorks = !document.querySelector("#recovery-browser").hidden && document.querySelectorAll("#recovery-point-select option").length === 1 && document.querySelector("#recovery-point-select").textContent.includes("导入前快照");
      closeRecoveryBrowser();

      setLibCollapsed(false);
      await frame();
      const libraryDrawerAccessible = document.querySelector("#library").getAttribute("role") === "dialog" && document.querySelector("#library").getAttribute("aria-modal") === "true" && document.querySelector(".main").inert && !document.querySelector("#drawer-backdrop").hidden && document.querySelector("#library").contains(document.activeElement);
      window.dispatchEvent(new KeyboardEvent("keydown", { key:"Escape", bubbles:true }));
      await frame();
      const drawerEscapeWorks = document.querySelector("#library").classList.contains("collapsed") && document.querySelector("#right").classList.contains("collapsed") && document.querySelector("#drawer-backdrop").hidden;
      setRightCollapsed(false);
      setTab("export");
      await frame();
      const narrowImportAction = document.querySelector('[data-export-action="import-md"]');
      const narrowImportWorks = !!narrowImportAction && getComputedStyle(narrowImportAction).display !== "none" && getComputedStyle(document.querySelector("#tab-export")).display !== "none";
      window.dispatchEvent(new KeyboardEvent("keydown", { key:"Escape", bubbles:true }));
      await frame();

      editor.value += "\\n\\n自动保存状态验证。";
      editor.dispatchEvent(new Event("input", { bubbles:true }));
      const savePendingStatusWorks = document.querySelector(".save-state").textContent.includes("保存中");
      await delay(750);
      const saveCompleteStatusWorks = document.querySelector(".save-state").textContent.includes("已保存");

      return {
        initialStyleCount,
        initialTemplateCount,
        colorInputValuesWork,
        templateCategoryWorks,
        templateSearchWorks,
        templateCreateWorks,
        publishingProfilesWork,
        generalProfileWorks,
        wechatProfileWorks,
        emailProfileWorks,
        base64WarningIsUnique,
        enhancedLinksWork,
        referenceLocalImageWarns,
        tildeFenceIgnoredByHtmlCheck,
        customTemplateSaved,
        customTemplateUpdated,
        customTemplateUsed,
        customTemplateDeleted,
        confirmCancelWorks,
        libraryEditorWorks,
        tagEditingWorks,
        tagDeletionWorks,
        interviewFilterWorks,
        searchWorks,
        intensityFilterWorks,
        briefHasGradient: /background-image:\\s*linear-gradient/i.test(brief) || /background:[^;]*linear-gradient/i.test(brief),
        briefHasQuoteBackground: /background(?:-color)?:rgb\\(244, 239, 226\\)/i.test(brief),
        essayHasSectionMark: essay.includes(">§<") || essay.includes("§"),
        essayHasDecorativeRule: /width:30px/i.test(essay) && /height:2px/i.test(essay),
        academicHasCounter: academic.includes(">1. <") || academic.includes("1. 第一节"),
        listKeepsHangingIndent: /text-indent:-1\\.8em/i.test(academic),
        nestedListIndentWorks,
        nestedListMarkersWork,
        brutalistHasPageBackground: /background:rgb\\(242, 243, 58\\)/i.test(brutalist),
        brutalistHasHardShadow: /box-shadow:[^;]*rgb\\(228, 61, 48\\)/i.test(brutalist),
        cyberHasDarkPage: /background:rgb\\(17, 21, 15\\)/i.test(cyber),
        cyberHasSignalColor: /rgb\\(200, 255, 50\\)/i.test(cyber),
        blueprintHasGrid: /background-image:[^;]*linear-gradient/i.test(blueprint) || /background:[^;]*linear-gradient/i.test(blueprint),
        overrideClassApplied,
        overrideTextExported: /color:rgb\\(18, 52, 86\\)/i.test(overridden),
        overridePageBgExported: /background:rgb\\(255, 243, 238\\)/i.test(overridden) || /background-color:rgb\\(255, 243, 238\\)/i.test(overridden),
        overrideStrongBgExported: /background(?:-color)?:rgb\\(254, 215, 170\\)/i.test(overridden),
        overrideParagraphBgExported: /background(?:-color)?:rgb\\(238, 247, 242\\)/i.test(overridden),
        overrideParagraphSpacingExported: /margin:[^;]*0px 0px 22px/i.test(overridden) || /margin-bottom:22px/i.test(overridden),
        overrideQuoteBgExported: /background(?:-color)?:rgb\\(221, 238, 255\\)/i.test(overridden),
        overrideCodeBgExported: /background(?:-color)?:rgb\\(17, 34, 51\\)/i.test(overridden),
        overrideTableHeaderExported: /background(?:-color)?:rgb\\(51, 68, 85\\)/i.test(overridden),
        overrideLinkColorExported: /color:rgb\\(204, 51, 102\\)/i.test(overridden),
        compatibilityUsesFinalExport: reportedExportBytes === actualExportBytes && actualExportBytes > previewBytes,
        exportHtmlParses: !!parsedInner && !!parsedH1,
        exportStyleHasFontFamily: parsedInner?.style.fontFamily.includes("Kaiti") || parsedInner?.getAttribute("style")?.includes("font-family"),
        exportHasEscapedQuotes: overridden.includes("&quot;") || !/font-family:"/.test(overridden),
        fullHtmlDocumentWorks,
        customStyleCreated,
        customStyleRendered,
        customStyleDeleted,
        customStyleHeadingCentered,
        customStyleCenteredRuleResponsive,
        customStyleHasPageBackground,
        customStyleHasFont,
        interactiveRowsAccessible,
        recoveryBrowserWorks,
        libraryDrawerAccessible,
        drawerEscapeWorks,
        narrowImportWorks,
        savePendingStatusWorks,
        saveCompleteStatusWorks,
        samples: {
          brief: brief.slice(0, 900),
          essay: essay.slice(0, 900),
          academic: academic.slice(0, 1800),
          overridden: overridden.slice(0, 1200),
          customStyle: customStyleHtml.slice(0, 1400)
        }
      };
      } catch (error) {
        return { executionError:error?.stack || String(error) };
      }
    })()
    `);
  } catch (error) {
    console.error(JSON.stringify({ rendererMessages:messages }, null, 2));
    throw error;
  }

  let storagePrefersNewerFile = false;
  if (!result.executionError) {
    libraryLoadPayload = {
      version:2,
      savedAt:"2029-01-01T00:00:00.000Z",
      revision:200,
      state:{
        dirs:[{ id:"all", name:"全部文档", system:true }, { id:"uncategorized", name:"未分类", system:true }],
        tags:[],
        docs:[{ id:"file-new", title:"文件新版本", manualTitle:true, markdown:"# 文件新版本\n\n来自 revision 较新的桌面文件备份。", directoryId:"uncategorized", tagIds:[], styleId:"default", targetId:"general", createdAt:"2029-01-01T00:00:00.000Z", updatedAt:"2029-01-01T00:00:00.000Z" }],
        styles:[],
        customTemplates:[],
        favoriteStyles:{},
        activeDocId:"file-new",
        activeDirId:"all",
        activeTagIds:[],
        search:"",
        sort:"updated",
      },
    };
    storagePrefersNewerFile = await win.webContents.executeJavaScript(`
      (async () => {
        const staleState = normalizeState({
          dirs:[{ id:"all", name:"全部文档", system:true }, { id:"uncategorized", name:"未分类", system:true }],
          tags:[],
          docs:[{ id:"browser-old", title:"浏览器旧版本", manualTitle:true, markdown:"# 浏览器旧版本", directoryId:"uncategorized", tagIds:[], styleId:"default", targetId:"general", createdAt:"2029-01-01T00:00:00.000Z", updatedAt:"2029-01-01T00:00:00.000Z" }],
          styles:[], activeDocId:"browser-old", activeDirId:"all", activeTagIds:[], search:"", sort:"updated"
        });
        const staleRecord = { version:2, savedAt:"2029-01-01T00:00:00.000Z", revision:100, state:staleState };
        state = staleState;
        browserStorageRecord = staleRecord;
        storageHadLocalState = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(staleRecord));
        editor.value = activeDoc().markdown;
        renderAll();
        await restoreElectronLibraryBackup();
        const syncedRecord = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return activeDoc().id === "file-new" && syncedRecord?.state?.activeDocId === "file-new";
      })()
    `);
  }
  const latestSavePayload = savedLibraryPayloads.at(-1);
  const storageMetadataAligned = !!latestSavePayload && typeof latestSavePayload.savedAt === "string" && Number.isFinite(latestSavePayload.revision) && Array.isArray(latestSavePayload.state?.docs);

  const failures = [];
  if (result.executionError) failures.push(`renderer execution error: ${result.executionError}`);
  if (result.initialStyleCount < 30) failures.push(`expected at least 30 built-in styles, got ${result.initialStyleCount}`);
  if (result.initialTemplateCount < 22) failures.push(`expected at least 22 document templates, got ${result.initialTemplateCount}`);
  if (!result.colorInputValuesWork) failures.push("rgb/hsl colors were not converted for HTML color inputs");
  if (!result.templateCategoryWorks) failures.push("template category filter did not show decision memo");
  if (!result.templateSearchWorks) failures.push("template search did not find research notes");
  if (!result.templateCreateWorks) failures.push("document template did not create a styled and tagged document");
  if (!result.publishingProfilesWork) failures.push("publishing target selector did not expose three profiles");
  if (!result.generalProfileWorks) failures.push("general publishing profile emitted platform-specific warnings");
  if (!result.wechatProfileWorks) failures.push("WeChat publishing profile missed title or external-image warnings");
  if (!result.emailProfileWorks) failures.push("email publishing profile missed remote-image warnings");
  if (!result.base64WarningIsUnique) failures.push("base64 images produced duplicate remote-image warnings");
  if (!result.enhancedLinksWork) failures.push("mailto, telephone, or anchor links were not preserved");
  if (!result.referenceLocalImageWarns) failures.push("reference-style local images did not trigger a compatibility warning");
  if (!result.tildeFenceIgnoredByHtmlCheck) failures.push("tilde-fenced code was incorrectly treated as dangerous HTML");
  if (!result.customTemplateSaved) failures.push("personal template was not saved with metadata");
  if (!result.customTemplateUpdated) failures.push("personal template metadata or content refresh failed");
  if (!result.customTemplateUsed) failures.push("personal template did not create a document");
  if (!result.customTemplateDeleted) failures.push("personal template deletion failed");
  if (!result.confirmCancelWorks) failures.push("app confirmation cancel path did not preserve data");
  if (!result.libraryEditorWorks) failures.push("in-app document, directory, or tag editor did not persist changes");
  if (!result.tagEditingWorks) failures.push("tag rename or recolor did not persist");
  if (!result.tagDeletionWorks) failures.push("tag deletion did not clean document and filter references");
  if (!result.interviewFilterWorks) failures.push("style category filter did not show interview styles");
  if (!result.searchWorks) failures.push("style search did not find black-white style");
  if (!result.intensityFilterWorks) failures.push("style intensity filter did not isolate experimental themes");
  if (!result.briefHasGradient) failures.push("brief strong gradient was not exported");
  if (!result.briefHasQuoteBackground) failures.push("brief quote background was not exported");
  if (!result.essayHasSectionMark) failures.push("essay h2 ::before mark was not materialized");
  if (!result.essayHasDecorativeRule) failures.push("essay h1 ::after rule was not materialized");
  if (!result.academicHasCounter) failures.push("academic CSS counter was not materialized");
  if (!result.listKeepsHangingIndent) failures.push("list hanging indentation was not preserved");
  if (!result.nestedListIndentWorks) failures.push("nested list indentation was not preserved in copied rich text");
  if (!result.nestedListMarkersWork) failures.push("nested ordered or unordered list markers were lost in copied rich text");
  if (!result.brutalistHasPageBackground) failures.push("brutalist page background was not exported");
  if (!result.brutalistHasHardShadow) failures.push("brutalist hard shadow was not exported");
  if (!result.cyberHasDarkPage) failures.push("cyber dark page background was not exported");
  if (!result.cyberHasSignalColor) failures.push("cyber signal color was not exported");
  if (!result.blueprintHasGrid) failures.push("blueprint grid background was not exported");
  if (!result.overrideClassApplied) failures.push("style override classes were not applied");
  if (!result.overrideTextExported) failures.push("text color override was not exported");
  if (!result.overridePageBgExported) failures.push("page background override was not exported");
  if (!result.overrideStrongBgExported) failures.push("strong background override was not exported");
  if (!result.overrideParagraphBgExported) failures.push("paragraph background override was not exported");
  if (!result.overrideParagraphSpacingExported) failures.push("paragraph spacing override was not exported");
  if (!result.overrideQuoteBgExported) failures.push("quote background override was not exported");
  if (!result.overrideCodeBgExported) failures.push("code background override was not exported");
  if (!result.overrideTableHeaderExported) failures.push("table header override was not exported");
  if (!result.overrideLinkColorExported) failures.push("link color override was not exported");
  if (!result.compatibilityUsesFinalExport) failures.push("compatibility stats did not use final inline export HTML");
  if (!result.exportHtmlParses) failures.push("exported HTML did not parse into expected wrapper structure");
  if (!result.exportStyleHasFontFamily) failures.push("exported style attribute lost font-family");
  if (!result.exportHasEscapedQuotes) failures.push("exported style attribute contains unescaped font quotes");
  if (!result.fullHtmlDocumentWorks) failures.push("downloaded HTML is not a complete titled document");
  if (!result.customStyleCreated) failures.push("visual custom style editor did not persist full settings");
  if (!result.customStyleRendered) failures.push("custom style font, heading, or page background was not rendered/exported");
  if (!result.customStyleDeleted) failures.push("custom style deletion did not migrate active documents");
  if (!result.customStyleCenteredRuleResponsive) failures.push("centered decorative rules were exported with viewport-specific pixel margins");
  if (!result.interactiveRowsAccessible) failures.push("dynamic document, directory, or style rows are not keyboard accessible");
  if (!result.recoveryBrowserWorks) failures.push("desktop recovery history did not render available snapshots");
  if (!result.libraryDrawerAccessible) failures.push("narrow library drawer did not expose modal state or move focus");
  if (!result.drawerEscapeWorks) failures.push("Escape did not close the narrow-screen drawer");
  if (!result.narrowImportWorks) failures.push("Markdown import was unavailable in the narrow export drawer");
  if (!result.savePendingStatusWorks || !result.saveCompleteStatusWorks) failures.push("save status did not transition from pending to saved");
  if (!storagePrefersNewerFile) failures.push("newer Electron file backup did not replace a stale browser copy");
  if (!storageMetadataAligned) failures.push("browser and Electron saves did not share timestamp and revision metadata");
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
