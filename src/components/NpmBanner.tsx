import { readFileSync } from "node:fs";

const PKG = "@tencent-weixin/openclaw-weixin";
const NPM_URL = `https://www.npmjs.com/package/${PKG}`;

export default async function NpmBanner() {
  let installed = "unknown";
  let latest = "";
  let latestDate = "";
  let installedDate = "";

  try {
    const pkg = JSON.parse(readFileSync("node_modules/" + PKG + "/package.json", "utf8"));
    installed = pkg.version;
  } catch {}

  try {
    const res = await fetch(`https://registry.npmjs.org/${PKG}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      latest = data["dist-tags"]?.latest || "";
      const timeMap = data["time"] || {};
      if (timeMap[latest]) latestDate = new Date(timeMap[latest]).toLocaleDateString("zh-CN");
      if (timeMap[installed]) installedDate = new Date(timeMap[installed]).toLocaleDateString("zh-CN");
    }
  } catch {}

  return (
    <div className="flex items-center justify-center gap-3 py-1.5 text-xs text-gray-400">
      <a href={NPM_URL} target="_blank" rel="noopener noreferrer"
        className="hover:text-gray-600 font-mono">{PKG}</a>
      <span>
        installed {installed}{installedDate && ` (${installedDate})`}
      </span>
      <span>
        npm {latest}{latestDate && ` (${latestDate})`}
      </span>
      {latest && installed !== latest && (
        <a href={NPM_URL} target="_blank" rel="noopener noreferrer"
          className="text-orange-500 hover:underline">update</a>
      )}
      <a href="/dashboard/settings"
        className="ml-2 hover:text-gray-600">设置</a>
    </div>
  );
}
