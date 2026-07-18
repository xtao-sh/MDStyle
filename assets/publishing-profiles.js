(function initPublishingProfiles(global) {
  "use strict";

  const profiles = [
    {
      id:"general",
      name:"通用富文本",
      shortName:"通用",
      description:"适合常见网页富文本编辑器；粘贴后仍应检查图片、表格和标题层级。",
      titleMax:0,
      remoteImagePolicy:"allow",
      tableMaxColumns:6,
      longCodeLines:32,
      maxHtmlBytes:1500000,
      readyMessage:"当前内容可以复制到目标富文本编辑器继续预览。",
      readySuggestion:"粘贴后检查图片、表格和字体是否被目标平台重新处理。",
    },
    {
      id:"wechat",
      name:"微信公众号",
      shortName:"公众号",
      description:"按微信公众号编辑器的保守规则检查标题、图片来源、表格和 HTML 体积。",
      titleMax:32,
      remoteImagePolicy:"wechat",
      tableMaxColumns:4,
      longCodeLines:22,
      maxHtmlBytes:900000,
      readyMessage:"当前内容可以复制到公众号编辑器继续校验。",
      readySuggestion:"发布前仍建议在公众号后台进行手机预览。",
    },
    {
      id:"email",
      name:"邮件 / Newsletter",
      shortName:"邮件",
      description:"面向邮件与 Newsletter 编辑器，重点检查远程图片、复杂表格和正文体积。",
      titleMax:0,
      remoteImagePolicy:"email",
      tableMaxColumns:6,
      longCodeLines:30,
      maxHtmlBytes:1000000,
      readyMessage:"当前内容可以复制到邮件或 Newsletter 编辑器继续预览。",
      readySuggestion:"发送前分别检查桌面与移动端邮件客户端的显示效果。",
    },
  ];

  const profileById = new Map(profiles.map(profile => [profile.id, profile]));
  function get(id) {
    return profileById.get(id) || profileById.get("general");
  }
  function normalizeId(id, fallback="general") {
    return profileById.has(id) ? id : (profileById.has(fallback) ? fallback : "general");
  }

  global.MDStylePublishingProfiles = Object.freeze({
    profiles:Object.freeze(profiles.map(profile => Object.freeze({ ...profile }))),
    ids:Object.freeze(profiles.map(profile => profile.id)),
    get,
    normalizeId,
  });
})(globalThis);
