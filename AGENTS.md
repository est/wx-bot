# AGENTS.md

## 核心规则

**坚决不要自己移植/重写 npm 包的代码。**

这个项目的核心依赖是 `@tencent-weixin/openclaw-weixin`。所有与微信 API 的交互都必须通过这个包的导出函数完成，不要自己重写 fetch、headers、请求格式等。

### 为什么

1. 官方包频繁更新，自己写的代码会与官方脱节
2. 官方包的 API 格式、headers、认证方式可能随时变化
3. 自己重写容易出错（比如 SendMessageReq 的 `msg` 包装）

### 正确做法

- 只使用包导出的函数：`getUpdates`, `sendMessage`, `getUploadUrl`, `getConfig`, `sendTyping`, `apiPostFetch`, `apiGetFetch`
- 只使用包导出的类型：从 `types.ts` 自动同步
- 如果包的函数缺少某个功能（比如返回 headers），**讨论解决方案**，不要自己重写

### 类型自动同步

`scripts/sync-weixin-types.mjs` 在 `npm install` 时自动从包源码生成 `src/lib/weixin/types.ts`，不要手动修改这个文件。

## 技术栈

- Next.js 16 App Router + TypeScript
- Turso (libSQL) + Drizzle ORM
- @simplewebauthn (WebAuthn)
- silk-wasm (CDN, 浏览器侧 SILK 转码)
- QStash (后台消息收集)

## 关键文件

- `src/lib/weixin/client.ts` — 从包导入的 API 函数
- `src/lib/weixin/adapter.ts` — 我们的业务逻辑，调用 client.ts 的函数
- `src/lib/weixin/types.ts` — 自动生成，不要手动改
- `src/lib/weixin/cdn.ts` — CDN 下载解密（我们的代码）
- `scripts/sync-weixin-types.mjs` — 类型同步脚本
- `scripts/create-openclaw-stubs.mjs` — openclaw stub 生成
