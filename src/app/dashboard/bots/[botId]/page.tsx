"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import ChatView from "@/components/ChatView";
import MessageInput from "@/components/MessageInput";
import type { WeixinMessage } from "@/lib/weixin/types";

interface BotInfo {
  id: string;
  name: string;
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
  const esRef = useRef<EventSource | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/bots/${botId}`)
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        if (res.status === 404) {
          router.push("/dashboard");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setBot(data);
      });
  }, [botId, router]);

  useEffect(() => {
    const es = new EventSource(`/api/bots/${botId}/messages/stream`);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const newMsgs = JSON.parse(event.data) as WeixinMessage[];
        setMessages((prev) => [...prev, ...newMsgs]);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
    };
  }, [botId]);

  function handleSend() {
    // SSE will pick up sent messages when they arrive back
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="font-semibold text-gray-900">
            {bot?.accountId || botId}
          </h2>
          <p className="text-xs text-gray-400">
            {bot?.ownerWxUserId && `微信用户: ${bot.ownerWxUserId}`}
            {bot?.status === "active" && bot?.ownerWxUserId && " · "}
            {bot?.status === "active" ? "在线" : bot?.status}
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; 返回
        </button>
      </div>

      <ChatView messages={messages} botId={botId} />

      <MessageInput botId={botId} onSend={handleSend} />
    </div>
  );
}
