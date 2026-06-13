import fs from "node:fs";
import path from "node:path";

const pkgTypesPath = path.join(
  "node_modules",
  "@tencent-weixin",
  "openclaw-weixin",
  "src",
  "api",
  "types.ts"
);

const outputPath = path.join("src", "lib", "weixin", "types.ts");

if (!fs.existsSync(pkgTypesPath)) {
  console.error(`Package types not found: ${pkgTypesPath}`);
  console.error("Run npm install first.");
  process.exit(1);
}

const source = fs.readFileSync(pkgTypesPath, "utf-8");

// Filter out any openclaw imports (types.ts shouldn't have them, but be safe)
const lines = source.split("\n");
const filtered = lines.filter(
  (line) => !line.includes('from "openclaw') && !line.includes("from 'openclaw")
);

const header = `// AUTO-GENERATED from @tencent-weixin/openclaw-weixin/src/api/types.ts
// Do not edit manually. Run: node scripts/sync-weixin-types.mjs
`;

fs.writeFileSync(outputPath, header + "\n" + filtered.join("\n"));
console.log(`Synced ${outputPath} from ${pkgTypesPath}`);
