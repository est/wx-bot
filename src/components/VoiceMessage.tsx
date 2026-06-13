"use client";

import { useState, useEffect } from "react";
import { decodeSilkToWavUrl } from "./silk";

export default function VoiceMessage({
  src,
  className = "",
}: {
  src: string;
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
        if (!res.ok) {
          console.error("[VoiceMessage] fetch failed:", res.status, src);
          throw new Error(`fetch failed: ${res.status}`);
        }
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        // Try SILK decode, fall back to direct play if it fails
        try {
          url = await decodeSilkToWavUrl(buf);
          if (!cancelled) setWavUrl(url);
        } catch (silkErr) {
          console.warn("[VoiceMessage] SILK decode failed, trying raw audio:", silkErr);
          // Fallback: try playing the raw data as-is
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

  if (loading) return <span className="text-xs text-gray-400">加载语音...</span>;
  if (error || !wavUrl) return <span className="text-xs text-gray-400">[语音]</span>;

  return <audio controls src={wavUrl} className={className} />;
}
