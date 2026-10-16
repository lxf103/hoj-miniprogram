// utils/api.js —— 领域接口层：一个函数对应一个后端接口，顺便把返回捏成页面好用的形状。
// 页面里不要再出现裸 url 字符串。
//
// 已实测通过的后端接口（10.249.12.21:3100）：
//   POST /api/account/login                       -> 下发 PHPSESSID
//   GET  /api/me                                  -> { user, roles, portal, home }
//   GET  /api/courses                             -> 课程/教学班列表（带 role）
//   GET  /api/offerings/{oid}                     -> { offering, batches[], total_students, insights }
//   GET  /api/batches/{bid}                       -> { batch, offering, problems[] }
//   GET  /api/management/assignment-overview      -> [{ offering_id, assignment_count, open_count, recent[] }]
//   GET  /api/public-problems?page=&page_size=&keyword=
//   GET  /api/public-problems/{key}               -> 题面详情（samples/time_limit/memory_limit）
//   POST /api/public-problems/{key}/submissions   { language, code } -> { submission_id }
//   GET  /api/status?page=&page_size=&only_mine=1 -> 提交列表（result 是数字！）
//   GET  /api/submissions/{id}                    -> 单条提交（含逐测试点 error）

var http = require('./request.js');
var fmt = require('./format.js');

// ---------------- 归一化 ----------------

function normalizeProblem(p) {
  p = p || {};
  var id = p.problem_id != null ? p.problem_id : p.numeric_pid;
  return {
    id: id,
    key: p.key || p.slug || (id != null ? String(id) : ''),
    title: p.title || '(未命名题目)',
    source: p.source || '',
    hint: p.hint || '',
    accepted: p.accepted != null ? p.accepted : 0,
    submit: p.submit != null ? p.submit : 0,
    passRate: fmt.fmtPassRate(p.pass_rate),
    solved: p.solved_status || '',
    solvedText: fmt.solvedLabel(p.solved_status)
  };
}

function normalizeProblemDetail(d) {
  d = d || {};
  var base = normalizeProblem(d);
  base.description = d.description || '';
  base.input = d.input || '';
  base.output = d.output || '';
  base.samples = d.samples || [];
  base.difficulty = d.difficulty || '';
  base.tags = d.tags || [];
  base.categoryName = d.category_name || '';
  base.provenance = d.provenance || '';
  base.timeLimit = fmt.fmtTimeLimit(d.time_limit);
  base.memoryLimit = fmt.fmtMemoryLimit(d.memory_limit);
  base.numericPid = d.numeric_pid != null ? d.numeric_pid : base.id;
  return base;
}

function normalizeSubmission(s) {
  s = s || {};
  var r = fmt.resultInfo(s.result, s.result_label || s.label);
  return {
    id: s.solution_id != null ? s.solution_id : s.submission_id,
    problemId: s.problem_id,
    title: s.problem_title || '',
    nick: s.nick || '',
    userId: s.user_id || '',
    resultRaw: s.result,
    status: r.code,
    statusText: r.text,
    statusCls: r.cls,
    pending: fmt.isPending(s.result),
    languageId: s.language,
    language: s.language_name || fmt.LANG_ID_MAP[s.language] || '',
    codeLength: s.code_length != null ? s.code_length : '',
    time: fmt.fmtTime(s.time),
    memory: fmt.fmtMemory(s.memory),
    timeRaw: s.time,
    memoryRaw: s.memory,
    inDate: s.in_date || '',
    inDateText: fmt.fmtDate(s.in_date),
    offeringId: s.offering_id,
    offeringTitle: s.offering_title || '',
    batchId: s.batch_id,
    canViewCode: s.can_view_code !== false
  };
}

function normalizeCourse(c) {
  c = c || {};
  var roleMap = { teacher: '教师', student: '学生', ta: '助教', admin: '管理员' };
  return {
    offeringId: c.offering_id != null ? c.offering_id : c.course_id,
    courseId: c.course_id,
    code: c.code || '',
    name: c.name || c.title || '未命名课程',
    title: c.title || '',
    term: c.term || '',
    section: c.section || '',
    credit: c.credit,
    status: c.status || '',
    teacherId: c.teacher_id || '',
    role: c.role || '',
    roleText: roleMap[c.role] || c.role || ''
  };
}

function normalizeBatch(b) {
  b = b || {};
  return {
    id: b.batch_id != null ? b.batch_id : b.id,
    offeringId: b.offering_id,
    seq: b.seq,
    title: b.title || '未命名作业',
    description: b.description || '',
    openAt: b.open_at || '',
    dueAt: b.due_at || '',
    due: fmt.dueInfo(b.due_at, b.past_due),
    pastDue: !!b.past_due,
    allowLate: !!b.allow_late,
    aiEnabled: !!b.ai_enabled,
    status: b.status || '',
    readOnly: !!b.read_only,
    allowedLanguages: b.allowed_languages || [],
    problemCount: b.problem_count != null ? b.problem_count : null,
    done: b.done != null ? b.done : null,
    studentCount: b.student_count != null ? b.student_count : null,
    staff: b.staff || null
  };
}

