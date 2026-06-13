"use client";

import { useState, useRef } from "react";
import { encodePcmToSilk } from "./silk";

export default function MessageInput({
  botId,
  onSend,
}: {
  botId: string;
  onSend: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string; type: string } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(""), 5000);
  }

  async function handleSendText() {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/bots/${botId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setText("");
      onSend();
    } catch (err) {
      showError(`发送失败: ${err}`);
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
    e.target.value = "";
  }

  async function handleUploadAndSend() {
    if (!pendingFile || sending) return;
    setSending(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", pendingFile);
      const uploadResp = await fetch(`/api/bots/${botId}/media/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadResp.json();
      if (!uploadResp.ok) throw new Error(uploadData.error || `上传失败 HTTP ${uploadResp.status}`);

      let mediaType = 4;
      if (pendingFile.type.startsWith("image/")) mediaType = 2;
      else if (pendingFile.type.startsWith("video/")) mediaType = 5;

      const sendResp = await fetch(`/api/bots/${botId}/media/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaRef: uploadData.mediaRef, mediaType }),
      });
      const sendData = await sendResp.json();
      if (!sendResp.ok) throw new Error(sendData.error || `发送失败 HTTP ${sendResp.status}`);

      clearPreview();
      onSend();
    } catch (err) {
      showError(`媒体发送失败: ${err}`);
    } finally {
      setSending(false);
    }
  }

  function clearPreview() {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setPendingFile(null);
  }

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const arrayBuffer = await blob.arrayBuffer();
        console.log("[Recording] captured", arrayBuffer.byteLength, "bytes");

        try {
          const audioCtx = new AudioContext({ sampleRate: 24000 });
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const pcmFloat = audioBuffer.getChannelData(0);
          const pcmInt16 = new Int16Array(pcmFloat.length);
          for (let i = 0; i < pcmFloat.length; i++) {
            const s = Math.max(-1, Math.min(1, pcmFloat[i]));
            pcmInt16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          console.log("[Recording] PCM samples:", pcmInt16.length);

          let silkData: Uint8Array;
          try {
            silkData = await encodePcmToSilk(pcmInt16.buffer, 24000);
          } catch (silkErr) {
            console.warn("[Recording] SILK encode failed, sending raw:", silkErr);
            silkData = new Uint8Array(pcmInt16.buffer);
          }
          console.log("[Recording] encoded:", silkData.length, "bytes");

          setSending(true);
          const formData = new FormData();
          formData.append("file", new Blob([new Uint8Array(silkData)], { type: "audio/silk" }), "voice.silk");
          const uploadResp = await fetch(`/api/bots/${botId}/media/upload`, {
            method: "POST",
            body: formData,
          });
          const uploadData = await uploadResp.json();
          console.log("[Recording] upload:", uploadResp.status, uploadData);
          if (!uploadResp.ok) throw new Error(uploadData.error || `上传失败 HTTP ${uploadResp.status}`);

          const sendResp = await fetch(`/api/bots/${botId}/media/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaRef: uploadData.mediaRef, mediaType: 3 }),
          });
          const sendData = await sendResp.json();
          console.log("[Recording] send:", sendResp.status, sendData);
          if (!sendResp.ok) throw new Error(sendData.error || `发送失败 HTTP ${sendResp.status}`);
          onSend();
        } catch (err) {
          showError(`语音发送失败: ${err}`);
        } finally {
          setSending(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      showError(`麦克风访问失败: ${err}`);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="border-t bg-white p-3 space-y-2">
      {error && (
        <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

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
            {sending ? "发送中..." : "发送"}
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
          onClick={recording ? stopRecording : startRecording}
          disabled={sending}
          className={`rounded-lg px-3 py-2 text-sm disabled:opacity-50 ${
            recording
              ? "bg-red-500 text-white animate-pulse"
              : "border border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {recording ? "⏹" : "🎤"}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          📎
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
