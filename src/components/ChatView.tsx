"use client";

import type { WeixinMessage, MessageItem, CDNMedia } from "@/lib/weixin/types";
import VoiceMessage from "./VoiceMessage";

function cdnUrl(botId: string, cdn: CDNMedia | undefined, mime: string): string | null {
  if (!cdn) return null;
  if (cdn.full_url && !cdn.aes_key) return cdn.full_url;
  if (cdn.encrypt_query_param || cdn.full_url) {
    const p = new URLSearchParams({ mime });
    if (cdn.encrypt_query_param) p.set("eqp", cdn.encrypt_query_param);
    if (cdn.aes_key) p.set("ak", cdn.aes_key);
    if (cdn.full_url) p.set("fu", cdn.full_url);
    return `/api/bots/${botId}/media/proxy?${p}`;
  }
  return null;
}

function renderItem(botId: string, item: MessageItem, index: number) {
  // Text
  if (item.type === 1 && item.text_item?.text) {
    return <p key={index} className="whitespace-pre-wrap">{item.text_item.text}</p>;
  }

  // Image
  if (item.type === 2) {
    const cdn = item.image_item?.media;
    const url = cdnUrl(botId, cdn, "image/jpeg");
    if (url) {
      return (
        <img key={index} src={url} alt="图片" className="max-h-60 max-w-full rounded-lg" />
      );
    }
    return <p key={index} className="text-sm text-gray-400">[图片]</p>;
  }

  // Voice
  if (item.type === 3) {
    const cdn = item.voice_item?.media;
    const url = cdnUrl(botId, cdn, "audio/silk");
    if (url) {
      return <VoiceMessage key={index} src={url} className="max-w-full" />;
    }
    return <p key={index} className="text-sm text-gray-400">[语音]</p>;
  }

  // File
  if (item.type === 4) {
    const cdn = item.file_item?.media;
    const name = item.file_item?.file_name || "文件";
    const url = cdnUrl(botId, cdn, "application/octet-stream");
    if (url) {
      return (
        <a key={index} href={url} target="_blank" rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm">
          {name}
        </a>
      );
    }
    return <p key={index} className="text-sm text-gray-400">[文件]</p>;
  }

  // Video
  if (item.type === 5) {
    const cdn = item.video_item?.media;
    const url = cdnUrl(botId, cdn, "video/mp4");
    if (url) {
      return <video key={index} controls src={url} className="max-h-60 max-w-full rounded-lg" />;
    }
    return <p key={index} className="text-sm text-gray-400">[视频]</p>;
  }

  return null;
}

export default function ChatView({
  messages,
  botId,
}: {
  messages: WeixinMessage[];
  botId: string;
}) {
  const grouped: Record<string, WeixinMessage[]> = {};
  for (const msg of messages) {
    const key = msg.from_user_id || "unknown";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(msg);
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-6 p-4">
      {Object.keys(grouped).length === 0 && (
        <p className="py-12 text-center text-gray-400">暂无消息</p>
      )}
      {Object.entries(grouped).map(([userId, msgs]) => (
        <div key={userId}>
          <div className="mb-2 text-xs font-medium text-gray-400">
            {userId === botId ? "Bot" : userId}
          </div>
          <div className="space-y-2">
            {msgs.map((msg, i) => (
              <div
                key={msg.message_id || i}
                className={`rounded-xl px-4 py-2 max-w-[80%] ${
                  msg.message_type === 2
                    ? "ml-auto bg-blue-500 text-white"
                    : "bg-white border"
                }`}
              >
                {msg.item_list?.map((item, j) => renderItem(botId, item, j))}
                {msg.create_time_ms && (
                  <p
                    className={`mt-1 text-xs ${
                      msg.message_type === 2 ? "text-blue-100" : "text-gray-400"
                    }`}
                  >
                    {new Date(msg.create_time_ms).toLocaleTimeString("zh-CN")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
