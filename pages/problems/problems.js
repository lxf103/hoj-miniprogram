// pages/problems/problems.js —— 题库
//
// 电脑端的题库不是平铺列表，而是「分类 + 题单」两层结构：
//   GET /api/problem-sets -> 24 个知识点分类 + 24 份专项题单 = 48 份 / 2148 题
// 这里完整还原：分类 tab、题单 tab，外加原有的「公开题」平铺列表。
// 题目用 slug 寻址，点进去走 /api/public-problems/{slug}。
var api = require('../../utils/api.js');
var fmt = require('../../utils/format.js');
var store = require('../../utils/store.js');
var share = require('../../utils/share.js');

// 搜索结果一次最多渲染这么多，避免 setData 太大卡顿
var MAX_RESULTS = 80;

Page({
  data: {
    tab: 'category',
    tabs: [
      { key: 'category', label: '分类' },
      { key: 'set', label: '题单' },
      { key: 'public', label: '公开题' }
    ],

    index: null,
    groups: [],          // 当前 tab 下要展示的题单卡片
    results: [],         // 搜索/筛选后的扁平题目列表
    resultTotal: 0,
    resultCapped: false,

    totals: { problems: 0, sheets: 0 },
    fromCache: false,

    keyword: '',
    diffLevel: '',
    diffFilters: fmt.DIFF_FILTERS_CATEGORY,

    loading: true,
    err: '',

    // 公开题：服务端分页
    publicList: [],
    publicTotal: 0,
    publicPage: 1,
    publicNoMore: false,
    publicLoading: false
  },

  onLoad() {
    this.loadIndex(false);
    this.loadPublic(true);
  },

  onPullDownRefresh() {
    if (this.data.tab === 'public') {
      this.loadPublic(true).then(function () { wx.stopPullDownRefresh(); });
      return;
    }
    this.loadIndex(true).then(function () { wx.stopPullDownRefresh(); });
  },

  onReachBottom() {
    if (this.data.tab === 'public') this.loadPublic(false);
  },

  // ---------------- 题库索引 ----------------

  loadIndex(force) {
    this.setData({ loading: true, err: '' });
    return api.problemSets({ force: force }).then((index) => {
      this.setData({
        index: index,
        totals: { problems: index.totalProblems || 0, sheets: index.totalSheets || 0 },
        fromCache: !!index.fromCache,
        loading: false
      }, () => this.apply());
    }).catch((e) => {
      this.setData({ loading: false, err: (e && e.message) || '题库索引加载失败，下拉重试' });
    });
  },

  refreshIndex() {
    wx.showModal({
      title: '更新题库索引',
      content: '会重新拉取分类与题单（约 2.5MB），确定吗？',
      success: (r) => {
        if (!r.confirm) return;
        wx.showLoading({ title: '更新中…' });
        this.loadIndex(true).then(() => wx.hideLoading())
          .catch(() => wx.hideLoading());
      }
    });
  },

  // ---------------- 交互 ----------------

  setTab(e) {
    var tab = e.currentTarget.dataset.k;
    this.setData({
      tab: tab,
      diffLevel: '',
      diffFilters: tab === 'set' ? fmt.DIFF_FILTERS_SET : fmt.DIFF_FILTERS_CATEGORY,
      groups: [],
      results: [],
      resultTotal: 0,
      resultCapped: false
    }, () => this.apply());
  },

  onSearch(e) { this.setData({ keyword: e.detail.value }, () => this.apply()); },

  doSearch() { this.apply(); },

  /**
   * 搜索按钮 / 回车统一入口。
   * 注意：WXML 的事件名必须是静态字符串，不能写 bindtap="{{条件 ? 'a' : 'b'}}"，
   * 所以分支放在这里。
   */
  onSearchSubmit() {
    if (this.data.tab === 'public') this.loadPublic(true);
    else this.doSearch();
  },

  clearSearch() {
    this.setData({ keyword: '' }, () => this.apply());
  },

  setDiff(e) {
    var lv = e.currentTarget.dataset.k || '';
    this.setData({ diffLevel: lv }, () => this.apply());
  },

  apply() {
    var tab = this.data.tab;
    if (tab === 'public') {
      this.setData({ groups: [], results: [], resultTotal: 0, resultCapped: false });
      return;
    }

    var index = this.data.index;
    if (!index) return;

    var kw = (this.data.keyword || '').trim().toLowerCase();
    var lv = this.data.diffLevel;
    var pool = (tab === 'set') ? (index.sets || []) : (index.categories || []);

    // 有搜索词：跨「分类 + 题单」全局搜题，拍平成列表
    if (kw) {
      var everything = (index.categories || []).concat(index.sets || []);
      var all = [];
      everything.forEach(function (g) {
        (g.problems || []).forEach(function (p) {
          if (lv && p.diffLevel !== lv) return;
          var hay = (p.title + ' ' + p.slug + ' ' + (p.tags || []).join(' ') + ' ' +
                     (p.knowledge || []).join(' ') + ' ' + p.provenance).toLowerCase();
          if (hay.indexOf(kw) > -1) {
            all.push({
              slug: p.slug, title: p.title, diffLabel: p.diffLabel, diffCls: p.diffCls,
              provenance: p.provenance, groupTitle: g.title
            });
          }
        });
      });
      this.setData({
        groups: [],
        results: all.slice(0, MAX_RESULTS),
        resultTotal: all.length,
        resultCapped: all.length > MAX_RESULTS
      });
      return;
    }

    // 无搜索词：展示题单卡片；选了难度就只留含该难度的题单
    var groups = pool;
    if (lv) {
      groups = pool.filter(function (g) {
        return (g.problems || []).some(function (p) { return p.diffLevel === lv; });
      });
    }
    this.setData({ groups: groups, results: [], resultTotal: 0, resultCapped: false });
  },

  goGroup(e) {
    var ds = e.currentTarget.dataset;
    if (!ds.code) return;
    wx.navigateTo({
      url: '/pages/category/category?kind=' + ds.kind +
           '&code=' + encodeURIComponent(ds.code) +
           '&title=' + encodeURIComponent(ds.title || '')
    });
  },

  goDetail(e) {
    var slug = e.currentTarget.dataset.slug;
    if (!slug) return;
    wx.navigateTo({ url: '/pages/detail/detail?pid=' + encodeURIComponent(slug) });
  },

  // ---------------- 公开题（服务端分页） ----------------

  loadPublic(reset) {
    if (this.data.publicLoading) return Promise.resolve();
    if (!reset && this.data.publicNoMore) return Promise.resolve();

    var page = reset ? 1 : this.data.publicPage + 1;
    this.setData({ publicLoading: true });

    return api.problems({ page: page, pageSize: 20, keyword: this.data.keyword }).then((d) => {
      var list = reset ? d.items : this.data.publicList.concat(d.items);
      this.setData({
        publicList: list,
        publicTotal: d.total || 0,
        publicPage: page,
        publicNoMore: d.items.length === 0 || (d.total > 0 && list.length >= d.total),
        publicLoading: false
      });
    }).catch(() => {
      this.setData({ publicLoading: false });
    });
  },

  searchPublic() {
    this.loadPublic(true);
  },

  goLogin() { store.toLogin('/pages/problems/problems'); },

  // ---- 分享 ----
  onShareAppMessage: share.page('HOJ 题库 · 24 个分类 / 2148 道题', '/pages/problems/problems'),
  onShareTimeline: share.timeline('HOJ 题库 · 一起来刷题')
});
