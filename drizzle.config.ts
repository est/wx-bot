import type { Config } from "drizzle-kit";

const isLocal = !process.env.TURSO_DATABASE_URL?.startsWith("libsql://");

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: isLocal ? "sqlite" : "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || "file:local.db",
    ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  },
} satisfies Config;
