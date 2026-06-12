"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import ChatView from "@/components/ChatView";
import MessageInput from "@/components/MessageInput";
import type { WeixinMessage } from "@/lib/weixin/types";

interface BotInfo {
  id: string;
  accountId?: string;
  ownerWxUserId?: string;
  status: string;
}

export default function BotChatPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const { botId } = use(params);
  const [messages, setMessages] = useState<WeixinMessage[]>([]);
  const [bot, setBot] = useState<BotInfo | null>(null);
  const [error, setError] = useState("");
  const esRef = useRef<EventSource | null>(null);
  const router = useRouter();

  // Load bot info
  useEffect(() => {
    fetch(`/api/bots/${botId}`)
      .then(async (res) => {
        if (res.status === 401) { router.push("/login"); return null; }
        if (res.status === 404) { router.push("/dashboard"); return null; }
        const data = await res.json();
        if (!res.ok) { setError(data.error || `加载失败 (${res.status})`); return null; }
        return data;
      })
      .then((data) => { if (data) setBot(data); })
      .catch((err) => setError(`网络错误: ${String(err)}`));
  }, [botId, router]);

  // Load message history from DB
  useEffect(() => {
    fetch(`/api/bots/${botId}/messages?limit=100`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data);
        }
      })
      .catch(() => {});
  }, [botId]);

  // Connect SSE for real-time messages
  useEffect(() => {
    const es = new EventSource(`/api/bots/${botId}/messages/stream`);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const newMsgs = JSON.parse(event.data) as WeixinMessage[];
        setMessages((prev) => {
          // Deduplicate by message_id
          const existingIds = new Set(prev.map((m) => m.message_id).filter(Boolean));
          const fresh = newMsgs.filter((m) => !m.message_id || !existingIds.has(m.message_id));
          return [...prev, ...fresh];
        });
      } catch {}
    };

    es.onerror = () => {};

    return () => { es.close(); };
  }, [botId]);

  function handleSend() {}

  if (error) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => router.push("/dashboard")} className="mt-3 text-sm text-red-700 underline">
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="font-semibold text-gray-900">{bot?.accountId || botId}</h2>
          <p className="text-xs text-gray-400">
            {bot?.ownerWxUserId && `微信用户: ${bot.ownerWxUserId}`}
            {bot?.status === "active" && bot?.ownerWxUserId && " · "}
            {bot?.status === "active" ? "在线" : bot?.status}
          </p>
        </div>
        <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700">
          &larr; 返回
        </button>
      </div>

      <ChatView messages={messages} botId={botId} />

      <MessageInput botId={botId} onSend={handleSend} />
    </div>
  );
}
