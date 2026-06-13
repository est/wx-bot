"use client";

import { useState } from "react";
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

function isOutgoing(msg: WeixinMessage & { direction?: string }): boolean {
  if (msg.direction) return msg.direction === "out";
  return msg.message_type === 2;
}

function renderItem(botId: string, item: MessageItem, index: number, onImageClick: (url: string) => void) {
  if (item.type === 1 && item.text_item?.text) {
    return <p key={index} className="whitespace-pre-wrap">{item.text_item.text}</p>;
  }

  if (item.type === 2) {
    const cdn = item.image_item?.media;
    const url = cdnUrl(botId, cdn, "image/jpeg");
    if (url) {
      return (
        <img
          key={index}
          src={url}
          alt="图片"
          className="max-h-60 max-w-full rounded-lg cursor-pointer hover:opacity-90"
          onClick={() => onImageClick(url)}
        />
      );
    }
    return <p key={index} className="text-sm text-gray-400">[图片]</p>;
  }

  if (item.type === 3) {
    const cdn = item.voice_item?.media;
    const url = cdnUrl(botId, cdn, "audio/silk");
    if (url) {
      return (
        <VoiceMessage
          key={index}
          src={url}
          playtime={item.voice_item?.playtime}
          text={item.voice_item?.text}
          className="max-w-full"
        />
      );
    }
    return <p key={index} className="text-sm text-gray-400">[语音]</p>;
  }

  if (item.type === 4) {
    const cdn = item.file_item?.media;
    const name = item.file_item?.file_name || "文件";
    const url = cdnUrl(botId, cdn, "application/octet-stream");
    if (url) {
      return (
        <a key={index} href={url} target="_blank" rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm">{name}</a>
      );
    }
    return <p key={index} className="text-sm text-gray-400">[文件]</p>;
  }

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

function MessageBubble({
  msg,
  botId,
  onImageClick,
}: {
  msg: WeixinMessage & { direction?: string; response_body?: string };
  botId: string;
  onImageClick: (url: string) => void;
}) {
  const [showJson, setShowJson] = useState(false);
  const out = isOutgoing(msg);

  return (
    <div className={`flex ${out ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-xl px-4 py-2 max-w-[80%] relative group ${
          out ? "bg-blue-500 text-white" : "bg-white border"
        }`}
      >
        {msg.item_list?.map((item, j) => renderItem(botId, item, j, onImageClick))}
        {msg.create_time_ms && (
          <p className={`mt-1 text-xs ${out ? "text-blue-100" : "text-gray-400"}`}>
            {new Date(msg.create_time_ms).toLocaleTimeString()}
          </p>
        )}
        <button
          onClick={() => setShowJson(!showJson)}
          className={`absolute -top-2 -right-2 h-5 w-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition ${
            out ? "bg-blue-400 text-white" : "bg-gray-200 text-gray-600"
          }`}
        >
          {showJson ? "−" : "+"}
        </button>
        {showJson && (
          <pre className={`mt-2 p-2 rounded text-xs overflow-auto max-h-60 ${
            out ? "bg-blue-600 text-blue-100" : "bg-gray-50 text-gray-600"
          }`}>
            {JSON.stringify(msg, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

export default function ChatView({
  messages,
  botId,
}: {
  messages: WeixinMessage[];
  botId: string;
}) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <>
      <div className="flex-1 overflow-y-auto space-y-2 p-4">
        {messages.length === 0 && (
          <p className="py-12 text-center text-gray-400">暂无消息</p>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.message_id || i}
            msg={msg}
            botId={botId}
            onImageClick={setLightboxUrl}
          />
        ))}
      </div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="放大"
            className="max-h-[90vh] max-w-[90vw] rounded-lg"
          />
        </div>
      )}
    </>
  );
}
