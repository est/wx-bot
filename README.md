# wx-bot

基于 Vercel + Next.js 的微信 Bot 管理平台，通过 `@tencent-weixin/openclaw-weixin` 封装腾讯 iLink API，提供 Web 界面收发微信消息和多媒体。

## 功能

- **Passkey 登录** — WebAuthn 通行密钥注册/登录，无需密码
- **多 Bot 管理** — 一个账号可管理多个微信 Bot
- **QR 扫码登录** — 网页展示二维码，微信扫码授权登录
- **实时消息** — SSE (EventSource) 长轮询拉取微信消息，实时推送到浏览器
- **消息发送** — 支持文本、图片、视频、文件等多媒体消息收发
- **自动更新** — Vercel Cron Job 定时触发重新部署，始终使用最新版微信 API 包

## 技术栈

| 层面 | 方案 |
|---|---|
| 框架 | Next.js 16 (App Router) + TypeScript |
| 部署 | Vercel (Serverless) |
| 数据库 | Turso (libSQL) + Drizzle ORM |
| 认证 | @simplewebauthn (WebAuthn) + iron-session (加密 cookie) |
| 微信通信 | @tencent-weixin/openclaw-weixin (iLink API) |

## 部署

### 1. 创建 Turso 数据库

```bash
# 安装 Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login

# 创建数据库
turso db create wx-bot
turso db show wx-bot --url   # 保存为 TURSO_DATABASE_URL
turso db tokens create wx-bot  # 保存为 TURSO_AUTH_TOKEN
```

### 2. 部署到 Vercel

1. 在 [Vercel](https://vercel.com) 导入 GitHub 仓库 `est/wx-bot`
2. 设置环境变量：

| 变量 | 说明 |
|---|---|
| `TURSO_DATABASE_URL` | Turso 数据库连接串，如 `libsql://wx-bot-xxx.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso 认证 token |
| `SESSION_SECRET` | 32+ 字符随机字符串，用于加密 session cookie |
| `DEPLOY_HOOK_URL` | Deploy Hook URL（见步骤 3） |

3. 创建 Deploy Hook（自动更新用）：
   - 进入 Vercel 项目 → Settings → Deploy Hooks → Create
   - 分支选 `main`，名称随意，复制生成的 URL 填入 `DEPLOY_HOOK_URL`

4. 首次部署后初始化数据库：
   ```bash
   # 在本地或 Vercel CLI 中执行
   npm run db:push
   ```

### 3. 自动更新

项目配置了 Vercel Cron Job 每小时调用 `DEPLOY_HOOK_URL`，触发全新构建。`package.json` 使用 caret 范围 (`^2.0.0`) 且不提交 `package-lock.json`，确保每次构建拉取最新兼容版本。

## 本地开发

```bash
cp .env.example .env
# 填写 TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, SESSION_SECRET
npm install
npm run db:push    # 初始化数据库表
npm run dev        # 启动 → http://localhost:3000
```

## 项目结构

```
src/
├── app/                    # Next.js 页面路由
│   ├── api/                # API 路由 (auth, bots, cron, health)
│   ├── login/              # Passkey 登录页
│   └── dashboard/          # 管理后台 (bot列表, 聊天界面, 设置)
├── lib/                    # 核心逻辑
│   ├── db/                 # 数据库 schema + Turso 客户端
│   ├── auth/               # session + WebAuthn + 路由守卫
│   └── weixin/             # 微信集成层 (适配器, QR登录, SSE流, 媒体上传)
├── components/             # UI 组件
└── proxy.ts               # 路由保护 (cookie 验证)
```
