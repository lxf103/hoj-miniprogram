// pages/login/login.js —— 真登录：POST /api/account/login 拿会话，再 GET /api/me 取角色。
var api = require('../../utils/api.js');
var store = require('../../utils/store.js');

var KEY_LAST_USER = 'hoj_last_username';

// tabBar 页面必须用 switchTab 跳
var TAB_PAGES = [
  '/pages/overview/overview',
  '/pages/courses/courses',
  '/pages/problems/problems',
  '/pages/submissions/submissions',
  '/pages/mine/mine'
];

Page({
  data: {
    username: '',
    password: '',
    logging: false,
    redirect: '',
    err: ''
  },

  onLoad(options) {
    var redirect = (options && options.redirect) ? decodeURIComponent(options.redirect) : '';
    // 记住上次登录的用户名，省得每次重敲（密码不落地存储）
    var last = '';
    try { last = wx.getStorageSync(KEY_LAST_USER) || ''; } catch (e) {}
    this.setData({ redirect: redirect, username: last });
  },

  onUsername(e) { this.setData({ username: e.detail.value, err: '' }); },
  onPassword(e) { this.setData({ password: e.detail.value, err: '' }); },

  doLogin() {
    if (this.data.logging) return;
    var username = (this.data.username || '').trim();
    var password = this.data.password || '';

    if (!username || !password) {
      this.setData({ err: '请输入用户名和密码' });
      return;
    }

    this.setData({ logging: true, err: '' });

    api.login(username, password).then(() => {
      // 登录成功，PHPSESSID 已由 request 层存下
      try { wx.setStorageSync(KEY_LAST_USER, username); } catch (e) {}

      // 拉一次真实用户资料和角色
      return api.me().then((u) => {
        store.setUser(u || { user: username });
      }).catch(() => {
        // /api/me 失败不该挡住登录，先落一个最小用户
        store.setUser({ user: username, roles: [] });
      });
    }).then(() => {
      wx.showToast({ title: '登录成功 · ' + store.roleText(), icon: 'none' });
      setTimeout(() => this.jump(), 500);
    }).catch((e) => {
      var msg = (e && e.message) || '登录失败';
      if (e && (e.statusCode === 400 || e.statusCode === 401 || e.statusCode === 403)) {
        msg = '用户名或密码错误';
      }
      this.setData({ err: msg });
    }).then(() => {
      this.setData({ logging: false });
    });
  },

  /** 登录后跳转：有 redirect 回原页，否则回总览 */
  jump() {
    var target = this.data.redirect;
    if (!target || target.indexOf('/pages/login/login') === 0) {
      wx.switchTab({ url: '/pages/overview/overview' });
      return;
    }
    var isTab = TAB_PAGES.some(function (p) { return target.indexOf(p) === 0; });
    if (isTab) wx.switchTab({ url: target.split('?')[0] });
    else wx.redirectTo({ url: target });
  },

  goBack() {
    var pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/overview/overview' });
  }
});
