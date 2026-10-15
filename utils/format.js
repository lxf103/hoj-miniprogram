// utils/format.js —— 纯函数：判题状态映射、语言映射、各种格式化。
// 关键坑：HOJ 的 /api/status 与 /api/submissions/{id} 返回的 result 是【数字】
// （4=通过），不是 'AC' 这种字符串。老代码拿数字去和 'AC' 比，永远不相等，
// 导致颜色、筛选、判题轮询全部失效。这里统一在 format 层做映射。

// ---- 判题结果：数字 -> 状态码 ----
// HOJ 沿用 HUSTOJ 的 result 编码
var RESULT_MAP = {
  0:  { code: 'PD',  cls: 'todo' }, // 等待判题
  1:  { code: 'PD',  cls: 'todo' }, // 等待重判
  2:  { code: 'CMP', cls: 'todo' }, // 编译中
  3:  { code: 'RUN', cls: 'todo' }, // 运行中
  4:  { code: 'AC',  cls: 'ac'   }, // 通过
  5:  { code: 'PE',  cls: 'pe'   }, // 格式错误
  6:  { code: 'WA',  cls: 'wa'   }, // 答案错误
  7:  { code: 'TLE', cls: 'tle'  }, // 时间超限
  8:  { code: 'MLE', cls: 'mle'  }, // 内存超限
  9:  { code: 'OLE', cls: 'ole'  }, // 输出超限
  10: { code: 'RE',  cls: 're'   }, // 运行错误
  11: { code: 'CE',  cls: 'ce'   }, // 编译错误
  12: { code: 'CO',  cls: 'todo' }, // 编译成功
  13: { code: 'TR',  cls: 'todo' }, // 测试运行
  14: { code: 'ID',  cls: 'todo' }  // 空闲
};

// 还在判题中的 result，轮询时要继续等
var PENDING_RESULTS = [0, 1, 2, 3];

// 各状态码的中文兜底（后端其实会返回 label，优先用后端的）
var RESULT_TEXT = {
  PD: '等待判题', CMP: '编译中', RUN: '运行中', AC: '通过',
  PE: '格式错误', WA: '答案错误', TLE: '时间超限', MLE: '内存超限',
  OLE: '输出超限', RE: '运行错误', CE: '编译错误', CO: '编译成功',
  TR: '测试运行', ID: '空闲'
};

/**
 * 归一化一条判题结果。
 * 文案优先用后端给的 label / result_label（中文且权威），
 * 样式 class 和短码用数字映射（可靠）。
 */
function resultInfo(result, label) {
  var n = Number(result);
  var m = RESULT_MAP[n];
  var code = m ? m.code : '';
  var cls = m ? m.cls : 'todo';
  var text = label || (code ? RESULT_TEXT[code] : '') || '未知';
  return { code: code, cls: cls, text: text, raw: result };
}

// 状态码 -> 数字，用于传给后端筛选（/api/status?result=4）
var CODE_TO_RESULT = {
  AC: 4, PE: 5, WA: 6, TLE: 7, MLE: 8, OLE: 9, RE: 10, CE: 11
};

/** 状态码转后端数字；空串/未知返回 '' 表示不筛选 */
function codeToResult(code) {
  if (!code) return '';
  var n = CODE_TO_RESULT[code];
  return n === undefined ? '' : n;
}

// ---- 题目难度 ----
// 题库里有【两套】难度编码，必须都认：
//   知识点分类（/api/problem-sets → categories）："L1-入门" … "L5-进阶"
//   专项题单（/api/problem-sets → standalone_sets）："easy" / "medium" / "hard"
var DIFF_MAP = {
  'L1-入门': { level: 'L1', label: '入门', cls: 'diff-l1' },
  'L2-基础': { level: 'L2', label: '基础', cls: 'diff-l2' },
  'L3-普及': { level: 'L3', label: '普及', cls: 'diff-l3' },
  'L4-提高': { level: 'L4', label: '提高', cls: 'diff-l4' },
  'L5-进阶': { level: 'L5', label: '进阶', cls: 'diff-l5' },
  'easy':    { level: 'easy',   label: '简单', cls: 'diff-l2' },
  'medium':  { level: 'medium', label: '中等', cls: 'diff-l3' },
  'hard':    { level: 'hard',   label: '较难', cls: 'diff-l4' }
};

