// silk.mjs — standalone silk-wasm wrapper
// Loaded via <script type="module"> by React component
// Sets window.__silk for access from bundled code

const CDN = "https://unpkg.com/silk-wasm@3.7.1/lib/index.mjs";

let mod = null;

async function load() {
  if (mod) return mod;
  mod = await import(CDN);
  return mod;
}

window.__silk = {
  async decode(silkBytes, sampleRate = 24000) {
    const m = await load();
    return m.decode(silkBytes, sampleRate);
  },
  async encode(pcmBuffer, sampleRate = 24000) {
    const m = await load();
    return m.encode(pcmBuffer, sampleRate);
  },
  async isSilk(data) {
    const m = await load();
    return m.isSilk(data);
  },
};
