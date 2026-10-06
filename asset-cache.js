/* Cache only content-versioned public assets. HTML navigation always reaches the network. */
const CACHE = 'george-crm-static-v1';
const ASSETS = new Set(["main-C29jOeSE.js","main-DUbeQ9Dg.css","crm-style-0725b2ed05b0.css","engine-startup-5364eb5f695e.js","engine-policy-b019293849df.js","engine-crm-1e753e603be6.js","engine-workflows-bd8868e09acf.js","engine-customerHub-9a841073a731.js","engine-bridge-cc945d3eb46a.js","AiDesign-DQiqufn1.js","CustomerCenter-CzPRySso.css","CustomerCenter-Dn7dDq86.js","DesignCanvas-C3y-5gv4.js","DesignPreparation-CEa1YPEf.css","DesignPreparation-COAKxD4d.js","DesignResultViewer-Bw0A97zv.js","DesignResultViewer-jFoACV1h.css","gos-scrm-adapter.js","gos-scrm-embed.css","gos-scrm-storage.js","gos-scrm-vendor.css","gos-scrm-vendor.js","GosScrmWorkspace-CBJ0ojeN.css","GosScrmWorkspace-D_QWSDR-.js","index-BhG_xKEW.css","LeadCenter-BRIrPNCA.js","engine-three-3148608114d1.js","floor-plan-0f6203e54a8f.svg","media-092c8bab7ec2e8cdc57b.webp","media-1807b49ee3e7099995d8.webp","media-2aa24b01d8ea3250e0a4.jpg","media-2e94b4866f98d0ce3bc0.webp","media-2fad44380295c6f678cf.webp","media-305a3fa29374b7dc7510.webp","media-33a38be9921de3814126.webp","media-356fa830f90e55810f2d.webp","media-3b14bbaf6374b4f162ac.webp","media-4a004a91e7befd959ad6.webp","media-66c05f99937607907500.webp","media-71e46a5b3fa73eb03aaa.webp","media-8d155858750f0fe78c74.webp","media-93e43d187181abbf75e9.jpg","media-9e6ebe304e2f0e4f6f4c.jpg","media-a09ca1cd4df0fba30695.webp","media-a80ddba93c3f63e9473b.webp","media-ae9cea05e60755a16bf5.webp","media-c0dfa53a5ef5434ada0a.png","media-d028a576397606b1a7c0.webp","media-d95de23372cd9b7f77a8.jpg","media-e63a823db343ea975d9d.jpg","media-ef4abbd71d28c290a320.webp","media-f0174b0a502c6f370365.webp","media-fc971d2538fa726720d1.webp","media-ff99b58e9a12854fcc19.webp","quote-editor-7bda72305386.html"].map(path => new URL(path, self.registration.scope).href));
const WARM = ["main-C29jOeSE.js","main-DUbeQ9Dg.css","crm-style-0725b2ed05b0.css","engine-startup-5364eb5f695e.js","engine-policy-b019293849df.js","engine-crm-1e753e603be6.js","engine-workflows-bd8868e09acf.js","engine-customerHub-9a841073a731.js","engine-bridge-cc945d3eb46a.js"].map(path => new URL(path, self.registration.scope).href);
async function remember(cache, url, response) {
  if (response.ok && response.type !== 'opaque') await cache.put(url, response.clone());
  return response;
}
async function cachedAsset(request) {
  let cache;
  try {
    cache = await caches.open(CACHE);
    const saved = await cache.match(request.url);
    if (saved) return saved;
  } catch {}
  const response = await fetch(request);
  if (cache) { try { await remember(cache, request.url, response); } catch {} }
  return response;
}
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  await self.clients.claim();
  try {
    const cache = await caches.open(CACHE);
    for (const request of await cache.keys()) {
      if (!ASSETS.has(request.url)) await cache.delete(request);
    }
    await Promise.allSettled(WARM.map(async url => {
      if (await cache.match(url)) return;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try { await remember(cache, url, await fetch(url, {cache:'force-cache',signal:controller.signal})); }
      finally { clearTimeout(timer); }
    }));
  } catch {}
})()));
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode === 'navigate' || !ASSETS.has(request.url)) return;
  event.respondWith(cachedAsset(request));
});
