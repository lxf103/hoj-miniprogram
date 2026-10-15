// pages/overview/overview.js —— 总览：角色自适应的欢迎语、统计、待办作业、最近提交。
var api = require('../../utils/api.js');
var store = require('../../utils/store.js');
var fmt = require('../../utils/format.js');

Page({
  data: {
    logged: false,
    name: '',
    role: '',
    isTeacher: false,
    stats: { courses: 0, assignments: 0, open: 0 },
    todos: [],
    recent: [],
    loading: false
  },

  onShow() { this.refresh(); },

  onPullDownRefresh() {
    this.refresh().then(function () { wx.stopPullDownRefresh(); });
  },

  refresh() {
    var logged = store.isLogged();
    this.setData({
      logged: logged,
      name: store.displayName(),
      role: store.roleText(),
      isTeacher: store.isTeacher()
    });

    if (!logged) {
      this.setData({
        todos: [], recent: [],
        stats: { courses: 0, assignments: 0, open: 0 },
        loading: false
      });
      return Promise.resolve();
    }

    this.setData({ loading: true });

    // 三个接口并发；任意一个挂了都不该让整页白屏
    return Promise.all([
      api.courses().catch(function () { return []; }),
      api.assignmentOverview().catch(function () { return []; }),
      api.submissions({ page: 1, pageSize: 3 }).catch(function () { return { items: [] }; })
    ]).then((res) => {
      var courses = res[0] || [];
      var overview = res[1] || [];
      var subs = (res[2] && res[2].items) || [];

      var nameByOffering = {};
      courses.forEach(function (c) { nameByOffering[c.offeringId] = c.name; });

      var assignments = 0, open = 0, todos = [];
      overview.forEach(function (o) {
        assignments += (o.assignment_count || 0);
        open += (o.open_count || 0);
        (o.recent || []).forEach(function (r) {
          todos.push({
            batchId: r.batch_id,
            title: r.title || '作业',
            course: nameByOffering[o.offering_id] || ('课程 #' + o.offering_id),
            dueAt: r.due_at || '',
            due: fmt.dueInfo(r.due_at, !r.accepting),
            accepting: !!r.accepting
          });
        });
      });

      // 进行中的排前面，其次按截止时间由近到远
      todos.sort(function (a, b) {
        if (a.accepting !== b.accepting) return a.accepting ? -1 : 1;
        var da = fmt.parseDate(a.dueAt), db = fmt.parseDate(b.dueAt);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da - db;
      });

      this.setData({
        stats: { courses: courses.length, assignments: assignments, open: open },
        todos: todos.slice(0, 10),
        recent: subs,
        loading: false
      });
    }).catch(() => {
      this.setData({ loading: false });
    });
  },

  // ---- 交互 ----
  goLogin() { store.toLogin(store.currentPath()); },

  goTodo(e) {
    var bid = e.currentTarget.dataset.bid;
    if (!bid) return;
    wx.navigateTo({ url: '/pages/batch/batch?bid=' + bid });
  },

  goSubmission(e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/submission-detail/submission-detail?id=' + id });
  },

  goCourses() { wx.switchTab({ url: '/pages/courses/courses' }); },
  goProblems() { wx.switchTab({ url: '/pages/problems/problems' }); },
  goSubmissions() { wx.switchTab({ url: '/pages/submissions/submissions' }); }
});
