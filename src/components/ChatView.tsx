"use client";

interface MessageItem {
  type: number;
  text_item?: { text?: string };
  image_item?: { cdn_media?: { encrypt_query_param?: string; aes_key?: string; full_url?: string } };
  file_item?: { cdn_media?: { encrypt_query_param?: string; aes_key?: string; full_url?: string } };
  video_item?: { cdn_media?: { encrypt_query_param?: string; aes_key?: string; full_url?: string } };
  voice_item?: { cdn_media?: { encrypt_query_param?: string; aes_key?: string; full_url?: string } };
}

interface WeixinMessage {
  from_user_id?: string;
  to_user_id?: string;
  message_id?: number;
  session_id?: string;
  message_type?: number;
  context_token?: string;
  item_list?: MessageItem[];
  create_time_ms?: number;
}

function renderItem(item: MessageItem, index: number) {
  if (item.type === 1 && item.text_item?.text) {
    return <p key={index} className="whitespace-pre-wrap">{item.text_item.text}</p>;
  }
  if (item.image_item?.cdn_media) {
    const url = item.image_item.cdn_media.full_url;
    if (url) {
      return (
        <img
          key={index}
          src={url}
          alt="image"
          className="max-h-60 max-w-full rounded-lg"
        />
      );
    }
    return <p key={index} className="text-sm text-gray-400">[图片]</p>;
  }
  if (item.video_item?.cdn_media) {
    return <p key={index} className="text-sm text-gray-400">[视频]</p>;
  }
  if (item.file_item?.cdn_media) {
    const url = item.file_item.cdn_media.full_url;
    return (
      <p key={index} className="text-sm">
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          [文件]
        </a>
      </p>
    );
  }
  if (item.voice_item?.cdn_media) {
    return <p key={index} className="text-sm text-gray-400">[语音]</p>;
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
                {msg.item_list?.map((item, j) => renderItem(item, j))}
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
