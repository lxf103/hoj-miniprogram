// pages/detail/detail.js —— 题目详情 + 写代码 + 提交 + 轮询判题结果
//
// 关键修复：后端 /api/status 与 /api/submissions/{id} 的 result 是【数字】
// （4=通过），老代码拿它和 'AC' 比所以永远不相等，轮询会一直到超时。
// 这里统一用 format.resultInfo / format.isPending 处理。
var api = require('../../utils/api.js');
var fmt = require('../../utils/format.js');
var store = require('../../utils/store.js');
var share = require('../../utils/share.js');

var POLL_INTERVAL = 1200; // 判题轮询间隔（实测后端约 1s 出结果）
var MAX_POLL = 15;

// 各语言的起手模板
var TEMPLATES = {
  c: '#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n',
  python: 'import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    \n\nif __name__ == "__main__":\n    main()\n',
  javascript: 'const data = require("fs").readFileSync(0, "utf8");\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    \n}\n'
};

function draftKey(key) { return 'hoj_draft_' + key; }

Page({
  data: {
    key: '',
    bid: '',
    problem: null,

    langs: [],
    langIdx: 0,
    curLang: '',

    code: '',
    submitting: false,
    judging: false,

    result: null,   // { code, cls, text }
    detail: null,   // { id, time, memory, language, inDate }
    cases: [],
    history: [],

    err: ''
  },

  onLoad(options) {
    var opt = options || {};
    var key = opt.pid || opt.key || '';
    this.setData({ key: key, bid: opt.bid || '' });
    if (!key) {
      this.setData({ err: '缺少题目参数' });
      return;
    }
    this.loadProblem();
    this.loadLangs();
    this.restoreDraft();
  },

  onUnload() {
    this._dead = true;
    if (this._timer) clearTimeout(this._timer);
  },

  onPullDownRefresh() {
    this.loadProblem().then(function () { wx.stopPullDownRefresh(); });
  },

  // ---- 加载 ----

  loadProblem() {
    return api.problem(this.data.key).then((p) => {
      this.setData({ problem: p, err: '' });
      wx.setNavigationBarTitle({ title: p.title || '题目详情' });
      // 题库题是按 slug 打开的，但 /api/status 的 problem_id 过滤要数字，
      // 所以拿到 numeric_pid 之后再查本题历史
      this._pid = p.numericPid || this.data.key;
      this.loadHistory();
    }).catch((e) => {
      this.setData({ err: (e && e.message) || '题目加载失败' });
    });
  },

  /** 优先用作业允许的语言，否则给全部 */
  loadLangs() {
    var apply = (allowed) => {
      var langs = fmt.langOptions(allowed);
      var idx = 0;
      this.setData({ langs: langs, langIdx: idx, curLang: langs[idx].label });
    };

    if (!this.data.bid) { apply(null); return; }

    api.batch(this.data.bid).then((d) => {
      apply(d.batch && d.batch.allowedLanguages);
    }).catch(() => apply(null));
  },

  loadHistory() {
    var pid = this._pid || this.data.key;
    if (!pid) return Promise.resolve();
    return api.submissions({ problemId: pid, page: 1, pageSize: 5 })
      .then((d) => this.setData({ history: d.items || [] }))
      .catch(() => {});
  },

  restoreDraft() {
    try {
      var saved = wx.getStorageSync(draftKey(this.data.key));
      if (saved) this.setData({ code: saved });
    } catch (e) {}
  },

  // ---- 编辑 ----

  onCodeInput(e) {
    var code = e.detail.value;
    this.setData({ code: code });
    // 草稿落本地，切页面/退出不丢代码
    try { wx.setStorageSync(draftKey(this.data.key), code); } catch (err) {}
  },

  chooseLang() {
    var labels = this.data.langs.map(function (l) { return l.label; });
    wx.showActionSheet({
      itemList: labels,
      success: (res) => {
        var idx = res.tapIndex;
        var lang = this.data.langs[idx];
        var patch = { langIdx: idx, curLang: lang.label };
        // 原来的代码是空模板/没写过，就换成新语言的模板
        var cur = (this.data.code || '').trim();
        var wasTemplate = !cur || Object.keys(TEMPLATES).some(function (k) {
          return TEMPLATES[k].trim() === cur;
        });
        if (wasTemplate) patch.code = TEMPLATES[lang.code] || '';
        this.setData(patch, () => {
          if (patch.code !== undefined) {
            try { wx.setStorageSync(draftKey(this.data.key), patch.code); } catch (e) {}
          }
        });
      }
    });
  },

  insertTemplate() {
    var lang = this.data.langs[this.data.langIdx];
    if (!lang) return;
    this.setData({ code: TEMPLATES[lang.code] || '' });
    try { wx.setStorageSync(draftKey(this.data.key), TEMPLATES[lang.code] || ''); } catch (e) {}
  },

  // ---- 提交 ----

  submit() {
    if (!store.isLogged()) {
      store.toLogin(store.currentPath());
      return;
    }
    if (this.data.submitting || this.data.judging) return;

    var code = this.data.code || '';
    if (!code.trim()) {
      wx.showToast({ title: '请先写代码', icon: 'none' });
      return;
    }
    var lang = this.data.langs[this.data.langIdx];
    if (!lang) {
      wx.showToast({ title: '请选择语言', icon: 'none' });
      return;
    }

    this.setData({
      submitting: true, judging: false,
      result: null, detail: null, cases: []
    });

    api.submit(this.data.key, lang.code, code).then((sid) => {
      if (!sid) {
        this.setData({
          submitting: false,
          result: { code: '', cls: 'wa', text: '后端没有返回提交编号' }
        });
        return;
      }
      this._sid = sid;
      this.setData({ submitting: false, judging: true });
      this.poll(0);
    }).catch((e) => {
      this.setData({
        submitting: false,
        result: { code: '', cls: 'wa', text: '提交失败：' + ((e && e.message) || '未知错误') }
      });
    });
  },

  /** 轮询判题结果，出终态就停 */
  poll(n) {
    if (this._dead) return;
    var sid = this._sid;
    if (!sid) return;

    api.submission(sid).then((d) => {
      if (this._dead) return;

      if (!d.pending) {
        this.setData({
          judging: false,
          result: { code: d.status, cls: d.statusCls, text: d.statusText },
          detail: {
            id: d.id, time: d.time, memory: d.memory,
            language: d.language, inDate: d.inDate
          },
          cases: d.cases || []
        });
        this.loadHistory();
        this.loadProblem(); // 刷新通过状态
        return;
      }

      if (n >= MAX_POLL) {
        this.setData({
          judging: false,
          result: { code: '', cls: 'todo', text: '还在判题，稍后到「提交」页查看结果' },
          detail: { id: sid, time: '', memory: '', language: '', inDate: '' }
        });
        this.loadHistory();
        return;
      }
      this._timer = setTimeout(() => this.poll(n + 1), POLL_INTERVAL);
    }).catch(() => {
      if (this._dead) return;
      if (n >= MAX_POLL) {
        this.setData({
          judging: false,
          result: { code: '', cls: 'todo', text: '结果查询失败，请到「提交」页查看' }
        });
        return;
      }
      this._timer = setTimeout(() => this.poll(n + 1), POLL_INTERVAL);
    });
  },

  goSubmission(e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/submission-detail/submission-detail?id=' + id });
  },

  // ---- 分享 ----
  onShareAppMessage: share.build(function () {
    var p = this.data.problem;
    return {
      title: p ? (p.title + ' · HOJ 题库') : 'HOJ 题库',
      path: '/pages/detail/detail?pid=' + encodeURIComponent(this.data.key || '')
    };
  }),
  onShareTimeline: function () {
    var p = this.data.problem;
    return {
      title: p ? (p.title + ' · HOJ 题库') : 'HOJ 题库',
      query: 'pid=' + encodeURIComponent(this.data.key || '')
    };
  }
});
