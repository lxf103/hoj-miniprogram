// pages/course-detail/course-detail.js —— 教学班详情 + 作业批次列表
// 数据源：GET /api/offerings/{oid} -> { offering, batches[], total_students, insights }
var api = require('../../utils/api.js');
var store = require('../../utils/store.js');
var share = require('../../utils/share.js');

Page({
  data: {
    oid: '',
    offering: null,
    batches: [],
    totalStudents: null,
    isTeacher: false,
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
    this.setData({ loading: true, err: '', isTeacher: store.isTeacher() });

    return api.offering(this.data.oid).then((d) => {
      var o = d.offering || {};
      // 给每个作业预先算好展示文案，wxml 里不做逻辑
      var batches = (d.batches || []).map(function (b) {
        var progress;
        if (b.problemCount != null && b.done != null) {
          progress = '已完成 ' + b.done + '/' + b.problemCount + ' 题';
        } else if (b.problemCount != null) {
          progress = '共 ' + b.problemCount + ' 题';
        } else {
          progress = '';
        }
        var st = b.staff || {};
        return Object.assign({}, b, {
          progressText: progress,
          dueText: b.due.text,
          dueCls: b.due.cls || 'open',
          // 教师视角：服务端已算好本作业的班级完成情况，不用逐学生去拉
          teaches: b.problemCount != null ? (b.problemCount + ' 题') : '',
          submitText: (st.submitted_count != null && b.studentCount != null)
            ? ('提交 ' + st.submitted_count + '/' + b.studentCount + ' 人') : '',
          doneText: (st.completed_count != null && b.studentCount != null)
            ? ('完成 ' + st.completed_count + '/' + b.studentCount + ' 人') : '',
          rate: (st.completion_rate != null) ? (st.completion_rate + '%') : '',
          rateNum: (st.completion_rate != null) ? Math.round(st.completion_rate) : 0
        });
      });

      this.setData({
        offering: o,
        batches: batches,
        totalStudents: d.totalStudents,
        loading: false
      });

      var nm = o.course_name || o.title || o.name || '课程详情';
      wx.setNavigationBarTitle({ title: nm });
    }).catch((e) => {
      this.setData({ loading: false, err: (e && e.message) || '课程加载失败' });
    });
  },

  goBatch(e) {
    var bid = e.currentTarget.dataset.bid;
    if (!bid) return;
    wx.navigateTo({ url: '/pages/batch/batch?bid=' + bid });
  },

  goStudents() {
    if (!this.data.oid) return;
    wx.navigateTo({ url: '/pages/students/students?oid=' + this.data.oid });
  },

  // ---- 分享 ----
  onShareAppMessage: share.build(function () {
    var o = this.data.offering || {};
    return {
      title: (o.course_name || o.title || '课程') + ' · HOJ 教学平台',
      path: '/pages/course-detail/course-detail?oid=' + this.data.oid
    };
  })
});
