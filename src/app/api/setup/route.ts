import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export async function GET(req: NextRequest) {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    return NextResponse.json({ error: "TURSO_DATABASE_URL not set" }, { status: 500 });
  }

  const client = createClient({ url, authToken: authToken || undefined });
  const purge = req.nextUrl.searchParams.get("purge") === "1";

  try {
    if (purge) {
      await client.executeMultiple(`
        DROP TABLE IF EXISTS messages;
        DROP TABLE IF EXISTS passkeys;
        DROP TABLE IF EXISTS bots;
        DROP TABLE IF EXISTS users;
      `);
    }

    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        webauthn_user_id TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS passkeys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        webauthn_user_id TEXT NOT NULL,
        public_key BLOB NOT NULL,
        counter INTEGER NOT NULL DEFAULT 0,
        device_type TEXT NOT NULL,
        backed_up INTEGER NOT NULL DEFAULT 0,
        transports TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bots (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL DEFAULT '未命名',
        account_id TEXT,
        owner_wx_user_id TEXT,
        token TEXT,
        base_url TEXT DEFAULT 'https://ilinkai.weixin.qq.com',
        cdn_base_url TEXT DEFAULT 'https://novac2c.cdn.weixin.qq.com/c2c',
        get_updates_buf TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
        from_user_id TEXT NOT NULL,
        to_user_id TEXT NOT NULL,
        message_id INTEGER,
        session_id TEXT,
        context_token TEXT,
        direction TEXT NOT NULL,
        message_type INTEGER NOT NULL,
        content TEXT NOT NULL,
        response_body TEXT,
        created_at INTEGER NOT NULL
      );
    `);

    return NextResponse.json({ ok: true, purged: purge, message: "Database initialized" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  } finally {
    client.close();
  }
}
