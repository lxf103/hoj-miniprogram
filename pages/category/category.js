// pages/category/category.js —— 一个知识点分类 / 一份专项题单 下的题目清单
// 数据来自本地缓存的题库索引（utils/api.problemSets），不额外打网络。
var api = require('../../utils/api.js');
var fmt = require('../../utils/format.js');

Page({
  data: {
    kind: 'category',
    code: '',
    title: '',

    group: null,
    problems: [],
    shown: [],

    diffFilters: [],
    diffLevel: '',
    keyword: '',

    loading: true,
    err: ''
  },

  onLoad(options) {
    var opt = options || {};
    var kind = opt.kind === 'set' ? 'set' : 'category';
    var code = opt.code || '';
    var title = opt.title ? decodeURIComponent(opt.title) : '';

    this.setData({
      kind: kind,
      code: code,
      title: title,
      diffFilters: kind === 'set' ? fmt.DIFF_FILTERS_SET : fmt.DIFF_FILTERS_CATEGORY
    });

    if (!code) {
      this.setData({ loading: false, err: '缺少分类参数' });
      return;
    }
    if (title) wx.setNavigationBarTitle({ title: title });

    api.problemSets().then((index) => {
      var g = api.findGroup(index, kind, code);
      if (!g) {
        this.setData({ loading: false, err: '没有找到这份题单（可下拉刷新题库索引）' });
        return;
      }
      this.setData({
        group: g,
        problems: g.problems || [],
        loading: false
      }, () => this.apply());
      wx.setNavigationBarTitle({ title: g.title || title || '题单' });
    }).catch((e) => {
      this.setData({ loading: false, err: (e && e.message) || '题单加载失败' });
    });
  },

  onPullDownRefresh() {
    // 强制重取索引，再重新定位这份题单
    api.problemSets({ force: true }).then((index) => {
      var g = api.findGroup(index, this.data.kind, this.data.code);
      this.setData({ group: g, problems: (g && g.problems) || [], err: g ? '' : '没有找到这份题单' },
        () => this.apply());
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: '刷新失败', icon: 'none' });
    });
  },

  onSearch(e) { this.setData({ keyword: e.detail.value }, () => this.apply()); },

  setDiff(e) {
    var lv = e.currentTarget.dataset.k || '';
    this.setData({ diffLevel: lv }, () => this.apply());
  },

  apply() {
    var kw = (this.data.keyword || '').trim().toLowerCase();
    var lv = this.data.diffLevel;
    var list = this.data.problems || [];

    if (lv) list = list.filter(function (p) { return p.diffLevel === lv; });

    if (kw) {
      list = list.filter(function (p) {
        var hay = (p.title + ' ' + p.slug + ' ' + (p.tags || []).join(' ') + ' ' +
                   (p.knowledge || []).join(' ') + ' ' + p.provenance).toLowerCase();
        return hay.indexOf(kw) > -1;
      });
    }

    this.setData({ shown: list });
  },

  goDetail(e) {
    var slug = e.currentTarget.dataset.slug;
    if (!slug) return;
    wx.navigateTo({ url: '/pages/detail/detail?pid=' + encodeURIComponent(slug) });
  }
});
