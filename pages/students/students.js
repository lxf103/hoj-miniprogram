// pages/students/students.js —— 教师：教学班学生名单（带通过数/提交数/最后活跃）
// GET /api/offerings/{oid}/students
var api = require('../../utils/api.js');

Page({
  data: {
    oid: '',
    offering: null,
    all: [],
    list: [],
    keyword: '',
    sort: 'passed',
    sorts: [
      { key: 'passed', label: '按通过数' },
      { key: 'attempts', label: '按提交数' },
      { key: 'none', label: '默认' }
    ],
    summary: { total: 0, active: 0, idle: 0 },
    loading: false,
    err: ''
  },

  onLoad(options) {
    this.setData({ oid: (options && options.oid) || '' });
    this.load();
  },

  onPullDownRefresh() {
    this.load().then(function () { wx.stopPullDownRefresh(); });
  },

  load() {
    if (!this.data.oid) {
      this.setData({ err: '缺少课程参数' });
      return Promise.resolve();
    }
    this.setData({ loading: true, err: '' });

    return api.students(this.data.oid).then((d) => {
      var all = d.students || [];
      var active = all.filter(function (s) { return s.attempts > 0; }).length;
      this.setData({
        offering: d.offering,
        all: all,
        summary: { total: all.length, active: active, idle: all.length - active },
        loading: false
      }, () => this.apply());

      var o = d.offering || {};
      wx.setNavigationBarTitle({ title: (o.course_name || o.title || '课程') + ' · 学生' });
    }).catch((e) => {
      this.setData({ loading: false, err: (e && e.message) || '学生名单加载失败' });
    });
  },

  onSearch(e) { this.setData({ keyword: e.detail.value }, () => this.apply()); },

  setSort(e) {
    this.setData({ sort: e.currentTarget.dataset.k }, () => this.apply());
  },

  apply() {
    var kw = (this.data.keyword || '').trim().toLowerCase();
    var list = this.data.all.slice();

    if (kw) {
      list = list.filter(function (s) {
        return (s.nick + ' ' + s.userId + ' ' + s.studentNo + ' ' + s.school).toLowerCase().indexOf(kw) > -1;
      });
    }

    var sort = this.data.sort;
    if (sort === 'passed') {
      list.sort(function (a, b) { return (b.passed - a.passed) || (b.attempts - a.attempts); });
    } else if (sort === 'attempts') {
      list.sort(function (a, b) { return (b.attempts - a.attempts) || (b.passed - a.passed); });
    }

    this.setData({ list: list });
  },

  goStudent(e) {
    var ds = e.currentTarget.dataset;
    if (!ds.uid) return;
    wx.navigateTo({
      url: '/pages/student-progress/student-progress?oid=' + this.data.oid +
           '&uid=' + encodeURIComponent(ds.uid) +
           '&name=' + encodeURIComponent(ds.name || '')
    });
  }
});
