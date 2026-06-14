# wx-bot

微信 Bot 管理平台。通过 `@tencent-weixin/openclaw-weixin` 对接腾讯 iLink API，提供 Web 界面收发微信消息和多媒体。

## 核心原则

**不自己移植/重写官方包的代码。** 所有与微信 API 的交互都通过 `@tencent-weixin/openclaw-weixin` 的导出函数完成。不复制 fetch、headers、请求格式等实现。

原因：
- 官方包频繁更新，自己写的代码会与官方脱节
- 官方 HTTP API 地址、数据格式可能随时变化
- 自己重写容易出错（比如 `aes_key` 编码、`SendMessageReq` 的 `msg` 包装）
- 官方包依赖 openclaw（一个 364MB 的框架），通过 postinstall 脚本生成 stub 代替它

如果包缺少某个功能，**讨论解决方案**，不要自己重写。详见 `AGENTS.md`。

## 功能状态

| 功能 | 状态 |
|---|---|
| Passkey 登录 (WebAuthn) | ✅ |
| 多 Bot 管理 | ✅ |
| QR 扫码登录微信 | ✅ |
| 文本消息收发 | ✅ |
| 图片消息收发 | ✅ |
| 语音消息发送 (SILK 编码) | ✅ |
| 语音消息接收/播放 (SILK 解码) | ✅ |
| 文件/视频消息收发 | ✅ |
| 实时消息 (SSE) | ✅ |
| 后台消息收集 (QStash) | ✅ |
| 自动更新 (Vercel Cron + Deploy Hook) | ✅ |
| npm 包版本监控 (NpmBanner) | ✅ |

## 技术栈

| 层面 | 方案 |
|---|---|
| 框架 | Next.js 16 (App Router) + TypeScript |
| 部署 | Vercel (Serverless) |
| 数据库 | Turso (libSQL) + Drizzle ORM |
| 认证 | @simplewebauthn (WebAuthn) + iron-session |
| 微信通信 | @tencent-weixin/openclaw-weixin (iLink API) |
| 音频编解码 | silk-wasm (CDN 加载，浏览器侧 WASM) |
| 后台任务 | QStash (自链式轮询) |

## 架构

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  浏览器 UI   │────▶│ Next.js API  │────▶│ iLink WeChat  │
│             │◀────│   Routes     │◀────│     API       │
│  SSE 长连接  │     │              │     │               │
│  SILK WASM  │     │ media-proxy  │     │  CDN Upload   │
│  AES-ECB    │     │ (decrypt)    │     │  CDN Download │
└─────────────┘     └──────────────┘     └───────────────┘
                           │
                    ┌──────┴───────┐
                    │ Turso Sqlite │
                    │ (libSQL)     │
                    └──────────────┘
```

**关键设计：**

- **适配器模式** — `src/lib/weixin/adapter.ts` 薄封装官方包的函数，不复制实现。上游变更只需 redeploy，破坏性变更由 TypeScript 编译时捕获。
- **openclaw stub** — postinstall 脚本生成 36KB stub 代替 364MB 的 openclaw 包。`dist/` 编译 JS 运行时导入，本地 `.d.ts` 提供类型。
- **浏览器侧媒体处理** — CDN 媒体的 AES-128-ECB 解密和 SILK→WAV 转码都在浏览器完成，不经过服务器代理，节省 serverless 调用。
- **环境变量最小化** — `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` 是唯一必需变量。认证配置从部署上下文自动推导。

## 部署

### 1. 创建 Turso 数据库

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
turso db create wx-bot
turso db show wx-bot --url       # → TURSO_DATABASE_URL
turso db tokens create wx-bot    # → TURSO_AUTH_TOKEN
```

### 2. 部署到 Vercel

1. 导入 GitHub 仓库 `est/wx-bot`
2. 设置环境变量：

| 变量 | 说明 |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://wx-bot-xxx.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso 认证 token |
| `DEPLOY_HOOK_URL` | (可选) Vercel Deploy Hook URL，用于 Cron 自动更新 |

3. 初始化数据库：`npm run db:push`

### 3. 自动更新

`package-lock.json` 不提交到 git。Vercel Cron 每小时触发 Deploy Hook → 重新构建 → `npm install` 解析最新 `^2.x`。无需手动改代码。NpmBanner 在页面底部显示当前安装版本和 npm 最新版本。

## 本地开发

```bash
cp .env.example .env
# 填写 TURSO_DATABASE_URL=file:local.db, TURSO_AUTH_TOKEN（本地可留空）
npm install
npm run db:push
npm run dev
```

## 项目结构

```
src/
├── app/                        # Next.js 页面路由
│   ├── api/                    # API 路由
│   │   ├── auth/               # WebAuthn 注册/登录
│   │   ├── bots/               # Bot CRUD + 消息 + 媒体上传
│   │   ├── cron/               # 定时轮询
│   │   └── media-proxy/        # CDN 媒体代理 (解密)
│   ├── login/                  # Passkey 登录页
│   └── dashboard/              # 管理后台
├── lib/
│   ├── db/                     # Drizzle schema + Turso 客户端
│   ├── auth/                   # session + WebAuthn + 路由守卫
│   └── weixin/                 # 微信集成层
│       ├── client.ts           # 从官方包导入的 API 函数
│       ├── adapter.ts          # 业务逻辑，调用 client.ts
│       ├── media.ts            # 媒体上传 (uploadBufferToCdn)
│       ├── cdn.ts              # AES-ECB 加解密
│       └── types.ts            # 自动生成，不要手动改
├── components/                 # UI 组件
└── proxy.ts                    # 路由保护

scripts/
├── create-openclaw-stubs.mjs   # postinstall: 生成 openclaw stub
└── sync-weixin-types.mjs       # postinstall: 同步官方包类型

public/
└── silk.mjs                    # silk-wasm CDN 加载器 (纯 JS，不经打包)
```
