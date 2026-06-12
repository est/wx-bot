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
| 认证 | @simplewebauthn (WebAuthn) + iron-session |
| 微信通信 | @tencent-weixin/openclaw-weixin (iLink API) |

## 项目结构

```
src/
├── app/                    # Next.js 页面路由
│   ├── api/                # API 路由 (auth, bots, cron, health)
│   ├── login/              # Passkey 登录页
│   └── dashboard/          # 管理后台 (bot列表, 聊天界面, 设置)
├── lib/                    # 核心逻辑
│   ├── db/                 # 数据库 schema + Turso 客户端
│   ├── auth/               # session + WebAuthn 工具
│   └── weixin/             # 微信集成层 (适配器, QR登录, SSE流, 媒体上传)
├── components/             # UI 组件
└── middleware.ts           # 路由保护
```

## 本地开发

```bash
cp .env.example .env
# 填写 TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, SESSION_SECRET
npm install
npm run db:push    # 初始化数据库表
npm run dev        # 启动开发服务器 → http://localhost:3000
```

## 自动更新机制

`package.json` 使用 `^2.0.0` caret 范围声明 `@tencent-weixin/openclaw-weixin` 依赖，`package-lock.json` 不提交到 git。Vercel Cron Job 每小时调用 Deploy Hook 触发全新构建 → `npm install` 拉取最新兼容版本 → 无感知更新。
