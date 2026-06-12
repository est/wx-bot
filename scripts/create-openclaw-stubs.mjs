import fs from "node:fs";
import path from "node:path";

const OPENCLAW_DIR = path.join("node_modules", "openclaw");
const SDK_DIR = path.join(OPENCLAW_DIR, "plugin-sdk");

if (fs.existsSync(OPENCLAW_DIR)) {
  fs.rmSync(OPENCLAW_DIR, { recursive: true, force: true });
}

fs.mkdirSync(SDK_DIR, { recursive: true });

const stubs = {
  "package.json": JSON.stringify({
    name: "openclaw",
    version: "0.0.0-stub",
    type: "module",
    exports: {
      "./plugin-sdk/account-id": "./plugin-sdk/account-id.js",
      "./plugin-sdk/infra-runtime": "./plugin-sdk/infra-runtime.js",
      "./plugin-sdk/core": "./plugin-sdk/core.js",
      "./plugin-sdk/channel-contract": "./plugin-sdk/channel-contract.js",
      "./plugin-sdk/channel-runtime": "./plugin-sdk/channel-runtime.js",
      "./plugin-sdk/plugin-runtime": "./plugin-sdk/plugin-runtime.js",
      "./plugin-sdk/config-runtime": "./plugin-sdk/config-runtime.js",
      "./plugin-sdk/reply-runtime": "./plugin-sdk/reply-runtime.js",
    },
  }, null, 2),

  "plugin-sdk/account-id.js": `
export function normalizeAccountId(value) {
  return (value ?? "").trim() || "default";
}
export function normalizeOptionalAccountId(value) {
  const trimmed = (value ?? "").trim();
  return trimmed || undefined;
}
export const DEFAULT_ACCOUNT_ID = "default";
`,

  "plugin-sdk/infra-runtime.js": `
import os from "node:os";
import path from "node:path";
export function resolvePreferredOpenClawTmpDir() {
  return path.join(os.tmpdir(), "openclaw");
}
export const POSIX_OPENCLAW_TMP_DIR = "/tmp/openclaw";
export async function withFileLock(filePath, fn) {
  return fn();
}
export function acquireFileLock() {
  throw new Error("acquireFileLock: stub");
}
export const FILE_LOCK_TIMEOUT_ERROR_CODE = "FILE_LOCK_TIMEOUT";
`,

  "plugin-sdk/core.js": `export {};\n`,
  "plugin-sdk/channel-contract.js": `export {};\n`,
  "plugin-sdk/channel-runtime.js": `export function createTypingCallbacks() { return {}; }\n`,
  "plugin-sdk/plugin-runtime.js": `export function getGlobalHookRunner() { return null; }\n`,
  "plugin-sdk/config-runtime.js": `export function loadConfig() { return {}; }\nexport async function writeConfigFile() {}\n`,
  "plugin-sdk/reply-runtime.js": `export {};\n`,
};

for (const [file, content] of Object.entries(stubs)) {
  fs.writeFileSync(path.join(OPENCLAW_DIR, file), content);
}

console.log("Created openclaw stubs in node_modules/openclaw/");
