import { sqliteTable, text, integer, blob, index } from "drizzle-orm/sqlite-core";

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
}, (table) => [
  index("idx_bots_status").on(table.status),
  index("idx_bots_user_id").on(table.userId),
]);

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  botId: text("bot_id")
    .notNull()
    .references(() => bots.id, { onDelete: "cascade" }),
  fromUserId: text("from_user_id").notNull(),
  toUserId: text("to_user_id").notNull(),
  messageId: text("message_id"),
  sessionId: text("session_id"),
  contextToken: text("context_token"),
  direction: text("direction").notNull(),
  messageType: integer("message_type").notNull(),
  content: text("content").notNull(),
  responseBody: text("response_body"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
}, (table) => [
  index("idx_messages_bot_id").on(table.botId, table.id),
]);

export const invites = sqliteTable("invites", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  usedAt: integer("used_at", { mode: "timestamp" }),
}, (table) => [
  index("idx_invites_token").on(table.token),
]);
