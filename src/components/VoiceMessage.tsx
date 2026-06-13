"use client";

import { useState, useEffect } from "react";
import { decodeSilkToWavUrl } from "./silk";
import { fetchWithCorsFallback } from "@/lib/cors-fetch";

// AES-128-ECB using aes-js (Web Crypto doesn't support ECB mode)
async function aesDecrypt(data: ArrayBuffer, keyBase64: string): Promise<Uint8Array> {
  // @ts-expect-error CDN import
  const aesjs = await import("https://cdn.jsdelivr.net/npm/aes-js@3.1.2/index.js");
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

  const aesEcb = new aesjs.ModeOfOperation.ecb(key);
  return aesEcb.decrypt(new Uint8Array(data));
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
        let rawData = await fetchWithCorsFallback(src);
        let audioData: Uint8Array;

        if (aesKey) {
          audioData = await aesDecrypt(rawData, aesKey);
        } else {
          audioData = new Uint8Array(rawData);
        }

        if (cancelled) return;

        try {
          url = await decodeSilkToWavUrl(audioData);
          if (!cancelled) setWavUrl(url);
        } catch (silkErr) {
          console.warn("[VoiceMessage] SILK decode failed:", silkErr);
          const blob = new Blob([new Uint8Array(audioData)], { type: "audio/ogg" });
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
