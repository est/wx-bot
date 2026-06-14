"use client";

import { useState, useEffect } from "react";
import WebhookManager from "@/components/WebhookManager";

interface Bot {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot, setSelectedBot] = useState("");
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/bots").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) {
        setBots(data);
        if (data.length > 0) setSelectedBot(data[0].id);
      }
    }).catch(() => {});
  }, []);

  async function createInvite() {
    setGenerating(true);
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
      const data = await res.json();
      const url = `${window.location.origin}/invite/${data.token}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
    setGenerating(false);
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
            disabled={generating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? "生成中..." : "生成邀请链接"}
          </button>
        </div>

        {copied && (
          <p className="mt-3 text-sm text-green-600">链接已复制到剪贴板</p>
        )}
      </div>

      <div className="mt-10 border-t pt-8">
        <h3 className="text-base font-semibold text-gray-800">Webhook</h3>
        <p className="mt-1 text-sm text-gray-500">
          外部服务通过 Webhook 向微信发送通知，支持等待用户回复
        </p>

        {bots.length > 1 && (
          <select
            value={selectedBot}
            onChange={(e) => setSelectedBot(e.target.value)}
            className="mt-3 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {bots.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        {selectedBot && (
          <div className="mt-4">
            <WebhookManager botId={selectedBot} />
          </div>
        )}
      </div>
    </div>
  );
}
