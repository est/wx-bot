"use client";

import { useState, useEffect } from "react";
import { decodeSilkToWavUrl } from "./silk";
import { fetchWithCorsFallback } from "@/lib/cors-fetch";

async function aesDecrypt(data: ArrayBuffer, keyBase64: string): Promise<ArrayBuffer> {
  const keyBytes = new Uint8Array(atob(keyBase64).split("").map(c => c.charCodeAt(0)));
  let key: Uint8Array;
  if (keyBytes.length === 16) {
    key = keyBytes;
  } else if (keyBytes.length === 32) {
    const hex = new TextDecoder().decode(keyBytes);
    key = new Uint8Array(hex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  } else {
    throw new Error(`Invalid key length: ${keyBytes.length}`);
  }

  const cryptoKey = await crypto.subtle.importKey("raw", new Uint8Array(key), { name: "AES-ECB" }, false, ["decrypt"]);
  return crypto.subtle.decrypt({ name: "AES-ECB" }, cryptoKey, data);
}

export default function VoiceMessage({
  src,
  aesKey,
  playtime,
  text,
  className = "",
}: {
  src: string;
  aesKey?: string;
  playtime?: number;
  text?: string;
  className?: string;
}) {
  const [wavUrl, setWavUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        let buf = await fetchWithCorsFallback(src);

        if (aesKey) {
          buf = await aesDecrypt(buf, aesKey);
        }

        if (cancelled) return;

        try {
          url = await decodeSilkToWavUrl(new Uint8Array(buf));
          if (!cancelled) setWavUrl(url);
        } catch (silkErr) {
          console.warn("[VoiceMessage] SILK decode failed:", silkErr);
          const blob = new Blob([buf], { type: "audio/ogg" });
          url = URL.createObjectURL(blob);
          if (!cancelled) setWavUrl(url);
        }
      } catch (err) {
        console.error("[VoiceMessage] error:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [src, aesKey]);

  const duration = playtime ? `${(playtime / 1000).toFixed(3)}s` : "";

  return (
    <div className="space-y-1">
      {loading && <span className="text-xs text-gray-400">加载语音...</span>}
      {!loading && error && <span className="text-xs text-gray-400">[语音]</span>}
      {!loading && !error && wavUrl && (
        <audio controls src={wavUrl} className={className} />
      )}
      {duration && <div className="text-xs text-gray-500">{duration}</div>}
      {text && <p className="text-xs text-gray-600 italic">"{text}"</p>}
    </div>
  );
}
