// pages/batch/batch.js —— 作业题目清单
// 数据源：GET /api/batches/{bid} -> { batch, offering, problems[] }
var api = require('../../utils/api.js');
var store = require('../../utils/store.js');
var share = require('../../utils/share.js');

Page({
  data: {
    bid: '',
    batch: null,
    offering: null,
    problems: [],
    passedCount: 0,
    progressPct: 0,
    isTeacher: false,
    loading: false,
    err: ''
  },

  onLoad(options) {
    this.setData({
      bid: (options && options.bid) || '',
      isTeacher: store.isTeacher()
    });
    this.load();
  },

  onPullDownRefresh() {
    this.load().then(function () { wx.stopPullDownRefresh(); });
  },

  load() {
    if (!this.data.bid) {
      this.setData({ err: '缺少作业参数' });
      return Promise.resolve();
    }
    this.setData({ loading: true, err: '' });

    return api.batch(this.data.bid).then((d) => {
      var problems = d.problems || [];
      var passed = problems.filter(function (p) { return p.passed; }).length;
      this.setData({
        batch: d.batch,
        offering: d.offering,
        problems: problems,
        passedCount: passed,
        // 进度条宽度在 JS 里算好，wxml 里不做除法（避免浮点长尾）
        progressPct: problems.length ? Math.round(passed * 100 / problems.length) : 0,
        loading: false
      });
      wx.setNavigationBarTitle({ title: (d.batch && d.batch.title) || '作业' });
    }).catch((e) => {
      this.setData({ loading: false, err: (e && e.message) || '作业加载失败' });
    });
  },

  goProblem(e) {
    var pid = e.currentTarget.dataset.pid;
    if (!pid) return;
    wx.navigateTo({ url: '/pages/detail/detail?pid=' + pid + '&bid=' + this.data.bid });
  },

  goStudents() {
    var oid = this.data.offering && this.data.offering.offering_id;
    if (!oid) return;
    wx.navigateTo({ url: '/pages/students/students?oid=' + oid });
  },

  // ---- 分享 ----
  onShareAppMessage: share.build(function () {
    var b = this.data.batch || {};
    return {
      title: (b.title || '作业') + ' · HOJ 教学平台',
      path: '/pages/batch/batch?bid=' + this.data.bid
    };
  })
});
