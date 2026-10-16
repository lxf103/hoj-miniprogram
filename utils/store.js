// utils/store.js —— 登录态与用户信息的唯一读写入口。
// 所有页面都从这里拿 user / 判断角色，别再直接翻 app.globalData，
// 免得以后改存储方式要满项目改。

var KEY_USER = 'hoj_user';
var KEY_COOKIE = 'hoj_cookie';

var ROLE_TEXT = {
  admin: '管理员',
  teacher: '教师',
  student: '学生',
  ta: '助教'
};

function app() {
  return getApp();
}

/** 是否处于演示模式（内置样例数据，不联网）。开关在 app.js 的 globalData.demoMode */
function isDemo() {
  try { return !!app().globalData.demoMode; } catch (e) { return false; }
}

/** 当前用户对象（含 user/roles/portal 等，来自 /api/me） */
function getUser() {
  return app().globalData.user || null;
}

function getRoles() {
  var u = getUser();
  return (u && u.roles) || [];
}

function hasRole(r) {
  return getRoles().indexOf(r) > -1;
}

/** 教师视角：管理员和教师都算 */
function isTeacher() {
  return hasRole('teacher') || hasRole('admin');
}

function isLogged() {
  return !!getUser();
}

/** 角色中文名，用于界面展示 */
function roleText() {
  var roles = getRoles();
  if (roles.indexOf('admin') > -1) return '管理员';
  if (roles.indexOf('teacher') > -1) return '教师';
  if (roles.indexOf('ta') > -1) return '助教';
  if (roles.indexOf('student') > -1) return '学生';
  return '未登录';
}

/** 展示名：优先昵称，其次账号 */
function displayName() {
  var u = getUser();
  if (!u) return '';
  return u.nick || u.name || u.user || u.username || '';
}

/** 头像文字（取展示名首字） */
function avatarText() {
  var n = displayName();
  return n ? n.charAt(0).toUpperCase() : '?';
}

/** 登录成功后写入（cookie 由 request 层负责持久化，这里只管用户） */
function setUser(user) {
  var a = app();
  a.globalData.user = user || null;
  try {
    if (user) wx.setStorageSync(KEY_USER, user);
    else wx.removeStorageSync(KEY_USER);
  } catch (e) {}
}

function setCookie(cookie) {
  var a = app();
  a.globalData.cookie = cookie || '';
  try {
    if (cookie) wx.setStorageSync(KEY_COOKIE, cookie);
    else wx.removeStorageSync(KEY_COOKIE);
  } catch (e) {}
}

function getCookie() {
  return app().globalData.cookie || '';
}

/** 冷启动恢复 */
function restore() {
  var a = app();
  try {
    var u = wx.getStorageSync(KEY_USER);
    if (u) a.globalData.user = u;
    var c = wx.getStorageSync(KEY_COOKIE);
    if (c) a.globalData.cookie = c;
  } catch (e) {}
  return a.globalData.user;
}

/** 退出登录 */
function clear() {
  setUser(null);
  setCookie('');
  var a = app();
  a.globalData.token = '';
}

/**
 * 未登录时跳登录页。带 redirect 参数，登录完能回到原来想去的页面。
 */
function toLogin(redirect) {
  var url = '/pages/login/login';
  if (redirect) url += '?redirect=' + encodeURIComponent(redirect);
  wx.navigateTo({ url: url });
}

/** 取当前页面路径，用于登录后跳回 */
function currentPath() {
  try {
    var pages = getCurrentPages();
    if (!pages.length) return '';
    var p = pages[pages.length - 1];
    var q = p.options && Object.keys(p.options).length
      ? '?' + Object.keys(p.options).map(function (k) {
          return k + '=' + encodeURIComponent(p.options[k]);
        }).join('&')
      : '';
    return '/' + p.route + q;
  } catch (e) {
    return '';
  }
}

module.exports = {
  ROLE_TEXT: ROLE_TEXT,
  isDemo: isDemo,
  getUser: getUser,
  setUser: setUser,
  getCookie: getCookie,
  setCookie: setCookie,
  restore: restore,
  clear: clear,
  getRoles: getRoles,
  hasRole: hasRole,
  isTeacher: isTeacher,
  isLogged: isLogged,
  roleText: roleText,
  displayName: displayName,
  avatarText: avatarText,
  toLogin: toLogin,
  currentPath: currentPath
};
