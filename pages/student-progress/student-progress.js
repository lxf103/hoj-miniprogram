// pages/student-progress/student-progress.js —— 教师：单个学生的成绩册
// GET /api/offerings/{oid}/students/{uid}/progress
// 每个作业下每道题给出 result / label / attempts / score / submission_id，
// 点有提交的题可以直接跳去看代码。
var api = require('../../utils/api.js');

Page({
  data: {
    oid: '',
    uid: '',
    name: '',
    student: null,
    batches: [],
    summary: null,
    loading: false,
    err: ''
  },

  onLoad(options) {
    var opt = options || {};
    var name = opt.name ? decodeURIComponent(opt.name) : '';
    this.setData({
      oid: opt.oid || '',
      uid: opt.uid ? decodeURIComponent(opt.uid) : '',
      name: name
    });
    if (name) wx.setNavigationBarTitle({ title: name + ' · 进度' });
    this.load();
  },

  onPullDownRefresh() {
    this.load().then(function () { wx.stopPullDownRefresh(); });
  },

  load() {
    if (!this.data.oid || !this.data.uid) {
      this.setData({ err: '缺少学生参数' });
      return Promise.resolve();
    }
    this.setData({ loading: true, err: '' });

    return api.studentProgress(this.data.oid, this.data.uid).then((d) => {
      this.setData({
        student: d.student,
        batches: d.batches,
        summary: d.summary,
        loading: false
      });
      var nm = (d.student && (d.student.nick || d.student.user_id)) || this.data.name;
      if (nm) wx.setNavigationBarTitle({ title: nm + ' · 进度' });
    }).catch((e) => {
      this.setData({ loading: false, err: (e && e.message) || '进度加载失败' });
    });
  },

  /** 有提交就看提交详情（含代码），没提交就去看题目本身 */
  openProblem(e) {
    var ds = e.currentTarget.dataset;
    if (ds.sub) {
      wx.navigateTo({ url: '/pages/submission-detail/submission-detail?id=' + ds.sub });
    } else if (ds.pid) {
      wx.navigateTo({ url: '/pages/detail/detail?pid=' + ds.pid });
    }
  }
});
