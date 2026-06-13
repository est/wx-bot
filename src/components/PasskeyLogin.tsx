"use client";

import { useState } from "react";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

export default function PasskeyLogin() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function handleLogin() {
    setStatus("正在验证通行密钥...");
    setError("");
    try {
      const optionsResp = await fetch("/api/auth/login/options");
      const optionsJSON = await optionsResp.json();
      if (!optionsResp.ok) throw new Error(optionsJSON.error);

      const authResp = await startAuthentication({ optionsJSON });

      const verifyResp = await fetch("/api/auth/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authResp),
      });
      const verifyJSON = await verifyResp.json();
      if (!verifyResp.ok) throw new Error(verifyJSON.error);

      window.location.href = "/dashboard";
    } catch (err) {
      setError(String(err));
      setStatus("");
    }
  }

  async function handleLoginChooseAccount() {
    setStatus("选择账号...");
    setError("");
    try {
      // Clear cookie to get all credentials
      document.cookie = "last_credential_id=; path=/; max-age=0";
      const optionsResp = await fetch("/api/auth/login/options");
      const optionsJSON = await optionsResp.json();
      if (!optionsResp.ok) throw new Error(optionsJSON.error);

      const authResp = await startAuthentication({ optionsJSON });

      const verifyResp = await fetch("/api/auth/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authResp),
      });
      const verifyJSON = await verifyResp.json();
      if (!verifyResp.ok) throw new Error(verifyJSON.error);

      window.location.href = "/dashboard";
    } catch (err) {
      setError(String(err));
      setStatus("");
    }
  }

  async function handleRegister() {
    if (!name.trim()) return;
    setStatus("正在创建通行密钥...");
    setError("");
    try {
      const optionsResp = await fetch("/api/auth/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const optionsJSON = await optionsResp.json();
      if (!optionsResp.ok) throw new Error(optionsJSON.error);

      const attResp = await startRegistration({ optionsJSON });

      const verifyResp = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attResp),
      });
      const verifyJSON = await verifyResp.json();
      if (!verifyResp.ok) throw new Error(verifyJSON.error);

      window.location.href = "/dashboard";
    } catch (err) {
      setError(String(err));
      setStatus("");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">wx-bot</h1>
          <p className="mt-1 text-sm text-gray-500">微信 Bot 管理</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {status && (
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-600">{status}</div>
        )}

        {mode === "login" ? (
          <div className="space-y-3">
            <button
              onClick={handleLogin}
              disabled={!!status}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              使用通行密钥登录
            </button>
            <p className="text-center text-xs text-gray-400">
              上次登录的设备将自动弹出验证
            </p>
            <button
              onClick={handleLoginChooseAccount}
              disabled={!!status}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              选择其他账号
            </button>
            <p className="text-center text-sm text-gray-500">
              还没有账号？{" "}
              <button
                onClick={() => { setMode("register"); setError(""); }}
                className="text-blue-600 hover:underline"
              >
                注册
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="email"
              placeholder="邮箱地址"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={128}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400">
              通行密钥绑定此邮箱，邮箱失效将无法找回账号
            </p>
            <button
              onClick={handleRegister}
              disabled={!name.trim() || !!status}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              创建通行密钥
            </button>
            <p className="text-center text-sm text-gray-500">
              已有账号？{" "}
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className="text-blue-600 hover:underline"
              >
                登录
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
