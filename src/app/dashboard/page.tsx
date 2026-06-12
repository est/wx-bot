"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BotCard from "@/components/BotCard";

interface Bot {
  id: string;
  name: string;
  accountId?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function DashboardPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/bots")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setBots(data);
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">我的 Bot</h2>
        <button
          onClick={() => router.push("/dashboard/bots/new")}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          添加 Bot
        </button>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-gray-500">加载中...</p>
      ) : bots.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-gray-400">还没有 Bot</p>
          <button
            onClick={() => router.push("/dashboard/bots/new")}
            className="mt-4 text-blue-600 hover:underline"
          >
            添加第一个 Bot
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} />
          ))}
        </div>
      )}
    </div>
  );
}
