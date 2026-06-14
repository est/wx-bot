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
      headers: { Accept: "application/vnd.npm.install-v1+json" },
    });
    if (res.ok) {
      const data = await res.json();
      latest = data["dist-tags"]?.latest || "";
      const time = data["time"]?.[latest];
      if (time) latestDate = new Date(time).toLocaleDateString("zh-CN");
    }
  } catch {}

  try {
    const res = await fetch(`https://registry.npmjs.org/${PKG}/${installed}`, {
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const data = await res.json();
      const time = data["time"]?.[installed];
      if (time) installedDate = new Date(time).toLocaleDateString("zh-CN");
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
    </div>
  );
}
