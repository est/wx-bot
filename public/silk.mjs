// silk.mjs — standalone silk-wasm wrapper, loaded on demand by browser
// Not bundled by Next.js. Import from CDN directly.

const CDN = "https://unpkg.com/silk-wasm@3.7.1/lib/index.mjs";

let mod = null;

export async function load() {
  if (mod) return mod;
  mod = await import(CDN);
  return mod;
}

export async function decode(silkBytes, sampleRate = 24000) {
  const m = await load();
  return m.decode(silkBytes, sampleRate);
}

export async function encode(pcmBuffer, sampleRate = 24000) {
  const m = await load();
  return m.encode(pcmBuffer, sampleRate);
}

export async function isSilk(data) {
  const m = await load();
  return m.isSilk(data);
}
