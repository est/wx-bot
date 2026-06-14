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

（这也导致了这个项目不可能跑在Cloudflare Worker上，必须是 Vercel 这种有 fs 和真正nodejs环境的）

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
│  SILK WASM  │     │ media-download│     │  CDN Upload   │
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

## 项目结构

```
src/
├── app/                # Next.js App Router 页面和 API 路由
├── lib/
│   ├── db/             # 数据库 (Drizzle schema + Turso 客户端)
│   ├── auth/           # 认证 (session + WebAuthn + 路由守卫)
│   └── weixin/         # 微信集成层 (适配器、客户端、媒体、CDN)
├── components/         # React UI 组件
└── proxy.ts            # 路由保护

scripts/                # postinstall 脚本 (openclaw stub + 类型同步)
public/                 # 静态资源 (silk.mjs 等浏览器侧纯 JS)
```

---

## `@tencent-weixin/openclaw-weixin` 包概览

> 以下基于 v2.4.4。包没有 `exports` 字段，所有功能通过 `dist/src/` 深路径导入。

### 包的本质

这是一个 **OpenClaw 插件**，不是独立 SDK。顶层默认导出是 OpenClaw 插件描述符，所有实用功能都在 `dist/src/` 子模块中以命名导出提供。本项目不使用 OpenClaw 运行时，只导入这些子模块。

### 模块划分

| 模块路径 | 职责 |
|---|---|
| `dist/src/api/api.js` | iLink HTTP API 客户端（所有网络请求） |
| `dist/src/api/types.js` | 协议类型定义和常量枚举 |
| `dist/src/cdn/*.js` | CDN 上传/下载、AES-ECB 加解密、URL 构造 |
| `dist/src/messaging/*.js` | 消息发送（文本/图片/视频/文件）、入站处理 |
| `dist/src/auth/*.js` | 账号管理、QR 登录、配对 |
| `dist/src/media/*.js` | 媒体下载、MIME 工具、SILK 转码 |
| `dist/src/monitor/` | 长轮询主循环 |
| `dist/src/storage/` | 状态持久化（sync buffer、state 目录） |
| `dist/src/util/` | 日志、ID 生成、脱敏工具 |

### iLink API 端点

| 端点 | 函数 | 说明 |
|---|---|---|
| `ilink/bot/getupdates` | `getUpdates` | 长轮询拉取消息，服务端 hold 约 35s |
| `ilink/bot/sendmessage` | `sendMessage` | 发送消息（文本/图片/语音/文件/视频） |
| `ilink/bot/getuploadurl` | `getUploadUrl` | 获取 CDN 上传预签名 URL |
| `ilink/bot/getconfig` | `getConfig` | 获取 bot 配置（typing_ticket） |
| `ilink/bot/sendtyping` | `sendTyping` | 发送输入状态指示 |
| `ilink/bot/msg/notifystop` | `notifyStop` | 通知服务端通道停止 |
| `ilink/bot/msg/notifystart` | `notifyStart` | 通知服务端通道启动 |
| `ilink/bot/get_bot_qrcode` | QR 登录 | 获取扫码二维码 |
| `ilink/bot/get_qrcode_status` | QR 轮询 | 轮询扫码状态 |

认证方式：`Authorization: Bearer {bot_token}`，附加 `iLink-App-Id: bot` 等 headers。

### 消息协议

```
SendMessageReq {
  msg: WeixinMessage {
    from_user_id, to_user_id, client_id,
    message_type: 2,    // BOT
    message_state: 2,   // FINISH
    item_list: MessageItem[],
    context_token
  }
}
```

`MessageItem.type` 枚举：TEXT=1, IMAGE=2, VOICE=3, FILE=4, VIDEO=5, TOOL_CALL_START=11, TOOL_CALL_RESULT=12。

每种 type 对应不同的 item 字段（`text_item`, `image_item`, `voice_item` 等）。

### CDN 媒体协议

上传流程：
1. 生成 16 字节随机 AES key
2. `getUploadUrl(aeskey_hex, filekey, media_type, sizes)` → `upload_full_url`
3. `uploadBufferToCdn(buf, url, aeskey)` → `downloadParam`（`x-encrypted-param` 响应头）
4. 消息中引用：`{ encrypt_query_param, aes_key, encrypt_type }`

