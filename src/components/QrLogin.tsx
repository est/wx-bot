"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function QrLogin() {
  const [qrcodeUrl, setQrcodeUrl] = useState("");
  const [botId, setBotId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Auto-start login on mount
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

        // Open QR in popup
        window.open(data.qrcodeUrl, "wx-qr", "width=400,height=500");
      } catch (err) {
        setError(String(err));
      }
    })();
  }, []);

  useEffect(() => {
    if (!sessionId || !botId) return;

    pollingRef.current = setInterval(async () => {
      try {
        const resp = await fetch(
          `/api/bots/${botId}/qr-login/poll?sessionId=${sessionId}`
        );
        const data = await resp.json();

        if (data.status === "confirmed") {
          setStatus("登录成功！");
          setDone(true);
          if (pollingRef.current) clearInterval(pollingRef.current);
          setTimeout(() => router.push(`/dashboard/bots/${botId}`), 1000);
        } else if (data.status === "expired") {
          setError(data.message || "二维码已过期");
          if (pollingRef.current) clearInterval(pollingRef.current);
        } else {
          setStatus(data.message || data.status);
        }
      } catch {
        // polling error, continue
      }
    }, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [sessionId, botId, router]);

  return (
    <div className="mx-auto max-w-md">
      <h2 className="text-xl font-bold text-gray-900">添加新 Bot</h2>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
          <button
            onClick={() => router.push("/dashboard")}
            className="ml-2 underline"
          >
            返回
          </button>
        </div>
      )}

      {!error && !done && (
        <div className="mt-6 space-y-4 text-center">
          <p className="text-sm text-gray-600">{status}</p>
          {qrcodeUrl && (
            <div>
              <p className="text-xs text-gray-400 mb-2">
                二维码已在新窗口打开，请用微信扫码
              </p>
              <a
                href={qrcodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                点击重新打开二维码
              </a>
            </div>
          )}
          {!qrcodeUrl && (
            <p className="text-sm text-gray-400">正在生成二维码...</p>
          )}
          <button
            onClick={() => {
              if (pollingRef.current) clearInterval(pollingRef.current);
              router.push("/dashboard");
            }}
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
