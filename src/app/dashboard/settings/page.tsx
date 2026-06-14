"use client";

import { useState, useEffect } from "react";

interface Invite {
  id: string;
  token: string;
  expiresAt: string | null;
  createdAt: string;
  usedAt: string | null;
}

export default function SettingsPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");
  const [expiresIn, setExpiresIn] = useState<string>("");

  async function loadInvites() {
    setLoading(true);
    try {
      const res = await fetch("/api/invites");
      if (res.ok) setInvites(await res.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadInvites(); }, []);

  async function createInvite() {
    let expiresInSeconds: number | undefined;
    if (expiresIn === "1h") expiresInSeconds = 3600;
    else if (expiresIn === "24h") expiresInSeconds = 86400;
    else if (expiresIn === "7d") expiresInSeconds = 604800;

    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresInSeconds }),
    });
    if (res.ok) {
      const invite = await res.json();
      setInvites((prev) => [invite, ...prev]);
      copyInviteLink(invite.token);
    }
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(""), 2000);
  }

  async function deleteInvite(id: string) {
    const res = await fetch(`/api/invites/${id}`, { method: "DELETE" });
    if (res.ok) setInvites((prev) => prev.filter((i) => i.id !== id));
  }

  function formatExpiry(expiresAt: string | null) {
    if (!expiresAt) return "永不过期";
    const d = new Date(expiresAt);
    const now = Date.now();
    if (d.getTime() < now) return "已过期";
    return `${d.toLocaleDateString("zh-CN")} ${d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">设置</h2>

      <div className="mt-8">
        <h3 className="text-base font-semibold text-gray-800">邀请链接</h3>
        <p className="mt-1 text-sm text-gray-500">
          生成邀请链接让其他人加入你的账号，共享管理 bot 的权限
        </p>

        <div className="mt-4 flex items-center gap-3">
          <select
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">永不过期</option>
            <option value="1h">1 小时</option>
            <option value="24h">24 小时</option>
            <option value="7d">7 天</option>
          </select>
          <button
            onClick={createInvite}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            生成邀请链接
          </button>
        </div>

        {!loading && invites.length === 0 && (
          <p className="mt-4 text-sm text-gray-400">暂无邀请链接</p>
        )}

        {invites.length > 0 && (
          <div className="mt-4 space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <code className="block truncate text-xs text-gray-600">
                    {window.location.origin}/invite/{inv.token}
                  </code>
                  <span className="text-xs text-gray-400">
                    创建于 {new Date(inv.createdAt).toLocaleDateString("zh-CN")}
                    {" · "}
                    {formatExpiry(inv.expiresAt)}
                    {inv.usedAt && " · 已使用"}
                  </span>
                </div>
                <div className="ml-3 flex shrink-0 gap-2">
                  <button
                    onClick={() => copyInviteLink(inv.token)}
                    className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                  >
                    {copied === inv.token ? "已复制" : "复制"}
                  </button>
                  <button
                    onClick={() => deleteInvite(inv.id)}
                    className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
