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

function fmtDate(d: Date) {
  return new Date(d).toISOString().replace("T", " ").slice(0, 19);
}

export default function BotCard({ bot, onDelete }: { bot: Bot; onDelete?: () => void }) {
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("确定删除？")) return;
    await fetch(`/api/bots/${bot.id}`, { method: "DELETE" });
    onDelete?.();
  }

  return (
    <div
      onClick={() => router.push(`/dashboard/bots/${bot.id}`)}
      className="cursor-pointer rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {bot.accountId || bot.id}
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[bot.status] || "bg-gray-100 text-gray-600"}`}
          >
            {statusLabels[bot.status] || bot.status}
          </span>
          <button
            onClick={handleDelete}
            className="text-xs text-gray-400 hover:text-red-500"
            title="删除"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-400 space-y-0.5">
        {bot.ownerWxUserId && <p>微信用户: {bot.ownerWxUserId}</p>}
        <p>创建: {fmtDate(bot.createdAt)}</p>
        <p>最后轮询: {fmtDate(bot.updatedAt)}</p>
      </div>
    </div>
  );
}
