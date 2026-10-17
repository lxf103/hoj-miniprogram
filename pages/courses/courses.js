// pages/courses/courses.js —— 课程列表：GET /api/courses（教师=我教的课，学生=我选的课）
var api = require('../../utils/api.js');
var store = require('../../utils/store.js');
var share = require('../../utils/share.js');

Page({
  data: {
    logged: false,
    all: [],
    list: [],
    keyword: '',
    loading: false,
    err: ''
  },

  onShow() { this.load(); },

  onPullDownRefresh() {
    this.load().then(function () { wx.stopPullDownRefresh(); });
  },

  load() {
    var logged = store.isLogged();
    this.setData({ logged: logged });
    if (!logged) {
      this.setData({ all: [], list: [], loading: false, err: '' });
      return Promise.resolve();
    }
    this.setData({ loading: true, err: '' });
    return api.courses().then((list) => {
      this.setData({ all: list, loading: false }, () => this.apply());
    }).catch((e) => {
      this.setData({ loading: false, err: (e && e.message) || '课程加载失败' });
    });
  },

  onSearch(e) { this.setData({ keyword: e.detail.value }, () => this.apply()); },

  apply() {
    var kw = (this.data.keyword || '').trim().toLowerCase();
    if (!kw) { this.setData({ list: this.data.all }); return; }
    var list = this.data.all.filter(function (c) {
      var hay = (c.name + ' ' + c.code + ' ' + c.term + ' ' + c.section + ' ' + c.title + ' ' + c.teacherId).toLowerCase();
      return hay.indexOf(kw) > -1;
    });
    this.setData({ list: list });
  },

  goDetail(e) {
    var oid = e.currentTarget.dataset.oid;
    if (!oid) return;
    wx.navigateTo({ url: '/pages/course-detail/course-detail?oid=' + oid });
  },

  goLogin() { store.toLogin('/pages/courses/courses'); },

  // ---- 分享 ----
  onShareAppMessage: share.page('HOJ 教学平台 · 课程与作业', '/pages/courses/courses')
});
