"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function QrLogin() {
  const [qrcodeUrl, setQrcodeUrl] = useState("");
  const [botId, setBotId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"start" | "qr" | "done">("start");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  async function startLogin() {
    setError("");
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
      setStep("qr");
    } catch (err) {
      setError(String(err));
    }
  }

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
          setStep("done");
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
        </div>
      )}

      {step === "start" && (
        <div className="mt-6 space-y-4">
          <button
            onClick={startLogin}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700"
          >
            生成登录二维码
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
          >
            返回
          </button>
        </div>
      )}

      {step === "qr" && (
        <div className="mt-6 space-y-4 text-center">
          <p className="text-sm text-gray-600">{status}</p>
          {qrcodeUrl && (
            <iframe
              src={qrcodeUrl}
              className="mx-auto h-80 w-80 rounded-lg border"
              sandbox="allow-scripts allow-same-origin"
            />
          )}
          <p className="text-xs text-gray-400">
            请使用手机微信扫描二维码
          </p>
          <button
            onClick={() => {
              setStep("start");
              setError("");
              if (pollingRef.current) clearInterval(pollingRef.current);
            }}
            className="text-sm text-gray-500 hover:text-red-600"
          >
            取消
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="mt-6 text-center">
          <p className="text-lg font-medium text-green-600">登录成功！</p>
          <p className="mt-2 text-sm text-gray-500">正在跳转...</p>
        </div>
      )}
    </div>
  );
}
