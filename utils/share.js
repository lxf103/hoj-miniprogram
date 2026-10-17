// utils/share.js —— 统一的小程序分享配置。
//
// 小程序默认不显示「转发」按钮，必须在页面里实现 onShareAppMessage 才有。
// 之前全项目一个都没有，导致题目、做题结果都分享不出去。
//
// 用法（在页面 js 里）：
//   var share = require('../../utils/share.js');
//   Page({
//     onShareAppMessage: share.page('题库', '/pages/problems/problems'),
//     onShareTimeline: share.timeline('题库'),
//     // 需要动态标题时：
//     onShareAppMessage: share.build(function () {
//       return { title: this.data.problem.title, path: '/pages/detail/detail?pid=' + this.data.key };
//     })
//   });

var APP_TITLE = 'HOJ 教学平台 · 题库刷题与作业提交';
var APP_PATH = '/pages/overview/overview';

/** 分享整个小程序（首页用） */
function app() {
  return { title: APP_TITLE, path: APP_PATH };
}

/** 分享某个固定页面 */
function page(title, path) {
  return function () {
    return { title: title, path: path };
  };
}

/**
 * 由页面自己的数据动态生成分享内容。
 * build 里的 this 就是页面实例，能拿到 this.data。
 * 返回空则退回分享首页。
 */
function build(fn) {
  return function () {
    var r = null;
    try {
      r = fn.call(this);
    } catch (e) {
      r = null;
    }
    if (!r || !r.title) return app();
    if (!r.path) r.path = APP_PATH;
    return r;
  };
}

/** 分享到朋友圈（需要在页面里同时实现 onShareTimeline） */
function timeline(title, query) {
  return function () {
    return { title: title || APP_TITLE, query: query || '' };
  };
}

module.exports = {
  APP_TITLE: APP_TITLE,
  APP_PATH: APP_PATH,
  app: app,
  page: page,
  build: build,
  timeline: timeline
};