// 两种编码各自的筛选项（题库页按 tab 切换）
var DIFF_FILTERS_CATEGORY = [
  { key: '', label: '全部' },
  { key: 'L1', label: '入门' },
  { key: 'L2', label: '基础' },
  { key: 'L3', label: '普及' },
  { key: 'L4', label: '提高' },
  { key: 'L5', label: '进阶' }
];
var DIFF_FILTERS_SET = [
  { key: '', label: '全部' },
  { key: 'easy', label: '简单' },
  { key: 'medium', label: '中等' },
  { key: 'hard', label: '较难' }
];

/** 难度字符串 -> { level, label, cls }；认不出就返回未分级 */
function diffInfo(d) {
  if (!d) return { level: '', label: '未分级', cls: '' };
  var m = DIFF_MAP[d];
  if (m) return m;
  // 兜底：形如 "L3" 或 "L3-xxx"
  var mm = String(d).match(/^(L[1-5])/);
  if (mm) {
    for (var k in DIFF_MAP) {
      if (DIFF_MAP[k].level === mm[1]) return DIFF_MAP[k];
    }
  }
  return { level: '', label: String(d), cls: '' };
}

/** 分类的 difficulty_count {L1:80,...} -> 有序数组，便于渲染 */
function diffBreakdown(dc) {
  if (!dc) return [];
  var out = [];
  ['L1', 'L2', 'L3', 'L4', 'L5'].forEach(function (k) {
    if (!dc[k]) return;
    var found = null;
    for (var key in DIFF_MAP) {
      if (DIFF_MAP[key].level === k) { found = DIFF_MAP[key]; break; }
    }
    out.push({
      level: k,
      label: found ? found.label : k,
      cls: found ? found.cls : '',
      count: dc[k]
    });
  });
  return out;
}

/** 是否通过（result=4）。教师成绩册里判断某题是否 AC 用 */
function isAccepted(result) {
  return Number(result) === 4;
}

/** 是否还在判题中（需要继续轮询） */
function isPending(result) {
  var n = Number(result);
  if (result === null || result === undefined || result === '') return true;
  return PENDING_RESULTS.indexOf(n) > -1;
}

// ---- 提交语言：提交时用字符串码（和 batch.allowed_languages 对齐） ----
var SUBMIT_LANGS = [
  { code: 'c',        label: 'C' },
  { code: 'cpp',      label: 'C++' },
  { code: 'java',     label: 'Java' },
  { code: 'python',   label: 'Python' },
  { code: 'javascript', label: 'JavaScript' },
  { code: 'go',       label: 'Go' }
];

// 展示用：数字 language -> 名字（接口一般会给 language_name，这里是兜底）
var LANG_ID_MAP = {
  0: 'C', 1: 'C++', 2: 'Pascal', 3: 'Java', 4: 'Ruby', 5: 'Bash',
  6: 'Python', 7: 'PHP', 8: 'Perl', 9: 'C#', 10: 'Obj-C',
  11: 'FreeBasic', 12: 'Schema', 13: 'Clang', 14: 'Clang++',
  15: 'Lua', 16: 'JavaScript', 17: 'Go'
};

/** 挑出该题允许的提交语言；allowed 为空则给全部 */
function langOptions(allowed) {
  if (!allowed || !allowed.length) return SUBMIT_LANGS.slice();
  var lower = allowed.map(function (x) { return String(x).toLowerCase(); });
  var picked = SUBMIT_LANGS.filter(function (l) { return lower.indexOf(l.code) > -1; });
  return picked.length ? picked : SUBMIT_LANGS.slice();
}

// ---- 格式化 ----

/** 判题耗时：后端单位是毫秒 */
function fmtTime(ms) {
  if (ms === null || ms === undefined || ms === '') return '—';
  var n = Number(ms);
  if (isNaN(n)) return String(ms);
  if (n < 1000) return n + 'ms';
  return (n / 1000).toFixed(2) + 's';
}

/** 判题内存：后端单位是 KB */
function fmtMemory(kb) {
  if (kb === null || kb === undefined || kb === '') return '—';
  var n = Number(kb);
  if (isNaN(n)) return String(kb);
  if (n < 1024) return n + 'KB';
  return (n / 1024).toFixed(1) + 'MB';
}

