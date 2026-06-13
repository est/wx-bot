"use client";

import { useState, useEffect } from "react";
import { decodeSilkToWavUrl } from "./silk";

export default function VoiceMessage({
  src,
  playtime,
  text,
  className = "",
}: {
  src: string;
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
        const res = await fetch(src);
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        try {
          url = await decodeSilkToWavUrl(buf);
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
  }, [src]);

  const duration = playtime ? `${(playtime / 1000).toFixed(3)}s` : "";

  return (
    <div className="space-y-1">
      {loading && <span className="text-xs text-gray-400">加载语音...</span>}
      {!loading && error && <span className="text-xs text-gray-400">[语音]</span>}
      {!loading && !error && wavUrl && (
        <audio controls src={wavUrl} className={className} />
      )}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {duration && <span>{duration}</span>}
      </div>
      {text && (
        <p className="text-xs text-gray-600 italic">"{text}"</p>
      )}
    </div>
  );
}
