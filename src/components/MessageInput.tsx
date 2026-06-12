"use client";

import { useState, useRef } from "react";

export default function MessageInput({
  botId,
  onSend,
}: {
  botId: string;
  onSend: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<{
    mediaRef: {
      encrypt_query_param?: string;
      aes_key?: string;
      encrypt_type?: number;
    };
    mediaType: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSendText() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await fetch(`/api/bots/${botId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      setText("");
      onSend();
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const resp = await fetch(`/api/bots/${botId}/media/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);

      let mediaType = 4;
      if (file.type.startsWith("image/")) mediaType = 2;
      else if (file.type.startsWith("video/")) mediaType = 5;
      else if (file.type.startsWith("audio/")) mediaType = 3;

      setUploadedMedia({ mediaRef: data.mediaRef, mediaType });
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  async function handleSendMedia() {
    if (!uploadedMedia) return;

    setSending(true);
    try {
      await fetch(`/api/bots/${botId}/media/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaRef: uploadedMedia.mediaRef,
          mediaType: uploadedMedia.mediaType,
        }),
      });
      setUploadedMedia(null);
      onSend();
    } catch (err) {
      console.error("Send media failed:", err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t bg-white p-3 space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="输入消息..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendText()}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={handleSendText}
          disabled={sending || !text.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          发送
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {uploading ? "上传中..." : "📎"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
      {uploadedMedia && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-2 text-sm text-green-700">
          <span>媒体已就绪</span>
          <button
            onClick={handleSendMedia}
            disabled={sending}
            className="rounded bg-green-600 px-2 py-0.5 text-xs text-white hover:bg-green-700 disabled:opacity-50"
          >
            发送媒体
          </button>
          <button
            onClick={() => setUploadedMedia(null)}
            className="text-xs text-gray-400 hover:text-red-500"
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
}
