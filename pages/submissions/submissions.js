// pages/submissions/submissions.js —— 我的提交
// 筛选走后端：/api/status 支持 problem_id / language / result（language、result 都是数字）
var api = require('../../utils/api.js');
var fmt = require('../../utils/format.js');
var store = require('../../utils/store.js');
var share = require('../../utils/share.js');

// 后端 language 是数字 id（实测 6=Python）
var LANGS = [
  { label: '全部语言', value: '' },
  { label: 'C', value: 0 },
  { label: 'C++', value: 1 },
  { label: 'Java', value: 3 },
  { label: 'Python', value: 6 },
  { label: 'JavaScript', value: 16 },
  { label: 'Go', value: 17 }
];

// result 数字映射见 format.RESULT_MAP
var STATUS_CODES = ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'PE', 'OLE'];

function buildStatusOptions() {
  var opts = [{ label: '全部结果', value: '' }];
  STATUS_CODES.forEach(function (c) {
    var info = fmt.resultInfo(fmt.CODE_TO_RESULT[c]);
    opts.push({ label: c + ' · ' + info.text, value: fmt.CODE_TO_RESULT[c] });
  });
  return opts;
}

Page({
  data: {
    logged: false,
    list: [],
    total: 0,
    page: 1,
    pageSize: 20,
    loading: false,
    noMore: false,

    langLabels: LANGS.map(function (l) { return l.label; }),
    langIdx: 0,
    statusLabels: [],
    statusIdx: 0,
    pid: '',

    autoRefresh: true,
    err: ''
  },

  onLoad() {
    var statuses = buildStatusOptions();
    this._langs = LANGS;
    this._statuses = statuses;
    this.setData({ statusLabels: statuses.map(function (s) { return s.label; }) });
  },

  onShow() {
    var logged = store.isLogged();
    this.setData({ logged: logged });
    if (!logged) {
      this.setData({ list: [], total: 0 });
      return;
    }
    this.load(true);
    this.startAuto();
  },

  onHide() { this.stopAuto(); },
  onUnload() { this.stopAuto(); },

  onPullDownRefresh() {
    this.load(true).then(function () { wx.stopPullDownRefresh(); });
  },

  onReachBottom() { this.load(false); },

  // ---- 数据 ----

  load(reset) {
    if (this.data.loading) return Promise.resolve();
    if (!reset && this.data.noMore) return Promise.resolve();
    if (!store.isLogged()) return Promise.resolve();

    var page = reset ? 1 : this.data.page + 1;
    var lang = this._langs[this.data.langIdx] || {};
    var status = this._statuses[this.data.statusIdx] || {};

    this.setData({ loading: true, err: '' });

    return api.submissions({
      page: page,
      pageSize: this.data.pageSize,
      problemId: (this.data.pid || '').trim(),
      language: lang.value,
      result: status.value
    }).then((d) => {
      var list = reset ? d.items : this.data.list.concat(d.items);
      this.setData({
        list: list,
        total: d.total || 0,
        page: page,
        noMore: d.items.length === 0 || (d.total > 0 && list.length >= d.total),
        loading: false
      });
    }).catch((e) => {
      this.setData({ loading: false, err: (e && e.message) || '提交记录加载失败' });
    });
  },

  // ---- 筛选 ----

  onPid(e) { this.setData({ pid: e.detail.value }); },

  onPidConfirm() { this.load(true); },

  onLang(e) {
    this.setData({ langIdx: Number(e.detail.value) });
    this.load(true);
  },

  onStatus(e) {
    this.setData({ statusIdx: Number(e.detail.value) });
    this.load(true);
  },

  resetFilter() {
    this.setData({ pid: '', langIdx: 0, statusIdx: 0 });
    this.load(true);
  },

  manualRefresh() { this.load(true); },

  toggleAuto() {
    var on = !this.data.autoRefresh;
    this.setData({ autoRefresh: on });
    if (on) this.startAuto(); else this.stopAuto();
  },

  /** 有提交还在判题时，自动隔几秒刷一次 */
  startAuto() {
    this.stopAuto();
    if (!this.data.autoRefresh) return;
    this._auto = setInterval(() => {
      var pending = this.data.list.some(function (s) { return s.pending; });
      if (pending && !this.data.loading) this.load(true);
    }, 4000);
  },

  stopAuto() {
    if (this._auto) { clearInterval(this._auto); this._auto = null; }
  },

  goDetail(e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/submission-detail/submission-detail?id=' + id });
  },

  goProblems() { wx.switchTab({ url: '/pages/problems/problems' }); },
  goLogin() { store.toLogin('/pages/submissions/submissions'); },

  // ---- 分享 ----
  onShareAppMessage: share.page('HOJ 教学平台 · 提交记录与判题结果', '/pages/submissions/submissions')
});
