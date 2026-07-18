(function initThemeCatalog(global) {
  const themes = [
    { id:"default", cls:"theme-default", name:"默认简洁", cat:"通用", intensity:"稳健", uc:"克制耐读，适合大多数文章", swatches:["#2D2D2A","#5C8A7D","#F7F6F1","#26262B"], fav:true },
    { id:"product", cls:"theme-product", name:"产品更新", cat:"产品", intensity:"鲜明", uc:"版本日志、功能发布、路线图", swatches:["#123D5A","#2F8F9D","#E7F4F5","#0E2433"] },
    { id:"brief", cls:"theme-brief", name:"商业简报", cat:"商业", intensity:"稳健", uc:"结论先行，数据和表格更清晰", swatches:["#202124","#B88A2A","#F4EFE2","#0F1115"], fav:true },
    { id:"course", cls:"theme-course", name:"课程讲义", cat:"课程", intensity:"鲜明", uc:"知识点、步骤和练习题分层", swatches:["#274C3A","#E0A92F","#F4F1E6","#1E3329"], fav:true },
    { id:"checklist", cls:"theme-checklist", name:"清单卡片", cat:"清单", intensity:"鲜明", uc:"SOP、方法论、工具清单", swatches:["#18233A","#FFB84D","#EFF3F8","#283B5B"] },
    { id:"campaign", cls:"theme-campaign", name:"品牌营销", cat:"营销", intensity:"鲜明", uc:"活动发布、转化文案、品牌稿", swatches:["#8F2737","#F05A48","#FFF0E8","#32161B"] },
    { id:"column", cls:"theme-column", name:"个人专栏", cat:"专栏", intensity:"稳健", uc:"个人 IP、观点输出、随笔", swatches:["#2B3A31","#9C6F43","#F5F0E7","#DFCDB8"] },
    { id:"essay", cls:"theme-essay", name:"深度长文", cat:"长文", intensity:"稳健", uc:"严肃阅读，引用和章节稳定", swatches:["#2A2926","#8B6A3A","#C9A57A","#FBF8F1"] },
    { id:"academic", cls:"theme-academic", name:"学术笔记", cat:"笔记", intensity:"稳健", uc:"读书、论文、引用和编号", swatches:["#1A1A18","#5C4A2B","#F5F2EA","#C9A57A"] },
    { id:"tech", cls:"theme-tech", name:"科技教程", cat:"技术", intensity:"鲜明", uc:"代码块、步骤、表格更突出", swatches:["#0B3D2E","#5C8A7D","#F0F5F2","#0E1A17"] },
    { id:"mag", cls:"theme-mag", name:"视觉杂志", cat:"图文", intensity:"鲜明", uc:"图片、引用、标题更有视觉层次", swatches:["#3B2E18","#7A4A18","#D9C9A0","#FBF6EB"] },
    { id:"notice", cls:"theme-notice", name:"正式通知", cat:"通知", intensity:"稳健", uc:"公告、声明、正式说明", swatches:["#A23E2E","#1A1A18","#F4E3DE","#F5F0E6"] },
    { id:"report", cls:"theme-report", name:"数据研报", cat:"商业", intensity:"稳健", uc:"指标、结论、表格和分析报告", swatches:["#1B2A41","#3E6E8E","#EAF1F6","#101820"] },
    { id:"interview", cls:"theme-interview", name:"访谈问答", cat:"访谈", intensity:"鲜明", uc:"人物访谈、圆桌纪要、问答稿", swatches:["#243B33","#D17845","#F7ECE3","#13231E"] },
    { id:"newsletter", cls:"theme-newsletter", name:"邮件通讯", cat:"媒体", intensity:"鲜明", uc:"Newsletter、周报、信息简报", swatches:["#23324A","#5B78A7","#EEF3FA","#1D2638"] },
    { id:"mono", cls:"theme-mono", name:"黑白锋利", cat:"观点", intensity:"先锋", uc:"短评、态度稿、犀利观点", swatches:["#111111","#6F6F6F","#F3F3F0","#222222"] },
    { id:"soft", cls:"theme-soft", name:"温柔手账", cat:"生活", intensity:"稳健", uc:"生活方式、复盘、轻阅读", swatches:["#5B4A44","#D49A8A","#FFF3EE","#7C5B52"] },
    { id:"nature", cls:"theme-nature", name:"自然笔记", cat:"科普", intensity:"稳健", uc:"科普、观察、自然与健康主题", swatches:["#244837","#7E9B5F","#F1F5E8","#183126"] },
    { id:"classic", cls:"theme-classic", name:"古典书信", cat:"文化", intensity:"稳健", uc:"书评、散文、传统文化内容", swatches:["#4A2F22","#B56A35","#F8EFE2","#2C1D16"] },
    { id:"deck", cls:"theme-deck", name:"路演提案", cat:"商业", intensity:"鲜明", uc:"创业计划、方案陈述、项目提案", swatches:["#14213D","#FCA311","#EEF2F7","#0B1324"] },
    { id:"brutalist", cls:"theme-brutalist", name:"粗野宣言", cat:"观点", intensity:"先锋", uc:"高对比、硬边框、适合宣言和态度稿", swatches:["#111111","#E43D30","#F2F33A","#F7F3E8"] },
    { id:"editorial", cls:"theme-editorial", name:"红色头版", cat:"媒体", intensity:"先锋", uc:"报纸头版、深度报道、新闻评论", swatches:["#151412","#C9272C","#F2EDE1","#3E3B36"] },
    { id:"bauhaus", cls:"theme-bauhaus", name:"包豪斯几何", cat:"设计", intensity:"先锋", uc:"原色几何、强结构、设计与建筑内容", swatches:["#111111","#D9362B","#F1D53B","#1857A4"] },
    { id:"cyber", cls:"theme-cyber", name:"赛博信号", cat:"科技", intensity:"先锋", uc:"暗色信号板、产品发布、未来议题", swatches:["#E8F7D4","#C8FF32","#11150F","#FF4FA3"] },
    { id:"luxury", cls:"theme-luxury", name:"黑金典藏", cat:"品牌", intensity:"鲜明", uc:"高端品牌、人物特写、精品内容", swatches:["#E9DFC9","#B59655","#17130F","#6C5940"] },
    { id:"riso", cls:"theme-riso", name:"孔版海报", cat:"艺术", intensity:"先锋", uc:"套色错位、文化活动、独立出版", swatches:["#1747A6","#F04A3A","#F4EBD9","#24211D"] },
    { id:"comic", cls:"theme-comic", name:"漫画分镜", cat:"创意", intensity:"先锋", uc:"厚描边、对白框、轻松科普和故事", swatches:["#181713","#F2C94C","#FFF6D8","#E64736"] },
    { id:"blueprint", cls:"theme-blueprint", name:"工程蓝图", cat:"工程", intensity:"先锋", uc:"网格底稿、技术 RFC、系统设计文档", swatches:["#E9F7FF","#66D9EF","#103C66","#082642"] },
    { id:"memphis", cls:"theme-memphis", name:"孟菲斯派对", cat:"创意", intensity:"先锋", uc:"跳色图形、创意提案、年轻品牌内容", swatches:["#202124","#F45B8A","#FFF8E7","#159C99"] },
    { id:"festival", cls:"theme-festival", name:"节庆招贴", cat:"活动", intensity:"先锋", uc:"节庆发布、活动邀请、文化宣传", swatches:["#301B14","#C83C2C","#F4E4C4","#E0A72E"] },
  ];

  const visualFamilies = {
    "清爽通用":["default", "soft", "nature"],
    "长文阅读":["column", "essay", "academic", "classic"],
    "商务专业":["product", "brief", "checklist", "notice", "report", "deck"],
    "知识教程":["course", "tech", "blueprint"],
    "媒体叙事":["mag", "interview", "newsletter", "editorial"],
    "品牌活动":["campaign", "luxury", "festival"],
    "先锋实验":["mono", "brutalist", "bauhaus", "cyber", "riso", "comic", "memphis"],
  };
  const familyByThemeId = new Map();
  Object.entries(visualFamilies).forEach(([family, ids]) => ids.forEach(id => {
    if (familyByThemeId.has(id)) throw new Error(`Theme belongs to multiple visual families: ${id}`);
    familyByThemeId.set(id, family);
  }));
  themes.forEach(theme => { theme.family = familyByThemeId.get(theme.id) || ""; });

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
    brutalist:`<div class="thumb t-brutalist"><div class="tt">拒绝平庸</div><div class="pp">观点必须被看见。</div><div class="qb">结论先于装饰，冲突制造记忆。</div><div class="cd">MANIFESTO 01</div></div>`,
    editorial:`<div class="thumb t-editorial"><div class="hh">THE DAILY EDIT</div><div class="tt">今天最重要的判断</div><div class="pp">事实、现场与解释，构成一篇报道。</div><div class="qb">独家观察 / 深度报道</div></div>`,
    bauhaus:`<div class="thumb t-bauhaus"><div class="shape-row"><i></i><i></i><i></i></div><div class="tt">形式追随功能</div><div class="pp">结构 / 比例 / 秩序</div><div class="qb">BAUHAUS NOTE</div></div>`,
    cyber:`<div class="thumb t-cyber"><div class="hh">SIGNAL // 2049</div><div class="tt">未来已经接入</div><div class="pp">系统状态：ONLINE</div><div class="qb">高能信号正在进入正文。</div><div class="cd">RUN_PROTOCOL()</div></div>`,
    luxury:`<div class="thumb t-luxury"><div class="hh">EDITION No. 01</div><div class="tt">黑金典藏</div><div class="pp">克制、质感与一段值得慢读的文字。</div><div class="qb">A quiet statement.</div></div>`,
    riso:`<div class="thumb t-riso"><div class="tt">孔版文化周</div><div class="pp">红蓝套色 / 手工质感</div><div class="qb">SAT · 14:00 · 城市展厅</div><div class="cd">RISO PRINT</div></div>`,
    comic:`<div class="thumb t-comic"><div class="tt">今天发生了什么？</div><div class="pp">第一格：问题出现。</div><div class="qb">“原来答案在这里！”</div><div class="cd">TO BE CONTINUED</div></div>`,
    blueprint:`<div class="thumb t-blueprint"><div class="hh">SPEC / RFC-018</div><div class="tt">系统设计蓝图</div><div class="pp">输入 → 处理 → 输出</div><div class="qb">约束：稳定、可观测、可恢复</div><div class="cd">STATUS: REVIEW</div></div>`,
    memphis:`<div class="thumb t-memphis"><div class="shape-row"><i></i><i></i><i></i></div><div class="tt">创意不走直线</div><div class="pp">大胆跳色，轻松表达。</div><div class="qb">IDEA / PLAY / MAKE</div></div>`,
    festival:`<div class="thumb t-festival"><div class="hh">二〇二六 · 夏</div><div class="tt">城市文化节</div><div class="pp">展览 / 市集 / 演出</div><div class="qb">本周六，和有趣的人见面。</div></div>`,
  };

  function validateCatalog() {
    const ids = new Set();
    const intensities = new Set(["稳健", "鲜明", "先锋"]);
    themes.forEach(theme => {
      if (!/^[a-z][a-z0-9-]*$/.test(theme.id) || ids.has(theme.id)) throw new Error(`Invalid or duplicate theme id: ${theme.id}`);
      if (theme.cls !== `theme-${theme.id}`) throw new Error(`Theme class does not match id: ${theme.id}`);
      if (!theme.name || !theme.cat || !theme.family || !theme.uc || !intensities.has(theme.intensity)) throw new Error(`Theme metadata is incomplete: ${theme.id}`);
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
    families:Object.freeze(Object.keys(visualFamilies)),
    legacyReplacements:Object.freeze({ ...legacyReplacements }),
    thumbnails:Object.freeze({ ...thumbnails }),
  });
})(globalThis);
