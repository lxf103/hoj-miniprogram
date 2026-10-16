// app.js —— 应用入口：配置后端地址 + 冷启动恢复登录态。
var store = require('./utils/store.js');

App({
  globalData: {
    user: null,   // 来自 GET /api/me：{ user, nick, roles, portal, home }
    token: '',    // 预留（当前后端走 cookie 会话，没有 token）
    cookie: '',   // PHPSESSID，登录时抓 Set-Cookie 得到，之后每个请求手动带

    // ⚠️ 演示模式开关
    //   true  —— 使用内置样例数据，完全不联网。体验版/给老师演示时用这个。
    //   false —— 连真实后端（见下面的 baseUrl）。本地开发用这个。
    //
    // 体验版必须为 true：微信要求 request 域名是 https + 已备案 + 不能用 IP，
    // 而真实后端是内网 http://10.249.12.21:3100，体验版连不上。
    // 注意：这里改的是本地源码，已经上传的体验版是快照，不受影响。
    demoMode: false,

    // 真实后端地址（demoMode=false 时才用）。
    // 开发：微信开发者工具里需要勾选「不校验合法域名」（project.config.json 已设 urlCheck:false）。
    // 发布：必须是 https 且域名已备案，否则真机请求会被拦。
    baseUrl: 'http://10.249.12.21:3100'
  },

  onLaunch() {
    // 冷启动把上次登录的用户和 cookie 读回来，实现「记住登录」
    store.restore();
  }
});
