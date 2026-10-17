// pages/submission-detail/submission-detail.js —— 单条提交详情（含逐测试点 + 源码）
// 数据源：GET /api/submissions/{id} 和 /api/submissions/{id}/code
var api = require('../../utils/api.js');
var fmt = require('../../utils/format.js');
var share = require('../../utils/share.js');

Page({
  data: {
    id: '',
    sub: null,
    code: '',
    codeLang: '',
    codeLoaded: false,
    showCode: true,
    loading: false,
    err: ''
  },

  onLoad(options) {
    this.setData({ id: (options && options.id) || '' });
    this.load();
  },

  onPullDownRefresh() {
    this.load().then(function () { wx.stopPullDownRefresh(); });
  },

  load() {
    if (!this.data.id) {
      this.setData({ err: '缺少提交编号' });
      return Promise.resolve();
    }
    this.setData({ loading: true, err: '' });

    return api.submission(this.data.id).then((d) => {
      this.setData({ sub: d, loading: false });
      wx.setNavigationBarTitle({ title: '提交 #' + d.id });

      if (d.problemId) {
        wx.setNavigationBarTitle({ title: '#' + d.problemId + ' ' + (d.title || '提交详情') });
      }

      // 判完了再取源码，省一次请求
      if (!d.pending && d.canViewCode) this.loadCode();
    }).catch((e) => {
      this.setData({ loading: false, err: (e && e.message) || '提交详情加载失败' });
    });
  },

  loadCode() {
    return api.submissionCode(this.data.id).then((c) => {
      this.setData({ code: c.code, codeLang: c.language, codeLoaded: true });
    }).catch(() => {
      this.setData({ codeLoaded: false });
    });
  },

  toggleCode() { this.setData({ showCode: !this.data.showCode }); },

  copyCode() {
    if (!this.data.code) return;
    wx.setClipboardData({
      data: this.data.code,
      success: function () { wx.showToast({ title: '代码已复制', icon: 'none' }); }
    });
  },

  goProblem() {
    var pid = this.data.sub && this.data.sub.problemId;
    if (!pid) return;
    wx.navigateTo({ url: '/pages/detail/detail?pid=' + pid });
  },

  // ---- 分享 ----
  onShareAppMessage: share.build(function () {
    var s = this.data.sub || {};
    return {
      title: '提交 #' + (s.id || '') + ' ' + (s.statusText || '') + ' · HOJ',
      path: '/pages/submission-detail/submission-detail?id=' + this.data.id
    };
  })
});
