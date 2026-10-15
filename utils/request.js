// utils/request.js —— 唯一发 HTTP 的地方。
//
// 约定：
//   · 后端统一信封 { code:'OK', message, data }，本层负责剥壳，调用方直接拿 data。
//   · 身份靠 cookie（PHPSESSID）。小程序不会自动持久化 cookie，
//     所以登录时抓 Set-Cookie，之后每个请求手动带 Cookie 头。
//   · 写请求后端会校验 Origin，固定补上。
//
// 失败时 reject 一个 { statusCode, code, message } 对象，页面可据此判断。

var store = require('./store.js');

// 默认超时：判题机在后端跑，普通接口 15s 足够
var TIMEOUT = 15000;

function baseUrl() {
  return getApp().globalData.baseUrl;
}

function makeError(statusCode, code, message) {
  return {
    statusCode: statusCode || 0,
    code: code || '',
    message: message || '',
    toString: function () { return message || ('HTTP ' + statusCode); }
  };
}

function toast(title) {
  wx.showToast({ title: title, icon: 'none', duration: 2000 });
}

/**
 * 从响应头里抓所有 Set-Cookie 的 name=value，拼成一条 Cookie 串。
 * 后端会同时下发多个 Set-Cookie（含清空用的空值），空值的要跳过。
 */
function captureCookies(header) {
  var raw = header['Set-Cookie'] || header['set-cookie'] || '';
  if (!raw) return '';
  var list = Array.isArray(raw) ? raw : String(raw).split(/,(?=[^;]+=)/);
  var pairs = [];
  list.forEach(function (line) {
    var nv = String(line).split(';')[0].trim();
    var idx = nv.indexOf('=');
    if (idx < 0) return;
    var name = nv.slice(0, idx).trim();
    var val = nv.slice(idx + 1).trim();
    if (!name || !val) return; // 空值 = 后端在清 cookie，不要存
    pairs.push(name + '=' + val);
  });
  return pairs.join('; ');
}

function request(options) {
  var opts = options || {};
  var silent = !!opts.silent;

  return new Promise(function (resolve, reject) {
    var header = {
      'content-type': 'application/json',
      'Origin': baseUrl()
    };
    var cookie = store.getCookie();
    if (cookie) header['Cookie'] = cookie;
    if (opts.header) {
      Object.keys(opts.header).forEach(function (k) { header[k] = opts.header[k]; });
    }

    wx.request({
      url: baseUrl() + opts.url,
      method: opts.method || 'GET',
      data: opts.data || {},
      header: header,
      timeout: opts.timeout || TIMEOUT,

      success: function (res) {
        // 服务端可能刷新会话，随时抓一次
        var fresh = captureCookies(res.header || {});
        if (fresh) store.setCookie(fresh);

        var status = res.statusCode;
        var body = res.data;

        if (status === 401 || status === 403) {
          store.clear();
          if (!silent) toast('登录已失效，请重新登录');
          reject(makeError(status, 'UNAUTHORIZED', '登录已失效'));
          return;
        }

        if (status < 200 || status >= 300) {
          var msg = '请求失败 (' + status + ')';
          if (body && body.message) msg = body.message;
          else if (body && body.msg) msg = body.msg;
          else if (body && body.error) msg = body.error;
          if (!silent) toast(msg);
          reject(makeError(status, 'HTTP_ERROR', msg));
          return;
        }

        // 剥信封：{ code:'OK', data } -> data
        if (body && typeof body === 'object' && body.code !== undefined) {
          var code = body.code;
          var ok = (code === 'OK' || code === 0 || code === 200 || code === 'SUCCESS');
          if (!ok) {
            var em = body.message || body.msg || ('接口返回 ' + code);
            if (!silent) toast(em);
            reject(makeError(status, code, em));
            return;
          }
          resolve(body.data !== undefined ? body.data : body);
          return;
        }

        resolve(body);
      },

      fail: function (err) {
        var msg = '连不上后端，检查网络或地址';
        var em = (err && err.errMsg) || '';
        if (em.indexOf('timeout') > -1) msg = '请求超时';
        else if (em.indexOf('domain') > -1) msg = '域名未配置，检查后台设置';
        if (!silent) toast(msg);
        reject(makeError(0, 'NETWORK', msg));
      }
    });
  });
}

module.exports = {
  request: request,
  get: function (url, data, opts) {
    return request(Object.assign({ url: url, method: 'GET', data: data }, opts || {}));
  },
  post: function (url, data, opts) {
    return request(Object.assign({ url: url, method: 'POST', data: data }, opts || {}));
  },
  captureCookies: captureCookies
};