/** 题目的时间限制：detail 接口给的是【秒】(1.0) */
function fmtTimeLimit(sec) {
  if (sec === null || sec === undefined || sec === '') return '—';
  var n = Number(sec);
  if (isNaN(n)) return String(sec);
  if (n < 1) return Math.round(n * 1000) + 'ms';
  return n + 's';
}

/** 题目的内存限制：detail 接口给的是【MB】(128) */
function fmtMemoryLimit(mb) {
  if (mb === null || mb === undefined || mb === '') return '—';
  return mb + 'MB';
}

/** "2026-10-15 23:44:26" -> "10-15 23:44" */
function fmtDate(s) {
  if (!s) return '';
  var str = String(s);
  var m = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return str;
  return m[2] + '-' + m[3] + ' ' + m[4] + ':' + m[5];
}

/** 完整时间，详情页用 */
function fmtDateFull(s) {
  if (!s) return '';
  return String(s).replace('T', ' ');
}

/**
 * 作业截止状态。后端 batch 里有 due_at(字符串) 和 past_due(布尔)。
 * 返回 { text, cls } —— cls: 'urgent' 快到了 / 'over' 已截止 / 'open' 进行中 / '' 无期限
 */
function dueInfo(dueAt, pastDue) {
  if (!dueAt) return { text: '不限时', cls: '' };
  var text = fmtDate(dueAt) + ' 截止';
  if (pastDue) return { text: text + '（已截止）', cls: 'over' };
  // 剩余不到 24 小时算紧急
  var t = parseDate(dueAt);
  if (t) {
    var left = t.getTime() - Date.now();
    if (left > 0 && left < 24 * 3600 * 1000) return { text: text, cls: 'urgent' };
  }
  return { text: text, cls: 'open' };
}

/** 兼容 iOS 的日期解析（'2026-10-15 23:44:26' 在 iOS 上 new Date 会 NaN） */
function parseDate(s) {
  if (!s) return null;
  var str = String(s).replace('T', ' ').replace(/-/g, '/');
  var d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/** 通过率：后端 pass_rate 可能是 166.7 这种脏数据，夹到 0~100 */
function fmtPassRate(v) {
  if (v === null || v === undefined || v === '') return '';
  var n = Number(v);
  if (isNaN(n)) return '';
  if (n < 0) n = 0;
  if (n > 100) n = 100;
  return n.toFixed(1) + '%';
}

/** solved_status -> 中文 */
function solvedLabel(s) {
  var map = { passed: '已通过', attempted: '尝试过', unattempted: '未尝试' };
  return map[s] || '';
}

// ---- 提交详情里的逐测试点表格 ----
// error 字段形如：
// filename|size|result|memory|time
// --|--|--|--|--
// 1.in|5|AC|13208k|21ms
function parseCaseTable(error) {
  if (!error || typeof error !== 'string') return [];
  var lines = error.split('\n').filter(function (l) { return l.trim(); });
  if (lines.length <= 2) return [];
  var rows = [];
  for (var i = 2; i < lines.length; i++) {
    var c = lines[i].split('|');
    if (c.length < 5) continue;
    rows.push({ file: c[0], size: c[1], result: c[2], memory: c[3], time: c[4] });
  }
  return rows;
}

module.exports = {
  RESULT_MAP: RESULT_MAP,
  PENDING_RESULTS: PENDING_RESULTS,
  LANG_ID_MAP: LANG_ID_MAP,
  SUBMIT_LANGS: SUBMIT_LANGS,
  CODE_TO_RESULT: CODE_TO_RESULT,
  DIFF_MAP: DIFF_MAP,
  DIFF_FILTERS_CATEGORY: DIFF_FILTERS_CATEGORY,
  DIFF_FILTERS_SET: DIFF_FILTERS_SET,
  diffInfo: diffInfo,
  diffBreakdown: diffBreakdown,
  resultInfo: resultInfo,
  isAccepted: isAccepted,
  codeToResult: codeToResult,
  isPending: isPending,
  langOptions: langOptions,
  fmtTime: fmtTime,
  fmtMemory: fmtMemory,
  fmtTimeLimit: fmtTimeLimit,
  fmtMemoryLimit: fmtMemoryLimit,
  fmtDate: fmtDate,
  fmtDateFull: fmtDateFull,
  dueInfo: dueInfo,
  parseDate: parseDate,
  fmtPassRate: fmtPassRate,
  solvedLabel: solvedLabel,
  parseCaseTable: parseCaseTable
};
