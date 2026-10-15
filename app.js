// app.js —— 应用入口：配置后端地址 + 冷启动恢复登录态。
var store = require('./utils/store.js');

App({
  globalData: {
    user: null,   // 来自 GET /api/me：{ user, nick, roles, portal, home }
    token: '',    // 预留（当前后端走 cookie 会话，没有 token）
    cookie: '',   // PHPSESSID，登录时抓 Set-Cookie 得到，之后每个请求手动带

    // 后端地址。
    // 开发：微信开发者工具里需要勾选「不校验合法域名」（project.config.json 已设 urlCheck:false）。
    // 发布：必须是 https 且域名已备案，否则真机请求会被拦。
    baseUrl: 'http://10.249.12.21:3100'
  },

  onLaunch() {
    // 冷启动把上次登录的用户和 cookie 读回来，实现「记住登录」
    store.restore();
  }
});
