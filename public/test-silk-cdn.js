// silk-wasm CDN test — 直接在浏览器 Console 里看结果
// 在浏览器地址栏输入: javascript: 复制粘贴这段代码

const CDN_URLS = [
  { name: "1. esm.sh",          url: "https://esm.sh/silk-wasm@3.7.1" },
  { name: "2. esm.sh bundle=false", url: "https://esm.sh/silk-wasm@3.7.1?bundle=false" },
  { name: "3. jsdelivr lib",    url: "https://cdn.jsdelivr.net/npm/silk-wasm@3.7.1/lib/index.mjs" },
  { name: "4. esm.sh standalone", url: "https://esm.sh/silk-wasm@3.7.1?standalone" },
  { name: "5. unpkg lib",       url: "https://unpkg.com/silk-wasm@3.7.1/lib/index.mjs" },
];

// 12 bytes of silence as test SILK data (too short, but tests import)
const TEST_SILK = new Uint8Array([0x02, 0x23, 0x21, 0x53, 0x49, 0x4c, 0x4b, 0x5f, 0x56, 0x33, 0x00, 0x00]);

async function testOne(entry) {
  console.log(`\n=== ${entry.name} ===`);
  console.log(`URL: ${entry.url}`);

  try {
    // Step 1: Import
    console.log("1/3 Importing module...");
    const t0 = performance.now();
    const mod = await import(entry.url);
    const t1 = performance.now();
    console.log(`   OK in ${(t1-t0).toFixed(0)}ms, exports:`, Object.keys(mod));

    // Step 2: Check functions
    console.log("2/3 Checking functions...");
    console.log(`   decode: ${typeof mod.decode}`);
    console.log(`   encode: ${typeof mod.encode}`);
    console.log(`   isSilk: ${typeof mod.isSilk}`);

    if (typeof mod.decode !== "function") {
      console.error("   FAIL: decode is not a function");
      return false;
    }

    // Step 3: Try decode (will fail on bad data, but tests WASM init)
    console.log("3/3 Calling decode (expect failure on test data)...");
    try {
      const result = await mod.decode(TEST_SILK, 24000);
      console.log("   Result:", result);
    } catch (decodeErr) {
      // Expected: invalid SILK data
      console.log("   Decode threw (expected):", decodeErr.message);
      // Check if it's the WASM init error or a normal decode error
      if (decodeErr.message.includes("e.x") || decodeErr.message.includes("is not a function")) {
        console.error("   FAIL: WASM not initialized");
        return false;
      }
      console.log("   PASS: module loaded, WASM works, just bad test data");
      return true;
    }

    return true;
  } catch (err) {
    console.error("   FAIL:", err.message);
    console.error("   Stack:", err.stack?.split("\n").slice(0, 3).join("\n"));
    return false;
  }
}

async function testAll() {
  console.log("Testing silk-wasm CDN sources...\n");
  const results = [];

  for (const entry of CDN_URLS) {
    const ok = await testOne(entry);
    results.push({ name: entry.name, ok });
    // Small delay between tests
    await new Promise(r => setTimeout(r, 500));
  }

  console.log("\n\n========== RESULTS ==========");
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name}`);
  }
  console.log("=============================");
}

testAll();
