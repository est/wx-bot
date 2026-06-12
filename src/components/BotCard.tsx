"use client";

import { useRouter } from "next/navigation";

interface Bot {
  id: string;
  accountId?: string;
  ownerWxUserId?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  expired: "bg-red-100 text-red-700",
  error: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  active: "在线",
  pending: "等待登录",
  expired: "已过期",
  error: "异常",
};

export default function BotCard({ bot }: { bot: Bot }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/dashboard/bots/${bot.id}`)}
      className="cursor-pointer rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {bot.accountId || bot.id}
        </h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[bot.status] || "bg-gray-100 text-gray-600"}`}
        >
          {statusLabels[bot.status] || bot.status}
        </span>
      </div>
      <div className="mt-2 text-sm text-gray-500">
        {bot.ownerWxUserId && <p>微信用户: {bot.ownerWxUserId}</p>}
        <p className="mt-1">
          创建于 {new Date(bot.createdAt).toLocaleDateString("zh-CN")}
        </p>
      </div>
    </div>
  );
}