function normalizeBatchProblem(p) {
  p = p || {};
  return {
    batchProblemId: p.batch_problem_id,
    problemId: p.problem_id,
    // 演示数据里作业题是 slug（真实接口是数字 id），detail 页两种都能吃
    slug: p.slug || '',
    key: p.slug || (p.problem_id != null ? String(p.problem_id) : ''),
    seq: p.seq,
    score: p.score,
    required: p.required !== false,
    title: p.title || '(未命名题目)',
    hint: p.hint || '',
    source: p.source || '',
    attempts: p.attempts != null ? p.attempts : 0,
    passed: !!p.passed,
    hasPreviousAc: !!p.has_previous_ac,
    defunct: p.defunct === 'Y'
  };
}

// ---------------- 接口 ----------------

/** 登录。成功后会由 request 层把 PHPSESSID 存进 store。 */
function login(username, password) {
  return http.post('/api/account/login', { username: username, password: password }, { silent: true });
}

/** 当前用户资料与角色 */
function me() {
  return http.get('/api/me', {}, { silent: true });
}

/** 我参与的教学班（教师=我教的，学生=我选的） */
function courses() {
  return http.get('/api/courses').then(function (d) {
    var arr = Array.isArray(d) ? d : ((d && (d.items || d.list)) || []);
    return arr.map(normalizeCourse);
  });
}

/** 教学班详情 + 作业批次列表 */
function offering(oid) {
  return http.get('/api/offerings/' + oid).then(function (d) {
    d = d || {};
    return {
      offering: d.offering || {},
      batches: (d.batches || []).map(normalizeBatch),
      totalStudents: d.total_students != null ? d.total_students : null,
      insights: d.insights || null
    };
  });
}

/** 单个作业批次 + 题目清单 */
function batch(bid) {
  return http.get('/api/batches/' + bid).then(function (d) {
    d = d || {};
    return {
      batch: normalizeBatch(d.batch || {}),
      offering: d.offering || {},
      problems: (d.problems || []).map(normalizeBatchProblem)
    };
  });
}

/** 各教学班的作业概览（总览页统计用） */
function assignmentOverview() {
  return http.get('/api/management/assignment-overview').then(function (d) {
    var arr = Array.isArray(d) ? d : (d ? [d] : []);
    return arr;
  });
}

/** 题库分页列表 */
function problems(params) {
  params = params || {};
  var data = {
    page: params.page || 1,
    page_size: params.pageSize || 20
  };
  if (params.keyword) data.keyword = params.keyword;
  return http.get('/api/public-problems', data).then(function (d) {
    d = d || {};
    var items = Array.isArray(d) ? d : (d.items || []);
    return {
      items: items.map(normalizeProblem),
      total: d.total != null ? d.total : items.length,
      page: d.page || data.page,
      pageSize: d.page_size || data.page_size
    };
  });
}

/** 题面详情 */
function problem(key) {
  return http.get('/api/public-problems/' + key).then(function (d) {
    // 有的实现会包一层 { problem: {...} }
    if (d && d.problem) d = d.problem;
    return normalizeProblemDetail(d);
  });
}

/** 提交代码 -> submission_id */
function submit(key, language, code) {
  return http.post('/api/public-problems/' + key + '/submissions', {
    language: language,
    code: code
  }, { silent: true }).then(function (d) {
    d = d || {};
    return d.submission_id != null ? d.submission_id
      : (d.solution_id != null ? d.solution_id : (d.id != null ? d.id : null));
  });
}

/** 提交记录列表。筛选走后端：/api/status 支持 problem_id / language / result 参数 */
function submissions(params) {
  params = params || {};
  var data = {
    page: params.page || 1,
    page_size: params.pageSize || 20
  };
  if (params.onlyMine !== false) data.only_mine = true;
  if (params.problemId) data.problem_id = params.problemId;
  if (params.language) data.language = params.language;
  if (params.result !== '' && params.result !== undefined && params.result !== null) {
    data.result = params.result;
  }
  return http.get('/api/status', data).then(function (d) {
    d = d || {};
    var items = Array.isArray(d) ? d : (d.items || []);
    return {
      items: items.map(normalizeSubmission),
      total: d.total != null ? d.total : items.length,
      page: d.page || data.page,
      pageSize: d.page_size || data.page_size
    };
  });
}

