(function initThemeCatalog(global) {
  const themes = [
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

  const legacyReplacements = {
    plain:"default", blue:"tech", terminal:"tech", violet:"column", night:"essay",
    news:"mag", biz:"brief", gov:"notice", handbook:"checklist",
  };

  const thumbnails = {
    default:`<div class="thumb t-default"><div class="tt">从 Markdown 到公众号</div><div class="pp">创作者经常用 Markdown 写文章，但公众号后台是富文本编辑器。</div><div class="qb">一句话：能进公众号的 HTML，是一个相当受限的子集。</div><div class="pp">• 移除 script 标签</div><div class="pp">• 内联 CSS</div><div class="cd">renderWeChatHtml(ast)</div></div>`,
    product:`<div class="thumb t-product"><div class="tt">产品更新</div><div class="pp">v2.4 发布：编辑器、样式库、复制链路。</div><div class="qb">新增：文档标签 / 目录 / 样式预览</div><div class="cd">CHANGELOG</div></div>`,
    brief:`<div class="thumb t-brief"><div class="tt">商业简报</div><div class="pp">本周核心结论：转化率提升，留存稳定。</div><div class="tbl"><span>指标</span><span>变化</span><span>判断</span></div><div class="tbl"><span>留存</span><span>+4%</span><span>健康</span></div></div>`,
    course:`<div class="thumb t-course"><div class="tt">课程讲义</div><div class="pp">01 概念：先建立心智模型。</div><div class="qb">练习：用自己的话复述这个定义。</div><div class="cd">step 1 / 3</div></div>`,
    checklist:`<div class="thumb t-checklist"><div class="tt">清单卡片</div><div class="pp">☐ 目标清楚</div><div class="pp">☐ 输入完整</div><div class="qb">适合 SOP、复盘、工具清单。</div></div>`,
    campaign:`<div class="thumb t-campaign"><div class="tt">新品限时发布</div><div class="pp">给高频写作者的一套排版工具。</div><div class="qb">今日开放：样式库 + 一键复制</div><div class="cd">CTA</div></div>`,
    column:`<div class="thumb t-column"><div class="tt">个人专栏</div><div class="pp">今天想谈一个经常被忽略的问题。</div><div class="qb">观点不怕锋利，排版要稳。</div></div>`,
    tech:`<div class="thumb t-tech"><div class="tt">从 Markdown 到公众号</div><div class="pp">公众号编辑器对 HTML 兼容性有几个规则。</div><div class="qb">能进公众号的 HTML，是一个相当受限的子集。</div><div class="cd">function render(ast){...}</div></div>`,
    essay:`<div class="thumb t-essay"><div class="tt">从 Markdown 到公众号</div><div class="pp" style="text-align:left">创作者经常用 Markdown 写文章，但公众号后台是富文本编辑器。</div><div class="qb">能进公众号的 HTML，是一个相当受限的子集。</div></div>`,
    mag:`<div class="thumb t-mag"><div class="tt">从 Markdown<br>到公众号</div><div class="hh">— 排版方法论</div><div class="qb">能进公众号的 HTML，是一个受限的子集。</div></div>`,
    notice:`<div class="thumb t-notice"><div class="tt">关于排版规范的通知</div><div class="pp">请各位作者统一使用稳定样式。</div><div class="qb">重点事项：复制前完成兼容性检查。</div></div>`,
    academic:`<div class="thumb t-academic"><div class="tt">从 Markdown 到公众号</div><div class="pp">编辑器对 HTML 兼容性有限。</div><div class="qb">能进公众号的 HTML 是子集。</div></div>`,
    report:`<div class="thumb t-report"><div class="tt">数据研报</div><div class="pp">核心指标：增长、留存、转化。</div><div class="tbl"><span>指标</span><span>本周</span><span>判断</span></div><div class="qb">结论：结构比装饰更重要。</div></div>`,
    interview:`<div class="thumb t-interview"><div class="tt">访谈问答</div><div class="pp"><b>Q</b> 为什么要做这件事？</div><div class="qb"><b>A</b> 因为写作者需要更稳定的复制链路。</div></div>`,
    newsletter:`<div class="thumb t-newsletter"><div class="tt">本周通讯</div><div class="pp">三条新闻，一个判断。</div><div class="qb">阅读时间：5 分钟</div><div class="cd">Issue 018</div></div>`,
    mono:`<div class="thumb t-mono"><div class="tt">黑白锋利</div><div class="pp">观点要短，排版要硬。</div><div class="qb">一句话放在这里，直接给判断。</div></div>`,
    soft:`<div class="thumb t-soft"><div class="tt">温柔手账</div><div class="pp">今天记录一个很小但重要的变化。</div><div class="qb">适合复盘、生活方式和轻阅读。</div></div>`,
    nature:`<div class="thumb t-nature"><div class="tt">自然笔记</div><div class="pp">从一个观察开始，慢慢解释机制。</div><div class="qb">知识需要一点呼吸感。</div></div>`,
    classic:`<div class="thumb t-classic"><div class="tt">古典书信</div><div class="pp">见字如面，先把气韵放稳。</div><div class="qb">适合书评、散文、传统文化内容。</div></div>`,
    deck:`<div class="thumb t-deck"><div class="tt">路演提案</div><div class="pp">问题 / 方案 / 进展 / 下一步。</div><div class="qb">重点：一个段落只讲一个结论。</div><div class="cd">Pitch Deck</div></div>`,
  };

  function validateCatalog() {
    const ids = new Set();
    themes.forEach(theme => {
      if (!/^[a-z][a-z0-9-]*$/.test(theme.id) || ids.has(theme.id)) throw new Error(`Invalid or duplicate theme id: ${theme.id}`);
      if (theme.cls !== `theme-${theme.id}`) throw new Error(`Theme class does not match id: ${theme.id}`);
      if (!theme.name || !theme.cat || !theme.uc) throw new Error(`Theme metadata is incomplete: ${theme.id}`);
      if (!Array.isArray(theme.swatches) || theme.swatches.length !== 4 || theme.swatches.some(color => !/^#[0-9a-f]{6}$/i.test(color))) throw new Error(`Theme swatches are invalid: ${theme.id}`);
      if (!thumbnails[theme.id]) throw new Error(`Theme thumbnail is missing: ${theme.id}`);
      ids.add(theme.id);
    });
    Object.entries(legacyReplacements).forEach(([legacyId, replacementId]) => {
      if (!legacyId || !ids.has(replacementId)) throw new Error(`Invalid legacy theme replacement: ${legacyId}`);
    });
  }

  validateCatalog();
  global.MDStyleThemeCatalog = Object.freeze({
    themes:Object.freeze(themes.map(theme => Object.freeze({ ...theme, swatches:Object.freeze([...theme.swatches]) }))),
    legacyReplacements:Object.freeze({ ...legacyReplacements }),
    thumbnails:Object.freeze({ ...thumbnails }),
  });
})(globalThis);
