# HOJ 教学平台 · 小程序端

微信小程序客户端，对接 HOJ 教学平台后端（题库、做题判题、课程作业、教师端学生进度）。

## 快速开始

1. 安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 「导入项目」，目录选**本项目根目录**
3. AppID 选「测试号」即可（只有要发布时才需要正式 AppID）
4. 右上角「详情 → 本地设置」→ 勾选 **不校验合法域名、web-view、TLS 版本以及 HTTPS 证书**

> 第 4 步别漏，不勾的话连后端会全部失败。

## 演示模式

`app.js` 里的开关：

```js
demoMode: true,   // 用内置样例数据，完全不联网（演示 / 发体验版）
demoMode: false,  // 连真实后端（本地开发）
```

演示数据在 `utils/demo.js` 和 `utils/demo-bank.js`，覆盖 24 个题库分类 + 24 份题单。

## 项目结构

```
app.js / app.json / app.wxss   全局：入口、配置、公共样式
pages/                         所有页面，一个页面 = 同名的 4 个文件
  ├── overview/    总览        ├── students/           学生名单（教师）
  ├── courses/     课程        ├── student-progress/   学生成绩册（教师）
  ├── problems/    题库        ├── batch/              作业题目
  ├── detail/      题目详情    ├── category/           分类/题单题目
  ├── submissions/ 我的提交    ├── submission-detail/  提交详情
  ├── mine/        我的        └── login/              登录
utils/                         工具层
  ├── request.js   网络请求底层（⚠️ 不要改）
  ├── api.js       接口层：一个函数对应一个后端接口
  ├── format.js    判题状态映射、格式化
  ├── store.js     登录态与角色
  └── demo*.js     演示数据
```

## 协作规矩

1. **只改自己负责的页面目录** —— 两人改同一文件会产生 Git 冲突
2. **绝不修改 `app.json`** —— 它是公共文件，要加页面找 lxf 统一加
3. **开工前 `git pull`，收工后 `git push`**

## 不要碰的文件

| 文件 | 原因 |
|---|---|
| `utils/request.js` | 网络底层，改错全项目连不上后端 |
| `app.js` 里的 `demoMode` / `baseUrl` | 演示模式与后端开关 |
| `project.config.json` | 项目配置（AppID 等），改错工具打不开项目 |
| `utils/demo-bank.js` | 自动生成的题库数据，手改会被覆盖 |

## 日常命令

```bash
git pull                    # 开工前：拉取别人的改动
git add -A                  # 标记你的所有改动
git commit -m "改了xxx"     # 提交到本地
git push                    # 推给所有人
```

## 分支

- `master` —— 主分支，保持可用