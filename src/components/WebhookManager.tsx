"use client";

import { useState, useEffect } from "react";
import { fmtTime } from "@/lib/fmt";

interface Webhook {
  id: string;
  botId: string;
  enabled: boolean;
  accessedAt: string | null;
  createdAt: string;
}

export default function WebhookManager({ botId }: { botId: string }) {
  const [hooks, setHooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/webhooks/list?botId=${botId}`);
      if (res.ok) setHooks(await res.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [botId]);

  async function create() {
    const res = await fetch(`/api/webhooks/create?botId=${botId}`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setHooks((prev) => [{ id: data.id, botId, enabled: true, accessedAt: null, createdAt: new Date().toISOString() }, ...prev]);
    }
  }

  async function toggle(id: string) {
    const res = await fetch(`/api/webhooks/toggle?id=${id}`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setHooks((prev) => prev.map((h) => h.id === id ? { ...h, enabled: data.enabled } : h));
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/webhooks/delete?id=${id}`, { method: "POST" });
    if (res.ok) setHooks((prev) => prev.filter((h) => h.id !== id));
  }

  function copyUrl(id: string) {
    const url = `${window.location.origin}/api/webhook/send/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  }

  if (loading) return <p className="text-sm text-gray-400">加载中...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Webhook 用于外部服务发送通知到微信</p>
        <button onClick={create} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
          创建 Webhook
        </button>
      </div>

      {hooks.length === 0 && (
        <p className="text-sm text-gray-400">暂无 Webhook</p>
      )}

      {hooks.map((h) => (
        <div key={h.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div className="min-w-0 flex-1">
            <code className="block truncate text-xs text-gray-600">
              /api/webhook/send/{h.id}
            </code>
            <span className="text-xs text-gray-400">
              创建于 {fmtTime(h.createdAt)}
              {h.accessedAt && ` · 最后使用 ${fmtTime(h.accessedAt)}`}
              {!h.enabled && " · 已禁用"}
            </span>
          </div>
          <div className="ml-3 flex shrink-0 gap-2">
            <button onClick={() => copyUrl(h.id)} className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">
              {copied === h.id ? "已复制" : "复制URL"}
            </button>
            <button onClick={() => toggle(h.id)} className={`rounded px-2 py-1 text-xs hover:bg-gray-100 ${h.enabled ? "text-orange-500" : "text-green-500"}`}>
              {h.enabled ? "禁用" : "启用"}
            </button>
            <button onClick={() => remove(h.id)} className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50">
              删除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
