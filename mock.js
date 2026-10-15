// mock.js —— 骨架阶段的假数据，字段照 HOJ 学生端截图来对。
// 以后整个文件会被 wx.request 打后端接口替换掉（每题的注释标了对应接口）。
module.exports = {
  // 顶部统计（题库页那行：2148 道核心试题 · 48 份题单 · 5 大算法支柱）
  problemStats: { total: 2148, sheets: 48, branches: 5 },

  // 一级算法分支（对应电脑端知识树最上面 5 大支柱）
  categories: [
    { key: 'all',  label: '全部公开题目', count: 2148 },
    { key: 'b1',   label: '基础与语言入门', count: 439 },
    { key: 'b2',   label: '核心数据结构', count: 471 },
    { key: 'b3',   label: '算法思想与进阶', count: 716 },
    { key: 'b4',   label: '数学与数论专项', count: 115 },
    { key: 'b5',   label: '高校竞赛真题', count: 407 }
  ],

  // 难度：对齐网页里的 L1~L5
  difficulties: [
    { level: 'L1', label: '入门' },
    { level: 'L2', label: '简单' },
    { level: 'L3', label: '中等' },
    { level: 'L4', label: '较难' },
    { level: 'L5', label: '困难' }
  ],

  // 判题状态字典（对齐"我的提交"里那个下拉：AC/WA/TLE/MLE/RE/CE/PE/OLE）
  judgeStatus: [
    { code: 'AC',  text: '正确' },
    { code: 'WA',  text: '答案错误' },
    { code: 'TLE', text: '时间超限' },
    { code: 'MLE', text: '内存超限' },
    { code: 'RE',  text: '运行错误' },
    { code: 'CE',  text: '编译错误' },
    { code: 'PE',  text: '格式错误' },
    { code: 'OLE', text: '输出超限' }
  ],

  // 题目列表（以后换成 GET /api/problem/list）
  problems: [
    { id: 1, title: '单词翻转', level: 'L1', diffLabel: '入门', tagClass: 'diff-l1', branch: 'b1',
      tags: ['01-basic-io · 基础语法与标准输入输出', '来源: 一本通基础篇'],
      timeLimit: '1000ms', memoryLimit: '256MB',
      description: '读入一个字符串，把其中的单词顺序翻转后输出。',
      input: '一行，一个由空格分隔的字符串。',
      output: '一行，单词顺序翻转后的字符串。',
      sampleInput: 'hello world', sampleOutput: 'world hello',
      languages: ['C', 'C++', 'Java', 'Python'] },
    { id: 2, title: '正负数问题', level: 'L1', diffLabel: '入门', tagClass: 'diff-l1', branch: 'b1',
      tags: ['01-basic-io · 基础语法与标准输入输出', '来源: 一本通基础篇'],
      timeLimit: '1000ms', memoryLimit: '256MB',
      description: '给定若干整数，分别统计正数、负数和零的个数。',
      input: '第一行一个整数 n；第二行 n 个整数。',
      output: '一行，三个整数分别表示正数、负数、零的个数。',
      sampleInput: '5\n1 -2 0 3 -4', sampleOutput: '2 2 1',
      languages: ['C', 'C++', 'Java', 'Python'] },
    { id: 3, title: '地球人口承载力估计', level: 'L1', diffLabel: '入门', tagClass: 'diff-l1', branch: 'b1',
      tags: ['01-basic-io · 基础语法与标准输入输出', '来源: 一本通基础篇'],
      timeLimit: '1000ms', memoryLimit: '256MB',
      description: '根据给定的增长模型，估算地球人口达到上限的年份。',
      input: '一行，若干整数参数。',
      output: '一行，一个整数表示年份。',
      sampleInput: '1 2 3 4', sampleOutput: '2050',
      languages: ['C', 'C++', 'Java', 'Python'] },
    { id: 4, title: '河中跳房子', level: 'L1', diffLabel: '入门', tagClass: 'diff-l1', branch: 'b1',
      tags: ['02-branch · 顺序与分支结构', '来源: 一本通基础篇'],
      timeLimit: '1000ms', memoryLimit: '256MB',
      description: '河中有若干石头，每次可跳 1~3 格，问到达对岸的最少步数。',
      input: '第一行石头数量；第二行各石头位置。',
      output: '一行，最少步数。',
      sampleInput: '4\n2 4 6 8', sampleOutput: '3',
      languages: ['C', 'C++', 'Java', 'Python'] },
    { id: 100, title: '单调栈入门', level: 'L2', diffLabel: '简单', tagClass: 'diff-l2', branch: 'b2',
      tags: ['03-stack · 栈、队列与单词结构'],
      timeLimit: '1000ms', memoryLimit: '256MB',
      description: '给每个元素找到它右边第一个比它大的数。',
      input: '第一行 n；第二行 n 个整数。',
      output: 'n 个整数，不存在输出 -1。',
      sampleInput: '3\n1 2 3', sampleOutput: '2 3 -1',
      languages: ['C', 'C++', 'Java', 'Python'] },
    { id: 300, title: '排序与高效检索', level: 'L3', diffLabel: '中等', tagClass: 'diff-l3', branch: 'b3',
      tags: ['05-sort · 排序与高效检索'],
      timeLimit: '2000ms', memoryLimit: '256MB',
      description: '先排序，再对多次询问做二分查找。',
      input: '若干行。', output: '若干行答案。',
      sampleInput: '...', sampleOutput: '...',
      languages: ['C', 'C++', 'Java', 'Python'] },
    { id: 500, title: '最大公约数', level: 'L3', diffLabel: '中等', tagClass: 'diff-l3', branch: 'b4',
      tags: ['数论 · 经典贪心策略'],
      timeLimit: '1000ms', memoryLimit: '128MB',
      description: '求两个正整数的最大公约数（欧几里得算法）。',
      input: '一行两个整数。', output: '一行一个整数。',
      sampleInput: '12 18', sampleOutput: '6',
      languages: ['C', 'C++', 'Java', 'Python'] },
    { id: 900, title: '最长上升子序列', level: 'L4', diffLabel: '较难', tagClass: 'diff-l4', branch: 'b5',
      tags: ['竞赛真题 · 动态规划模型'],
      timeLimit: '2000ms', memoryLimit: '512MB',
      description: '给定一个数列，求它最长严格上升子序列的长度。',
      input: '第一行 n；第二行 n 个整数。', output: '一行答案。',
      sampleInput: '5\n1 3 2 4 5', sampleOutput: '4',
      languages: ['C', 'C++', 'Java', 'Python'] }
  ],

  // 总览页统计卡（以后换成 GET /api/overview）
  overviewStats: { courses: 0, published: 0, submittable: 0 },
  recentHomework: [
    { id: 1, title: '数据结构 · 第一次作业', deadline: '10-20 截止', status: '进行中' },
    { id: 2, title: '算法入门 · 练习题单', deadline: '10-25 截止', status: '未开始' }
  ],

  // 我的提交（以后换成 GET /api/my/submissions）
  submissions: [
    { id: 90001, problemId: 2, title: '正负数问题', language: 'C++', status: 'AC',  time: '12ms',  memory: '3440KB', submitTime: '2026-10-15 16:40' },
    { id: 90002, problemId: 4, title: '河中跳房子', language: 'C++', status: 'WA',  time: '8ms',   memory: '3200KB', submitTime: '2026-10-15 16:35' },
    { id: 90003, problemId: 900, title: '最长上升子序列', language: 'Python', status: 'TLE', time: '1000ms', memory: '8000KB', submitTime: '2026-10-14 21:10' }
  ]
};
