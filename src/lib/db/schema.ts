import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  webauthnUserId: text("webauthn_user_id").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const passkeys = sqliteTable("passkeys", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  webauthnUserId: text("webauthn_user_id").notNull(),
  publicKey: blob("public_key", { mode: "buffer" }).notNull(),
  counter: integer("counter").notNull().default(0),
  deviceType: text("device_type").notNull(),
  backedUp: integer("backed_up", { mode: "boolean" }).notNull().default(false),
  transports: text("transports").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const bots = sqliteTable("bots", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("未命名"),
  accountId: text("account_id"),
  ownerWxUserId: text("owner_wx_user_id"),
  token: text("token"),
  baseUrl: text("base_url").default("https://ilinkai.weixin.qq.com"),
  cdnBaseUrl: text("cdn_base_url").default(
    "https://novac2c.cdn.weixin.qq.com/c2c"
  ),
  getUpdatesBuf: text("get_updates_buf"),
  status: text("status").notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  botId: text("bot_id")
    .notNull()
    .references(() => bots.id, { onDelete: "cascade" }),
  fromUserId: text("from_user_id").notNull(),
  toUserId: text("to_user_id").notNull(),
  messageId: integer("message_id"),
  sessionId: text("session_id"),
  contextToken: text("context_token"),
  direction: text("direction").notNull(),
  messageType: integer("message_type").notNull(),
  content: text("content").notNull(),
  responseBody: text("response_body"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
