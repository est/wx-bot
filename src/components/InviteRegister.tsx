"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";

interface InviteInfo {
  valid: boolean;
  userName?: string;
  passkeyCount?: number;
  reason?: string;
}

export default function InviteRegister({ token }: { token: string }) {
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then((r) => r.json())
      .then(setInfo)
      .catch((err) => setError(String(err)));
  }, [token]);

  async function handleRegister() {
    setRegistering(true);
    setError("");
    try {
      const optionsResp = await fetch(`/api/invites/${token}/register/options`);
      const optionsData = await optionsResp.json();
      if (!optionsResp.ok) throw new Error(optionsData.error);

      const registrationResponse = await startRegistration(optionsData.options);

      const verifyResp = await fetch(`/api/invites/${token}/register/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: registrationResponse }),
      });
      const verifyData = await verifyResp.json();
      if (!verifyResp.ok) throw new Error(verifyData.error);

      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      setError(`注册失败: ${err}`);
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-auto max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">接受邀请</h1>

        {info === null && !error && (
          <p className="mt-4 text-sm text-gray-400">验证邀请链接...</p>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {info && !info.valid && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {info.reason}
          </div>
        )}

        {info && info.valid && !done && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{info.userName}</span> 邀请你共享账号
              <span className="ml-1 text-gray-400">
                (已有 {info.passkeyCount} 个 passkey)
              </span>
            </p>
            <button
              onClick={handleRegister}
              disabled={registering}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {registering ? "正在注册 Passkey..." : "注册 Passkey 并加入"}
            </button>
          </div>
        )}

        {done && (
          <div className="mt-4 text-center">
            <p className="text-sm font-medium text-green-600">注册成功！</p>
            <p className="mt-1 text-xs text-gray-400">正在跳转...</p>
          </div>
        )}
      </div>
    </div>
  );
}
