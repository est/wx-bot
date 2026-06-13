"use client";

let silkModule: any = null;

async function loadSilk() {
  if (silkModule) return silkModule;
  console.log("[silk] loading from CDN...");
  try {
    // @ts-expect-error CDN import
    silkModule = await import("https://esm.sh/silk-wasm@3.7.1?standalone");
    console.log("[silk] loaded, exports:", Object.keys(silkModule));
  } catch (err) {
    console.error("[silk] load failed:", err);
    throw err;
  }
  return silkModule;
}

function pcmToWav(pcm: Int16Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);
  new Int16Array(buffer, 44).set(pcm);

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export async function decodeSilkToWavUrl(
  silkData: ArrayBuffer | Uint8Array,
  sampleRate = 24000
): Promise<string> {
  const silk = await loadSilk();
  const input =
    silkData instanceof Uint8Array ? silkData : new Uint8Array(silkData);
  const result = await silk.decode(input, sampleRate);
  const wavBlob = pcmToWav(new Int16Array(result.data.buffer), sampleRate);
  return URL.createObjectURL(wavBlob);
}

export async function encodePcmToSilk(
  pcmData: ArrayBuffer,
  sampleRate = 24000
): Promise<Uint8Array> {
  const silk = await loadSilk();
  const result = await silk.encode(pcmData, sampleRate);
  return result.data;
}

export async function isSilkData(
  data: ArrayBuffer | Uint8Array
): Promise<boolean> {
  const silk = await loadSilk();
  return silk.isSilk(data instanceof Uint8Array ? data : new Uint8Array(data));
}
