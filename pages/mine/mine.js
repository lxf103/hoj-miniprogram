// pages/mine/mine.js —— 我的：真实用户资料、角色、提交统计、退出登录
var api = require('../../utils/api.js');
var store = require('../../utils/store.js');

Page({
  data: {
    logged: false,
    user: null,
    name: '',
    account: '',
    role: '',
    isTeacher: false,
    avatar: '?',
    stats: { submissions: 0, accepted: 0, courses: 0 },
    baseUrl: '',
    version: '1.0.0'
  },

  onShow() { this.refresh(); },

  onPullDownRefresh() {
    this.refresh().then(function () { wx.stopPullDownRefresh(); });
  },

  refresh() {
    var logged = store.isLogged();
    var u = store.getUser() || {};

    this.setData({
      logged: logged,
      user: logged ? u : null,
      name: store.displayName() || '未登录',
      account: u.user || u.username || '',
      role: store.roleText(),
      isTeacher: store.isTeacher(),
      avatar: logged ? store.avatarText() : '?',
      baseUrl: getApp().globalData.baseUrl
    });

    if (!logged) {
      this.setData({ stats: { submissions: 0, accepted: 0, courses: 0 } });
      return Promise.resolve();
    }

    // 并行取统计：总数、AC 数（result=4）、课程数
    return Promise.all([
      api.submissions({ page: 1, pageSize: 1 }).catch(function () { return { total: 0 }; }),
      api.submissions({ page: 1, pageSize: 1, result: 4 }).catch(function () { return { total: 0 }; }),
      api.courses().catch(function () { return []; })
    ]).then((res) => {
      this.setData({
        stats: {
          submissions: res[0].total || 0,
          accepted: res[1].total || 0,
          courses: (res[2] || []).length
        }
      });
    });
  },

  // ---- 菜单 ----
  goLogin() { store.toLogin('/pages/mine/mine'); },
  goCourses() { wx.switchTab({ url: '/pages/courses/courses' }); },
  goSubmissions() { wx.switchTab({ url: '/pages/submissions/submissions' }); },
  goProblems() { wx.switchTab({ url: '/pages/problems/problems' }); },

  clearDrafts() {
    wx.showModal({
      title: '清除本地草稿',
      content: '会删掉各题未提交的代码草稿，确定吗？',
      success: (r) => {
        if (!r.confirm) return;
        try {
          var info = wx.getStorageInfoSync();
          (info.keys || []).forEach(function (k) {
            if (k.indexOf('hoj_draft_') === 0) wx.removeStorageSync(k);
          });
          wx.showToast({ title: '已清除', icon: 'none' });
        } catch (e) {
          wx.showToast({ title: '清除失败', icon: 'none' });
        }
      }
    });
  },

  clearBankIndex() {
    wx.showModal({
      title: '更新题库索引',
      content: '清掉本地缓存的分类与题单，下次进入题库会重新拉取（约 2.5MB）。',
      success: (r) => {
        if (!r.confirm) return;
        api.clearProblemSetsCache();
        wx.showToast({ title: '已清除，去题库看看', icon: 'none' });
      }
    });
  },

  about() {
    wx.showModal({
      title: 'HOJ 教学平台',
      content: '小程序端 v' + this.data.version + '\n后端：' + this.data.baseUrl +
        '\n\n注意：当前为内网 http 地址，仅供开发调试；正式发布需改为 https 已备案域名。',
      showCancel: false
    });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出当前账号吗？',
      success: (r) => {
        if (!r.confirm) return;
        api.logout();
        this.setData({
          logged: false, user: null, name: '未登录', account: '',
          role: '未登录', isTeacher: false, avatar: '?',
          stats: { submissions: 0, accepted: 0, courses: 0 }
        });
        wx.showToast({ title: '已退出', icon: 'none' });
      }
    });
  }
});