/** 某教学班的学生名单（教师视角）：带 passed / attempts / last_active */
function students(oid) {
  return http.get('/api/offerings/' + oid + '/students').then(function (d) {
    d = d || {};
    var list = d.students || [];
    return {
      offering: d.offering || {},
      students: list.map(normalizeRosterStudent)
    };
  });
}

function normalizeRosterStudent(s) {
  s = s || {};
  return {
    userId: s.user_id || '',
    studentNo: s.student_no || '',
    nick: s.nick || '',
    school: s.school || '',
    role: s.role || '',
    status: s.status || '',
    passed: s.passed != null ? s.passed : 0,
    attempts: s.attempts != null ? s.attempts : 0,
    lastActive: s.last_active || '',
    lastActiveText: fmt.fmtDate(s.last_active) || '从未提交'
  };
}

function normalizeProgressProblem(p) {
  p = p || {};
  var submitted = p.submission_id != null && p.submission_id !== '';
  // 注意：未提交时后端给 result="" ，直接丢给 resultInfo 会被当成数字 0（等待判题），
  // 所以这里必须按 submission_id 判断，不能只看 result
  var info = submitted
    ? fmt.resultInfo(p.result, p.label)
    : { code: '', cls: 'todo', text: p.label || '未提交' };
  return {
    problemId: p.problem_id,
    title: p.title || '',
    weight: p.weight,
    score: p.score,
    contribution: p.contribution,
    submissionId: submitted ? p.submission_id : null,
    resultRaw: p.result,
    status: info.code,
    statusText: info.text,
    statusCls: info.cls,
    attempts: p.attempts != null ? p.attempts : 0,
    submitted: submitted
  };
}

function normalizeProgressBatch(b) {
  b = b || {};
  var probs = (b.problems || []).map(normalizeProgressProblem);
  var passed = 0, submitted = 0;
  probs.forEach(function (p) {
    if (p.submitted) submitted++;
    if (p.submitted && fmt.isAccepted(p.resultRaw)) passed++;
  });
  return {
    batchId: b.batch_id,
    title: b.title || '作业',
    score: b.score,
    totalWeight: b.total_weight,
    problems: probs,
    passedCount: passed,
    submittedCount: submitted
  };
}

/**
 * 某学生在某教学班的完整进度 —— 教师成绩册。
 * GET /api/offerings/{oid}/students/{uid}/progress
 * 返回每个作业下每道题的 result/label/attempts/score/submission_id。
 */
function studentProgress(oid, uid) {
  return http.get('/api/offerings/' + oid + '/students/' + encodeURIComponent(uid) + '/progress')
    .then(function (d) {
      d = d || {};
      var batches = (d.batches || []).map(normalizeProgressBatch);

      var totalScore = 0, totalWeight = 0, passedProblems = 0, unsubmitted = 0, totalProblems = 0;
      batches.forEach(function (b) {
        totalScore += (Number(b.score) || 0);
        totalWeight += (Number(b.totalWeight) || 0);
        b.problems.forEach(function (p) {
          totalProblems++;
          if (p.submitted && fmt.isAccepted(p.resultRaw)) passedProblems++;
          if (!p.submitted) unsubmitted++;
        });
      });

      return {
        offeringId: d.offering_id,
        student: d.student || {},
        batches: batches,
        summary: {
          totalScore: Math.round(totalScore * 10) / 10,
          totalWeight: Math.round(totalWeight * 10) / 10,
          totalProblems: totalProblems,
          passedProblems: passedProblems,
          unsubmitted: unsubmitted,
          rate: totalWeight > 0 ? Math.round(totalScore * 100 / totalWeight) : 0
        }
      };
    });
}

/** 单条提交的源码 */
function submissionCode(id) {
  return http.get('/api/submissions/' + id + '/code').then(function (d) {
    d = d || {};
    return {
      code: d.code || '',
      language: d.language_name || fmt.LANG_ID_MAP[d.language] || '',
      codeLength: d.code_length != null ? d.code_length : (d.code || '').length
    };
  });
}

/** 单条提交详情（含逐测试点结果） */
function submission(id) {
  return http.get('/api/submissions/' + id).then(function (d) {
    d = d || {};
    var n = normalizeSubmission({
      solution_id: d.submission_id,
      problem_id: d.problem_id,
      user_id: d.user_id,
      result: d.result,
      result_label: d.label,
      time: d.time,
      memory: d.memory,
      language: d.language,
      in_date: d.in_date,
      offering_id: d.offering_id,
      batch_id: d.batch_id
    });
    n.cases = fmt.parseCaseTable(d.error);
    n.errorRaw = d.error || '';
    return n;
  });
}

