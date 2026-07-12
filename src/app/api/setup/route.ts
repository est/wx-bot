import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";

const TABLES = ["messages", "passkeys", "bots", "users", "bot_webhooks"];

export async function GET(req: NextRequest) {
  // Require SETUP_SECRET env var to be set and match query param
  const setupSecret = process.env.SETUP_SECRET;
  if (!setupSecret || req.nextUrl.searchParams.get("secret") !== setupSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    return NextResponse.json({ error: "TURSO_DATABASE_URL not set" }, { status: 500 });
  }

  const client = createClient({ url, authToken: authToken || undefined });
  const drop = req.nextUrl.searchParams.get("drop");

  try {
    if (drop) {
      const targets = drop === "*" ? TABLES : [drop];
      for (const table of targets) {
        if (TABLES.includes(table)) {
          await client.execute(`DROP TABLE IF EXISTS ${table}`);
        }
      }
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
        message_id TEXT,
        session_id TEXT,
        context_token TEXT,
        direction TEXT NOT NULL,
        message_type INTEGER NOT NULL,
        content TEXT NOT NULL,
        response_body TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
      CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_bot_id ON messages(bot_id, id);

      -- Add create_time_ms column if missing
      ALTER TABLE messages ADD COLUMN create_time_ms INTEGER;
      CREATE INDEX IF NOT EXISTS idx_messages_bot_ctms ON messages(bot_id, create_time_ms);

      CREATE TABLE IF NOT EXISTS bot_webhooks (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
        config TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        accessed_at INTEGER,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bot_context_tokens (
        bot_id TEXT NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
        to_user_id TEXT NOT NULL,
        context_token TEXT,
        use_count INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (bot_id, to_user_id)
      );
    `);

    return NextResponse.json({ ok: true, dropd: drop || null, message: "Database initialized" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  } finally {
    client.close();
  }
}
