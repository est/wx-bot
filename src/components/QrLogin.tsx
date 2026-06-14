"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function QrLogin() {
  const [qrcodeUrl, setQrcodeUrl] = useState("");
  const [botId, setBotId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch("/api/bots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error);

        setBotId(data.botId);
        setSessionId(data.sessionId);
        setQrcodeUrl(data.qrcodeUrl);
        setStatus("等待扫码...");
      } catch (err) {
        setError(String(err));
      }
    })();
  }, []);

  useEffect(() => {
    if (!sessionId || !botId) return;

    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const resp = await fetch(
          `/api/bots/${botId}/qr-login/poll?sessionId=${sessionId}`
        );
        const data = await resp.json();

        if (cancelled) return;

        if (data.status === "confirmed") {
          setStatus("登录成功！");
          setDone(true);
          setTimeout(() => router.push(`/dashboard/bots/${botId}`), 1000);
        } else if (data.status === "expired") {
          setError(data.message || "二维码已过期");
        } else {
          setStatus(data.message || data.status);
          setTimeout(poll, 2000);
        }
      } catch {
        if (!cancelled) setTimeout(poll, 2000);
      }
    }

    poll();

    return () => { cancelled = true; };
  }, [sessionId, botId, router]);

  return (
    <div className="mx-auto max-w-md">
      <h2 className="text-xl font-bold text-gray-900">添加新 Bot</h2>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
          <button onClick={() => router.push("/dashboard")} className="ml-2 underline">返回</button>
        </div>
      )}

      {!error && !done && (
        <div className="mt-6 space-y-4 text-center">
          <p className="text-sm text-gray-600">{status}</p>
          {qrcodeUrl && (
            <img
              src={`https://t.est.im/qr?s=${encodeURIComponent(qrcodeUrl)}`}
              alt="扫码登录"
              className="mx-auto h-64 w-64 rounded-lg border"
            />
          )}
          {!qrcodeUrl && <p className="text-sm text-gray-400">正在生成二维码...</p>}
          <p className="text-xs text-gray-400">请使用手机微信扫描二维码</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-gray-500 hover:text-red-600"
          >
            取消
          </button>
        </div>
      )}

      {done && (
        <div className="mt-6 text-center">
          <p className="text-lg font-medium text-green-600">登录成功！</p>
          <p className="mt-2 text-sm text-gray-500">正在跳转...</p>
        </div>
      )}
    </div>
  );
}