// ---------------- 题库索引（分类 + 题单） ----------------
//
// 电脑端的题库走 GET /api/problem-sets：返回
//   data.categories[]      24 个知识点分类（难度用 "L1-入门"…"L5-进阶"）
//   data.standalone_sets[] 24 个专项题单（难度用 "easy"/"medium"/"hard"）
// 合起来 48 份题单 / 2148 道题。
//
// 原始响应约 2.5MB（含每题完整题面），对手机太重。这里只保留索引需要的字段
// （slug/title/difficulty/tags 等），压到约 390KB 并缓存到本地；
// 题面等详细内容等进入题目页时再按 slug 单独取：
//   GET /api/public-problems/{slug}   ← 分类题和题单题的 slug 都能直接用
//
// 注意：题库题目用 slug 寻址（不是 problem_id），提交也是
//   POST /api/public-problems/{slug}/submissions

var INDEX_CACHE_KEY = 'hoj_problem_sets_v1';

function trimIndexProblem(p) {
  var d = fmt.diffInfo(p.difficulty);
  // 丢掉原始 difficulty 字符串（diffLabel/diffLevel 已覆盖），省约 60KB 缓存
  return {
    slug: p.slug || '',
    title: p.title || '',
    diffLevel: d.level,
    diffLabel: d.label,
    diffCls: d.cls,
    tags: p.tags || [],
    knowledge: p.knowledge || [],
    provenance: p.provenance || ''
  };
}

function trimIndexGroup(g) {
  var probs = (g.problems || []).map(trimIndexProblem);
  return {
    kind: g.kind || 'category',
    code: g.code || '',
    title: g.title || '',
    name: g.category_name || '',
    course: g.course || '',
    tags: g.tags || [],
    count: g.count != null ? g.count : probs.length,
    difficultyCount: g.difficulty_count || {},
    // 预先算好难度分布，wxml 直接用
    diffBars: fmt.diffBreakdown(g.difficulty_count),
    problems: probs
  };
}

/**
 * 取题库索引（分类 + 题单）。默认走本地缓存，force=true 强制重取。
 * 返回 { categories, sets, totalProblems, totalSheets, updatedAt, fromCache }
 */
function problemSets(opts) {
  opts = opts || {};

  if (!opts.force) {
    try {
      var cached = wx.getStorageSync(INDEX_CACHE_KEY);
      if (cached && cached.categories && cached.categories.length) {
        cached.fromCache = true;
        return Promise.resolve(cached);
      }
    } catch (e) {}
  }

  // 2.5MB 的响应，超时要放宽
  return http.get('/api/problem-sets', {}, { timeout: 45000 }).then(function (d) {
    d = d || {};
    var categories = (d.categories || []).map(trimIndexGroup);
    var sets = (d.standalone_sets || []).map(trimIndexGroup);
    var totalProblems = 0;
    categories.concat(sets).forEach(function (g) { totalProblems += (g.problems || []).length; });

    var index = {
      categories: categories,
      sets: sets,
      totalProblems: totalProblems,
      totalSheets: categories.length + sets.length,
      updatedAt: Date.now(),
      fromCache: false
    };

    try { wx.setStorageSync(INDEX_CACHE_KEY, index); } catch (e) {}

    return index;
  });
}

/** 索引里按 code+kind 找一份题单 */
function findGroup(index, kind, code) {
  if (!index || !code) return null;
  var pool = (kind === 'set') ? index.sets : index.categories;
  for (var i = 0; i < (pool || []).length; i++) {
    if (pool[i].code === code) return pool[i];
  }
  // 退一步：两个池子都找
  var all = (index.categories || []).concat(index.sets || []);
  for (var j = 0; j < all.length; j++) {
    if (all[j].code === code) return all[j];
  }
  return null;
}

/** 清掉题库索引缓存，下次进入题库重新拉 */
function clearProblemSetsCache() {
  try { wx.removeStorageSync(INDEX_CACHE_KEY); } catch (e) {}
}

/** 退出：后端没有 logout 接口（404），本地清态即可 */
function logout() {
  var store = require('./store.js');
  store.clear();
}

module.exports = {
  login: login,
  me: me,
  courses: courses,
  offering: offering,
  batch: batch,
  assignmentOverview: assignmentOverview,
  problems: problems,
  problem: problem,
  submit: submit,
  submissions: submissions,
  submission: submission,
  submissionCode: submissionCode,
  students: students,
  studentProgress: studentProgress,
  problemSets: problemSets,
  findGroup: findGroup,
  clearProblemSetsCache: clearProblemSetsCache,
  logout: logout,
  // 归一化函数导出，方便页面/测试复用
  normalizeProblem: normalizeProblem,
  normalizeProblemDetail: normalizeProblemDetail,
  normalizeSubmission: normalizeSubmission,
  normalizeCourse: normalizeCourse,
  normalizeBatch: normalizeBatch,
  normalizeBatchProblem: normalizeBatchProblem
};
