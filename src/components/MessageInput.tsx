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
  const [preview, setPreview] = useState<{ url: string; name: string; type: string } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    const url = URL.createObjectURL(file);
    setPreview({ url, name: file.name, type: file.type });

    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  async function handleUploadAndSend() {
    if (!pendingFile || sending) return;
    setSending(true);
    setUploading(true);

    try {
      // Upload
      const formData = new FormData();
      formData.append("file", pendingFile);
      const uploadResp = await fetch(`/api/bots/${botId}/media/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadResp.json();
      if (!uploadResp.ok) throw new Error(uploadData.error);

      let mediaType = 4;
      if (pendingFile.type.startsWith("image/")) mediaType = 2;
      else if (pendingFile.type.startsWith("video/")) mediaType = 5;
      else if (pendingFile.type.startsWith("audio/")) mediaType = 3;

      // Send
      await fetch(`/api/bots/${botId}/media/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaRef: uploadData.mediaRef,
          mediaType,
        }),
      });

      clearPreview();
      onSend();
    } catch (err) {
      console.error("Upload/send failed:", err);
    } finally {
      setSending(false);
      setUploading(false);
    }
  }

  function clearPreview() {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setPendingFile(null);
  }

  return (
    <div className="border-t bg-white p-3 space-y-2">
      {preview && (
        <div className="flex items-center gap-3 rounded-lg border p-2">
          {preview.type.startsWith("image/") && (
            <img src={preview.url} alt="" className="h-16 w-16 rounded object-cover" />
          )}
          {preview.type.startsWith("video/") && (
            <video src={preview.url} className="h-16 w-16 rounded object-cover" />
          )}
          <span className="flex-1 truncate text-sm text-gray-600">{preview.name}</span>
          <button
            onClick={handleUploadAndSend}
            disabled={sending}
            className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "上传中..." : "发送"}
          </button>
          <button
            onClick={clearPreview}
            disabled={sending}
            className="text-xs text-gray-400 hover:text-red-500"
          >
            取消
          </button>
        </div>
      )}

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
          disabled={sending}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {uploading ? "⏳" : "📎"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
