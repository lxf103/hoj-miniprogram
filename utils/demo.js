// utils/demo.js —— 演示模式：不依赖后端，内置一套与真实接口【同构】的样例数据。
//
// 为什么需要：体验版的 request 合法域名必须 https、不能是 IP、且要备案，
// 而真实后端在内网 http://10.249.12.21:3100，体验版根本连不上。
// 演示模式让任何人、任何网络打开都能看到完整的页面与流程。
//
// 开关在 app.js 的 globalData.demoMode。关掉即切回真实接口（页面代码零改动）。
//
// 数据口径：题库来自真实抓取的 /api/problem-sets（见 demo-bank.js），
// 其余结构照真实接口的返回字段 1:1 复刻（我实测抓过每一个）。

var bank = require('./demo-bank.js');

// ---------------- 小工具 ----------------

function clone(x) { return JSON.parse(JSON.stringify(x)); }

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function stamp(offsetSec) {
  var d = new Date(Date.now() + (offsetSec || 0) * 1000);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
         pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function allGroups() { return (bank.categories || []).concat(bank.sets || []); }

function findGroup(kind, code) {
  var pool = kind === 'set' ? bank.sets : bank.categories;
  for (var i = 0; i < pool.length; i++) if (pool[i].code === code) return pool[i];
  return null;
}

/** 从某个分类/题单里取前 n 道题，用于拼作业 */
function takeProblems(code, n, kind) {
  var g = findGroup(kind || 'category', code);
  if (!g) return [];
  return g.problems.slice(0, n || g.problems.length);
}

// 数字 problem_id <-> slug 的映射（作业题用数字 id，真实接口也是这样）
var idToSlug = {};
var nextPid = 1001;

function assignId(slug) {
  // 稳定的合成 id
  var h = 0;
  for (var i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 9000;
  var pid = 1000 + h;
  idToSlug[pid] = slug;
  return pid;
}

// ---------------- 人物 ----------------

var TEACHER = {
  user: 'admin', nick: '教学管理员', role: 'teacher',
  roles: ['admin', 'teacher'], portal: 'teacher',
  home: '/management/courses', auth_source: 'demo'
};
var STUDENT = {
  user: 'student02', nick: '学生2号', role: 'student',
  roles: ['student'], portal: 'student',
  home: '/courses', auth_source: 'demo'
};

// ---------------- 课程 ----------------

var COURSES = [
  { course_id: 101, code: 'CSE-201', name: '数据结构与算法', title: '数据结构与算法',
    term: '2026-秋', section: '01', credit: 3, status: 'active', teacher_id: 'admin',
    offering_id: 101, role: 'teacher' },
  { course_id: 102, code: 'CSE-101', name: '程序设计基础', title: '程序设计基础',
    term: '2026-秋', section: '02', credit: 4, status: 'active', teacher_id: 'admin',
    offering_id: 102, role: 'teacher' },
  { course_id: 103, code: 'CSE-305', name: '算法竞赛进阶', title: '算法竞赛进阶',
    term: '2026-秋', section: '01', credit: 2, status: 'active', teacher_id: 'admin',
    offering_id: 103, role: 'teacher' }
];

// 学生视角看到的课（同一门课，role 不同）
var STUDENT_COURSES = [
  { course_id: 101, code: 'CSE-201', name: '数据结构与算法', title: '数据结构与算法',
    term: '2026-秋', section: '01', credit: 3, status: 'active', teacher_id: 'admin',
    offering_id: 101, role: 'student' }
];

// ---------------- 作业批次 ----------------
// 题目直接取自演示题库，保证点进去能看到题面

function mkProblems(code, kind, offsetId) {
  return takeProblems(code, 5, kind).map(function (p, i) {
    return {
      batch_problem_id: (offsetId || 0) + i + 1,
      problem_id: assignId(p.slug),
      slug: p.slug,
      seq: i + 1,
      score: 100.0,
      required: true,
      title: p.title,
      hint: p.provenance || '',
      defunct: 'N',
      source: 'bank:' + p.slug,
      attempts: 0,
      passed: false,
      has_previous_ac: false
    };
  });
}

var BATCHES = {
  201: {
    batch: { batch_id: 201, offering_id: 101, seq: 1, title: '第一次作业 · 基础语法与输入输出',
      description: null, open_at: null, due_at: '2026-11-05 23:59:00', allow_late: true,
      ai_enabled: false, status: 'published', source_ref: 'library:demo-201',
      read_only: false, allowed_languages: ['c', 'cpp', 'java', 'python'], past_due: false },
    code: '01-basic-io', kind: 'category'
  },
  202: {
    batch: { batch_id: 202, offering_id: 101, seq: 2, title: '第二次作业 · 分支与循环结构',
      description: '覆盖分支、循环与嵌套迭代。', open_at: null, due_at: '2026-11-19 23:59:00',
      allow_late: true, ai_enabled: true, status: 'published', source_ref: 'library:demo-202',
      read_only: false, allowed_languages: ['c', 'cpp', 'java', 'python'], past_due: false },
    code: '02-branching', kind: 'category'
  },
  203: {
    batch: { batch_id: 203, offering_id: 101, seq: 3, title: '实验一 · 一维数组与统计',
      description: null, open_at: null, due_at: '2026-10-18 23:59:00', allow_late: true,
      ai_enabled: false, status: 'published', source_ref: 'library:demo-203',
      read_only: false, allowed_languages: ['c', 'cpp', 'java', 'python'], past_due: true },
    code: '05-array-1d', kind: 'category'
  },
  204: {
    batch: { batch_id: 204, offering_id: 102, seq: 1, title: '练习一 · 基础语法',
      description: null, open_at: null, due_at: '2026-11-12 23:59:00', allow_late: true,
      ai_enabled: false, status: 'published', source_ref: 'library:demo-204',
      read_only: false, allowed_languages: ['c', 'cpp', 'python'], past_due: false },
    code: '01-basic-io', kind: 'category'
  },
  205: {
    batch: { batch_id: 205, offering_id: 103, seq: 1, title: '专题一 · 动态规划·背包模型',
      description: '0/1 背包、完全背包与变形。', open_at: null, due_at: '2026-11-26 23:59:00',
      allow_late: false, ai_enabled: true, status: 'published', source_ref: 'library:demo-205',
      read_only: false, allowed_languages: ['cpp', 'java', 'python'], past_due: false },
    code: '20-dp-knapsack', kind: 'category'
  }
};

// 每个批次的学生完成情况（服务端 staff 字段）
var BATCH_STAFF = {
  201: { submitted_count: 28, completed_count: 21, submission_rate: 87.5, completion_rate: 65.6 },
  202: { submitted_count: 15, completed_count: 6, submission_rate: 46.9, completion_rate: 18.8 },
  203: { submitted_count: 32, completed_count: 25, submission_rate: 100.0, completion_rate: 78.1 },
  204: { submitted_count: 40, completed_count: 30, submission_rate: 88.9, completion_rate: 66.7 },
  205: { submitted_count: 9, completed_count: 3, submission_rate: 50.0, completion_rate: 16.7 }
};

var OFFERING_STUDENT_COUNT = { 101: 32, 102: 45, 103: 18 };

function offeringBatches(oid) {
  var list = [];
  Object.keys(BATCHES).forEach(function (k) {
    var b = BATCHES[k].batch;
    if (b.offering_id !== oid) return;
    var staff = BATCH_STAFF[k] || { submitted_count: 0, completed_count: 0, submission_rate: 0, completion_rate: 0 };
    var probs = mkProblems(BATCHES[k].code, BATCHES[k].kind, Number(k) * 100);
    list.push(Object.assign({}, b, {
      problem_count: probs.length,
      done: 0,
      student_count: OFFERING_STUDENT_COUNT[oid] || 0,
      staff: staff
    }));
  });
  return list;
}

function offeringById(oid) {
  var c = null;
  for (var i = 0; i < COURSES.length; i++) if (COURSES[i].offering_id === oid) c = COURSES[i];
  if (!c) return null;
  return {
    offering_id: c.offering_id, course_id: c.course_id, course_code: c.code,
    course_name: c.name, term: c.term, section: c.section, title: c.title,
    teacher_id: c.teacher_id, status: 'active',
    created_at: '2026-09-01 10:00:00', updated_at: '2026-10-28 16:20:00',
    role: state.user && state.user.role === 'student' ? 'student' : 'teacher'
  };
}

// ---------------- 学生名单 / 成绩册 ----------------

var NAMES = ['魏小雨', '陈嘉禾', '林一鸣', '赵思远', '孙可欣', '周子豪', '吴静怡', '郑奕辰',
  '何雨桐', '马嘉伦', '高于飞', '徐若涵', '朱星辰', '胡佳宁', '郭一诺', '罗子涵',
  '梁思成', '宋雨薇', '唐子谦', '许安然', '邓浩宇', '冯乐怡', '曹一铭', '彭欣悦',
  '曾天宇', '萧若曦', '田嘉懿', '董雨泽', '潘子墨', '袁诗涵', '蒋逸凡', '韩雨琪'];

function rosterFor(oid) {
  var n = OFFERING_STUDENT_COUNT[oid] || 0;
  var out = [];
  for (var i = 0; i < n && i < NAMES.length; i++) {
    var passed = (i * 7 + oid) % 9;
    var attempts = passed + ((i * 3) % 5);
    out.push({
      enrollment_id: 5000 + oid * 100 + i,
      offering_id: oid,
      user_id: '2024' + pad(3) + pad(i + 1) + '0' + (i % 9),
      role: 'student',
      student_no: '2024' + (3100 + i),
      status: 'active',
      created_at: '2026-09-02 09:00:00',
      nick: NAMES[i],
      school: 'HITSZ',
      passed: passed,
      attempts: attempts,
      last_active: attempts > 0 ? stamp(-(i * 3600 + 600)) : null
    });
  }
  return out;
}

/** 某个学生在某个班的成绩册 —— 结构与真实接口一致 */
function progressFor(oid, uid) {
  var roster = rosterFor(oid);
  var stu = null;
  for (var i = 0; i < roster.length; i++) if (roster[i].user_id === uid) stu = roster[i];
  if (!stu) stu = { user_id: uid, student_no: uid, nick: uid };

  var batches = offeringBatches(oid).map(function (b, bi) {
    var probs = mkProblems(BATCHES[b.batch_id].code, BATCHES[b.batch_id].kind, b.batch_id * 100);
    var totalWeight = probs.length * 100;
    var score = 0;
    var items = probs.map(function (p, pi) {
      // 用学生序号 + 题目序号造一个稳定但多样的完成情况
      var seed = (stu.user_id.length + bi * 3 + pi * 5) % 4;
      var submitted = seed !== 0;
      var result = null, label = '未提交', attempts = 0, sub = null, sc = null;
      if (submitted) {
        attempts = 1 + (seed % 3);
        if (seed === 1) { result = 4; label = '通过'; sc = 100; }
        else if (seed === 2) { result = 6; label = '答案错误'; sc = 0; }
        else { result = 7; label = '时间超限'; sc = 0; }
        sub = 80000 + bi * 100 + pi;
        if (sc) score += sc;
      }
      return {
        problem_id: p.problem_id, title: p.title, weight: 100.0,
        score: sc, contribution: sc ? sc / 2 : 0.0,
        submission_id: sub, result: result, label: label, attempts: attempts
      };
    });
    return {
      batch_id: b.batch_id, title: b.title, score: score, total_weight: totalWeight,
      problems: items
    };
  });

  return {
    offering_id: oid,
    student: { user_id: stu.user_id, student_no: stu.student_no, nick: stu.nick },
    batches: batches
  };
}

// ---------------- 提交记录 ----------------

var LANG_NAMES = { 0: 'C', 1: 'C++', 3: 'Java', 6: 'Python' };

// 预置一些历史提交，让「我的提交」看起来是真的
var SEED_SUBMISSIONS = [
  { sid: 90231, key: '01-basic-io-p01', result: 4, time: 12, memory: 3408, lang: 1, ago: -86400 * 3 },
  { sid: 90244, key: '01-basic-io-p41', result: 6, time: 8, memory: 3200, lang: 1, ago: -86400 * 3 + 600 },
  { sid: 90251, key: '02-branching-p01', result: 4, time: 15, memory: 3512, lang: 6, ago: -86400 * 2 },
  { sid: 90266, key: '05-array-1d-p01', result: 7, time: 1000, memory: 8192, lang: 6, ago: -86400 * 2 + 900 },
  { sid: 90278, key: 'dfby-p01-p01', result: 4, time: 10, memory: 3344, lang: 0, ago: -86400 },
  { sid: 90290, key: '11-sorting-p01', result: 11, time: 0, memory: 0, lang: 1, ago: -3600 * 5 },
  { sid: 90301, key: '03-loops-p01', result: 4, time: 18, memory: 3620, lang: 3, ago: -3600 * 2 },
  { sid: 90310, key: '20-dp-knapsack-p01', result: 6, time: 22, memory: 4100, lang: 1, ago: -1800 }
];

function detailOfSlug(slug) { return bank.details[slug] || { title: slug }; }

function slugToPid(slug) {
  var h = 0;
  for (var i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 9000;
  return 1000 + h;
}

function buildSubmission(seed) {
  var d = detailOfSlug(seed.key);
  return {
    solution_id: seed.sid,
    problem_id: seed.pid != null ? seed.pid : slugToPid(seed.key),
    problem_title: d.title,
    user_id: state.user ? state.user.user : 'student02',
    nick: state.user ? state.user.nick : '学生2号',
    result: seed.result,
    result_label: RESULT_LABELS[seed.result] || '',
    time: seed.time,
    memory: seed.memory,
    language: seed.lang,
    language_name: LANG_NAMES[seed.lang] || '',
    code_length: seed.codeLength != null ? seed.codeLength : 220,
    in_date: stamp(seed.ago || -600),
    offering_id: null,
    offering_title: '',
    batch_id: null,
    can_view_code: true,
    _slug: seed.key,
    _code: seed.code
  };
}

var RESULT_LABELS = {
  0: '等待判题', 2: '编译中', 3: '运行中', 4: '通过', 5: '格式错误', 6: '答案错误',
  7: '时间超限', 8: '内存超限', 9: '输出超限', 10: '运行错误', 11: '编译错误'
};

// ---------------- 运行时状态 ----------------

var state = {
  user: TEACHER,
  // solution_id -> {slug, code, lang, createdAt, readyAt, result, time, memory}
  subs: {},
  nextSid: 91000,
  seeded: false
};

function ensureSeeded() {
  if (state.seeded) return;
  SEED_SUBMISSIONS.forEach(function (s) { state.subs[s.sid] = Object.assign({ settled: true }, s); });
  state.seeded = true;
}

// ---------------- 判题模拟 ----------------

var CASE_TEMPLATE = [
  { file: '1.in', size: 5 }, { file: '2.in', size: 4 }, { file: '3.in', size: 16 }
];

function caseTable(result) {
  var code = RESULT_LABELS[result] && result === 4 ? 'AC' :
    (result === 6 ? 'WA' : result === 7 ? 'TLE' : result === 11 ? 'CE' : 'AC');
  var rows = CASE_TEMPLATE.map(function (c, i) {
    // 首个失败点之后都标成失败态
    var r = (result === 4 || i < 2) ? 'AC' : code;
    return c.file + '|' + c.size + '|' + r + '|13208k|' + (21 + i * 3) + 'ms';
  });
  return 'filename|size|result|memory|time\n--|--|--|--|--\n' + rows.join('\n') + '\n\n';
}

/** 提交后按代码长度给一个稳定的结果，并延迟 2 秒“判题” */
function judgeResult(code) {
  var n = (code || '').trim().length;
  if (n < 12) return 11;      // 编译错误
  if (n < 40) return 6;       // 答案错误
  return 4;                   // 通过
}

function makeSubmission(slug, lang, code) {
  ensureSeeded();
  var sid = ++state.nextSid;
  state.subs[sid] = {
    sid: sid, key: slug, lang: lang, code: code,
    result: 0, time: 0, memory: 0, ago: 0,
    readyAt: Date.now() + 2000,
    settled: false
  };
  return sid;
}

function settleIfReady(rec) {
  if (rec.settled) return rec;
  if (Date.now() < rec.readyAt) return rec;
  var r = judgeResult(rec.code);
  rec.result = r;
  rec.time = r === 7 ? 1000 : (10 + (r % 9) * 2);
  rec.memory = 3300 + (r % 5) * 260;
  rec.codeLength = (rec.code || '').length;
  rec.settled = true;
  return rec;
}

// ---------------- 题库：公开题（平铺列表） ----------------

var PUBLIC = (function () {
  var picks = [
    ['01-basic-io', 'category'], ['02-branching', 'category'], ['05-array-1d', 'category'],
    ['11-sorting', 'category'], ['20-dp-knapsack', 'category'], ['dfby-p01', 'set']
  ];
  var out = [];
  picks.forEach(function (pk) {
    takeProblems(pk[0], 4, pk[1]).forEach(function (p, i) {
      out.push({
        problem_id: slugToPid(p.slug),
        key: p.slug,
        slug: p.slug,
        title: p.title,
        source: 'bank:' + p.slug,
        accepted: 30 + ((out.length * 13) % 70),
        submit: 40 + ((out.length * 17) % 90),
        pass_rate: 40 + ((out.length * 7) % 55),
        solved_status: i === 0 ? 'passed' : (i === 1 ? 'attempted' : 'unattempted')
      });
    });
  });
  return out;
})();

// ---------------- 路由 ----------------

function ok(data) { return Promise.resolve(data); }
function fail(code, message) {
  var e = { statusCode: code, code: code, message: message };
  return Promise.reject(e);
}

/**
 * 命中则返回 Promise，未命中返回 null（由 request.js 走真实网络）。
 */
function handle(method, url, data) {
  data = data || {};
  var m;

  // ---- 登录 ----
  if (method === 'POST' && url === '/api/account/login') {
    var uname = String(data.username || '');
    state.user = /admin|teacher|教师/i.test(uname) ? clone(TEACHER) : clone(STUDENT);
    return ok({ user: state.user.user });
  }

  // ---- 当前用户 ----
  if (method === 'GET' && url === '/api/me') {
    return ok(clone(state.user));
  }

  // ---- 课程 ----
  if (method === 'GET' && url === '/api/courses') {
    var list = state.user.role === 'student' ? STUDENT_COURSES : COURSES;
    return ok(clone(list));
  }

  // ---- 题库索引 ----
  if (method === 'GET' && url === '/api/problem-sets') {
    return ok({
      categories: clone(bank.categories),
      standalone_sets: clone(bank.sets)
    });
  }

  // ---- 作业概览 ----
  if (method === 'GET' && url.indexOf('/api/management/assignment-overview') === 0) {
    var ov = COURSES.map(function (c) {
      var bs = offeringBatches(c.offering_id);
      return {
        offering_id: c.offering_id,
        assignment_count: bs.length,
        open_count: bs.filter(function (b) { return !b.past_due; }).length,
        recent: bs.map(function (b) {
          return {
            batch_id: b.batch_id, title: b.title, status: b.status,
            open_at: b.open_at, due_at: b.due_at, accepting: !b.past_due
          };
        })
      };
    });
    return ok(ov);
  }

  // ---- 教学班详情 ----
  m = url.match(/^\/api\/offerings\/(\d+)/);
  if (method === 'GET' && m && url.indexOf('/students/') === -1 && url.indexOf('/students') === -1) {
    var oid = Number(m[1]);
    var off = offeringById(oid);
    if (!off) return fail(404, '教学班不存在');
    return ok({
      offering: off,
      batches: offeringBatches(oid),
      total_students: OFFERING_STUDENT_COUNT[oid] || 0,
      insights: { students: [], results: [] }
    });
  }

  // ---- 学生名单 ----
  m = url.match(/^\/api\/offerings\/(\d+)\/students$/);
  if (method === 'GET' && m) {
    var oid2 = Number(m[1]);
    return ok({ offering: offeringById(oid2), students: rosterFor(oid2) });
  }

  // ---- 学生成绩册 ----
  m = url.match(/^\/api\/offerings\/(\d+)\/students\/([^\/]+)\/progress$/);
  if (method === 'GET' && m) {
    return ok(progressFor(Number(m[1]), decodeURIComponent(m[2])));
  }

  // ---- 作业批次 ----
  m = url.match(/^\/api\/batches\/(\d+)$/);
  if (method === 'GET' && m) {
    var bid = Number(m[1]);
    var bd = BATCHES[bid];
    if (!bd) return fail(404, '作业不存在');
    return ok({
      batch: clone(bd.batch),
      offering: offeringById(bd.batch.offering_id),
      problems: mkProblems(bd.code, bd.kind, bid * 100)
    });
  }

  // ---- 公开题列表 ----
  if (method === 'GET' && url === '/api/public-problems') {
    var kw = (data.keyword || '').trim().toLowerCase();
    var items = PUBLIC.filter(function (p) {
      return !kw || p.title.toLowerCase().indexOf(kw) > -1;
    });
    var page = Number(data.page || 1);
    var size = Number(data.page_size || 20);
    return ok({
      items: clone(items.slice((page - 1) * size, page * size)),
      total: items.length, page: page, page_size: size
    });
  }

  // ---- 提交（POST）----
  m = url.match(/^\/api\/public-problems\/([^\/]+)\/submissions$/);
  if (method === 'POST' && m) {
    var key = decodeURIComponent(m[1]);
    if (!bank.details[key]) return fail(404, '题目不存在');
    var sid = makeSubmission(key, data.language, data.code);
    return ok({ submission_id: sid });
  }

  // ---- 题面详情 ----
  m = url.match(/^\/api\/public-problems\/([^\/]+)$/);
  if (method === 'GET' && m) {
    var k = decodeURIComponent(m[1]);
    var slug = bank.details[k] ? k : idToSlug[Number(k)];
    var det = slug ? bank.details[slug] : null;
    if (!det) return fail(404, '题目不存在');
    return ok({
      key: slug, numeric_pid: slugToPid(slug), slug: slug,
      title: det.title,
      description: det.statement || '',
      input: '', output: '',
      samples: det.samples || [],
      hint: (det.knowledge || []).join('、'),
      difficulty: det.difficulty || '',
      tags: det.tags || [],
      provenance: det.provenance || '',
      category_name: '',
      time_limit: 1.0, memory_limit: 128,
      accepted: 30, submit: 45,
      solved_status: 'unattempted'
    });
  }

  // ---- 提交列表 ----
  if (method === 'GET' && url === '/api/status') {
    ensureSeeded();
    var arr = Object.keys(state.subs).map(function (k) {
      return settleIfReady(state.subs[k]);
    }).sort(function (a, b) { return b.sid - a.sid; }).map(buildSubmission);

    if (data.problem_id) arr = arr.filter(function (s) { return String(s.problem_id) === String(data.problem_id); });
    if (data.language !== undefined && data.language !== '') arr = arr.filter(function (s) { return String(s.language) === String(data.language); });
    if (data.result !== undefined && data.result !== '') arr = arr.filter(function (s) { return String(s.result) === String(data.result); });

    var pg = Number(data.page || 1);
    var ps = Number(data.page_size || 20);
    return ok({
      items: clone(arr.slice((pg - 1) * ps, pg * ps)),
      total: arr.length, page: pg, page_size: ps
    });
  }

  // ---- 单条提交 ----
  m = url.match(/^\/api\/submissions\/(\d+)\/code$/);
  if (method === 'GET' && m) {
    ensureSeeded();
    var rec0 = state.subs[Number(m[1])];
    if (!rec0) return fail(404, '提交不存在');
    settleIfReady(rec0);
    return ok({
      solution_id: rec0.sid,
      user_id: state.user.user,
      nick: state.user.nick,
      code_length: (rec0.code || SAMPLE_CODE).length,
      in_date: stamp(rec0.ago || 0),
      problem_id: slugToPid(rec0.key),
      problem_title: detailOfSlug(rec0.key).title,
      result: rec0.result,
      result_label: RESULT_LABELS[rec0.result] || '',
      time: rec0.time, memory: rec0.memory,
      language: rec0.lang, language_name: LANG_NAMES[rec0.lang] || 'C++',
      code: rec0.code || SAMPLE_CODE,
      compiled: true
    });
  }

  m = url.match(/^\/api\/submissions\/(\d+)$/);
  if (method === 'GET' && m) {
    ensureSeeded();
    var rec = state.subs[Number(m[1])];
    if (!rec) return fail(404, '提交不存在');
    settleIfReady(rec);
    return ok({
      submission_id: rec.sid,
      problem_id: slugToPid(rec.key),
      user_id: state.user.user,
      result: rec.result,
      label: RESULT_LABELS[rec.result] || '',
      time: rec.time, memory: rec.memory,
      language: rec.lang,
      in_date: stamp(rec.ago || 0),
      offering_id: null, batch_id: null,
      error: rec.settled ? caseTable(rec.result) : ''
    });
  }

  return null;
}

var SAMPLE_CODE =
  '#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n' +
  '    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}\n';

module.exports = {
  handle: handle,
  TEACHER: TEACHER,
  STUDENT: STUDENT,
  SAMPLE_CODE: SAMPLE_CODE
};
