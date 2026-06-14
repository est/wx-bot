"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BotCard from "@/components/BotCard";

interface Bot {
  id: string;
  accountId?: string;
  ownerWxUserId?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function DashboardPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  async function loadBots() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bots");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `请求失败 (${res.status})`);
        return;
      }
      setBots(data);
    } catch (err) {
      setError(`网络错误: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBots();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">我的 Bot</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/settings")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            设置
          </button>
          <button
            onClick={() => router.push("/dashboard/bots/new")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            添加 Bot
          </button>
        </div>
      </div>

      {loading && (
        <p className="mt-8 text-center text-gray-400">加载中...</p>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={loadBots}
            className="mt-2 text-sm text-red-700 underline hover:no-underline"
          >
            重试
          </button>
        </div>
      )}

      {!loading && !error && bots.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-gray-400">还没有 Bot</p>
          <button
            onClick={() => router.push("/dashboard/bots/new")}
            className="mt-4 text-blue-600 hover:underline"
          >
            添加第一个 Bot
          </button>
        </div>
      )}

      {!loading && !error && bots.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} onDelete={loadBots} />
          ))}
        </div>
      )}
    </div>
  );
}