`aes_key` 编码：`Buffer.from(hex_string).toString("base64")` —— 是 hex 字符串的 base64，不是原始字节的 base64。

`parseAesKey` 支持两种输入：原始 16 字节 base64，或 hex 32 字符的 base64。

### QR 登录流程

1. `get_bot_qrcode?bot_type=3` → 返回二维码图片 URL
2. 轮询 `get_qrcode_status`（35s 超时，5min TTL）
3. 状态：`wait` → `scaned` → `confirmed`（成功，返回 `bot_token` + `ilink_bot_id` + `baseurl`）

### 本项目实际使用的导出

| 来源 | 导入 |
|---|---|
| `dist/src/api/api.js` | `getUpdates`, `sendMessage`, `getUploadUrl`, `getConfig`, `sendTyping`, `apiPostFetch`, `apiGetFetch`, `buildBaseInfo` |
| `dist/src/api/types.js` | `WeixinMessage`, `MessageItem`, `CDNMedia`, `TextItem`, `ImageItem`, `VoiceItem`, `FileItem`, `VideoItem` 及各 Req/Resp 类型、枚举常量 |
| `dist/src/cdn/cdn-upload.js` | `uploadBufferToCdn` |
| `dist/src/cdn/pic-decrypt.js` | `downloadAndDecryptBuffer`, `downloadPlainCdnBuffer` |
| `dist/src/cdn/aes-ecb.js` | `aesEcbPaddedSize` |

---

## 对官方包的依赖与假设

以下列出本项目依赖的官方包行为。如果这些行为变化，可能导致 break。

### 会 break 的情况

| 依赖 | 说明 |
|---|---|
| **深路径导入** | 包没有 `exports` 字段，本项目通过 `@tencent-weixin/openclaw-weixin/dist/src/...` 导入。如果包重构目录结构，所有 import 路径失效。 |
| **`uploadBufferToCdn` 签名** | 参数 `{ buf, uploadFullUrl, uploadParam, filekey, cdnBaseUrl, label, aeskey }`，返回 `{ downloadParam }`。如果参数名或返回值变化，`media.ts` 需要更新。 |
| **`downloadAndDecryptBuffer` 签名** | 参数 `(encryptedQueryParam, aesKeyBase64, cdnBaseUrl, label, fullUrl?)`。如果参数顺序或 `aes_key` 解析逻辑变化，`media-download` 需要更新。 |
| **`aes_key` 编码格式** | 消息中 `aes_key` 必须是 `Buffer.from(hex).toString("base64")`。如果官方改为直接用原始字节 base64，所有已发消息的解密会失败。 |
| **`SendMessageReq` 包装格式** | 必须用 `{ msg: { ... } }` 包装，flat 字段会被忽略。如果 API 改为接受 flat 格式，发送消息会静默失败。 |
| **iLink API 端点路径** | 如 `ilink/bot/sendmessage`。如果端点变化，所有 API 调用返回 404。 |
| **CDN 响应头 `x-encrypted-param`** | `uploadBufferToCdn` 从此头读取下载参数。如果 CDN 改用其他头或响应体，上传后无法获取下载引用。 |
| **openclaw peer dependency** | 包依赖 `openclaw` 的 `plugin-sdk/*` 模块。本项目通过 postinstall stub 代替。如果包新增导入的 openclaw 模块，stub 需要同步更新。 |
| **类型定义** | `scripts/sync-weixin-types.mjs` 从包源码自动生成 `types.ts`。如果包的类型结构变化，构建时 TypeScript 会报错。 |

### 不太会 break 的行为

| 行为 | 说明 |
|---|---|
| iLink API 的认证方式 | Bearer token + 固定 headers，协议层面稳定 |
| CDN 加密算法 | AES-128-ECB，标准算法不会变 |
| QR 登录流程 | 状态机（wait→scaned→confirmed），协议层面稳定 |
| `parseAesKey` 双格式支持 | 向后兼容，两种格式都会继续支持 |
| `buildCdnDownloadUrl` 逻辑 | `cdnBaseUrl/download?encrypted_query_param=...`，URL 模板稳定 |

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
