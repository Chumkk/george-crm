/* Cache only content-versioned public assets. HTML navigation always reaches the network. */
const CACHE = 'george-crm-static-v1';
const ASSETS = new Set(["main-CYNimE0W.js","main-Xab9S-qf.css","crm-style-027e65426189.css","engine-startup-5364eb5f695e.js","engine-policy-9612aca7414d.js","engine-crm-8b50e68369d3.js","engine-workflows-ce8a8d765db3.js","engine-quoteRevision-eea9b7b9851e.js","engine-projectQuoteList-5c2f0a5709bf.js","engine-customerQuoteLayout-863272bc1e47.js","engine-orderRevision-87c01372dc1d.js","engine-customerHub-4fbb2922cdde.js","engine-todoDemoFill-8bea994fc26c.js","engine-allocationBatch-d79e8d96da75.js","engine-projectFormProgress-3a196593f417.js","engine-customerIntake-aa9e8f071140.js","engine-businessSync-c73f351329a8.js","engine-designWorkflow-a5ca5671a776.js","engine-opportunityQuotes-cf44a857c249.js","engine-managementWorkflow-ee9591254203.js","engine-progressTracking-88943eedbeaa.js","engine-taskFollowup-208fcc301360.js","engine-taskMonitoringDemo-6204b7ec7ae9.js","engine-todoDrawers-557fefe47625.js","engine-designQuotation-0e71ccde27c7.js","engine-expenseWorkflow-12ebbc440729.js","engine-managementMonitoring-1bce6e89ab32.js","engine-designGds-d695bcecbb3b.js","engine-procurementWorkflow-5371bf1c9e5b.js","engine-unifiedAllocation-439cbe682534.js","engine-designOrderDelivery-ccebfc04b75b.js","engine-designScenario-c8c9330b8eee.js","engine-acceptanceEditing-2f6557e3d297.js","engine-taskHistory-7c66892d72b1.js","engine-clientProposalData-f7524e37d09d.js","engine-clientProposal-709bf3e4affc.js","engine-clientPreviewCalendar-d590f3b2259b.js","engine-clientQuoteDemoHistory-28b9d48effae.js","engine-clientQuoteUpdates-0f4fa3321649.js","engine-clientShare-4af80b3e0fd2.js","engine-quotationDelivery-8b57e2d4c11a.js","engine-quoteAssistance-87df72ef1c80.js","engine-departmentQuotes-cdcaf69b394b.js","engine-productImages-d628301e9a02.js","engine-todoScenario-394589e759e5.js","engine-taskScenarioHistory-6c171218145b.js","engine-projectCodes-630507e687a5.js","engine-taskGuidance-f0362c9dcd80.js","engine-bridge-e4a810c281ae.js","AiDesign-DQiqufn1.js","client-spatial-preview-entry.js","client-spatial-preview-runtime.js","CustomerCenter-CzPRySso.css","CustomerCenter-DBQxvXjr.js","DesignCanvas-C3y-5gv4.js","DesignPreparation-CEa1YPEf.css","DesignPreparation-COAKxD4d.js","DesignResultViewer-Bw0A97zv.js","DesignResultViewer-jFoACV1h.css","gos-scrm-adapter.js","gos-scrm-embed.css","gos-scrm-storage.js","gos-scrm-vendor.css","gos-scrm-vendor.js","GosScrmWorkspace-BS-uiY89.js","GosScrmWorkspace-CBJ0ojeN.css","index-BhG_xKEW.css","LeadCenter-CJoMYJJ1.js","engine-three-3148608114d1.js","floor-plan-0f6203e54a8f.svg","media-092c8bab7ec2e8cdc57b.webp","media-1807b49ee3e7099995d8.webp","media-2aa24b01d8ea3250e0a4.jpg","media-2e94b4866f98d0ce3bc0.webp","media-2fad44380295c6f678cf.webp","media-305a3fa29374b7dc7510.webp","media-33a38be9921de3814126.webp","media-356fa830f90e55810f2d.webp","media-3b14bbaf6374b4f162ac.webp","media-4a004a91e7befd959ad6.webp","media-66c05f99937607907500.webp","media-71e46a5b3fa73eb03aaa.webp","media-8d155858750f0fe78c74.webp","media-93e43d187181abbf75e9.jpg","media-9e6ebe304e2f0e4f6f4c.jpg","media-a09ca1cd4df0fba30695.webp","media-a80ddba93c3f63e9473b.webp","media-ae9cea05e60755a16bf5.webp","media-c0dfa53a5ef5434ada0a.png","media-d028a576397606b1a7c0.webp","media-d95de23372cd9b7f77a8.jpg","media-e63a823db343ea975d9d.jpg","media-ef4abbd71d28c290a320.webp","media-f0174b0a502c6f370365.webp","media-fc971d2538fa726720d1.webp","media-ff99b58e9a12854fcc19.webp","quote-editor-0486413717de.html","quote-editor-189aa7b75a25.html","quote-editor-20f8bd99ae66.html","quote-editor-28ec46a435fb.html","quote-editor-2b76ebefba5b.html","quote-editor-3459931cd052.html","quote-editor-481fe0a95093.html","quote-editor-4a687b69bf2b.html","quote-editor-52e8e5eccd92.html","quote-editor-54d54d50d9cd.html","quote-editor-58240901fdc6.html","quote-editor-5967f45beb8b.html","quote-editor-78b4071862ef.html","quote-editor-7bda72305386.html","quote-editor-7bee97a17521.html","quote-editor-8dbbb17dbdae.html","quote-editor-a917f1234e3c.html","quote-editor-bcc47694975d.html","quote-editor-c52ba792c9cf.html","quote-editor-cb9effee72a2.html","quote-editor-d9bd951cccb5.html","quote-editor-def99ddf251c.html","quote-editor-ec05553c16c1.html","quote-editor-ef3b6c714ef5.html","quote-editor-f0ee1a5f00d4.html","quote-editor-f43cfcfbee02.html","quote-editor-fb045b4fa33c.html","quote-editor-ff4bb732e032.html"].map(path => new URL(path, self.registration.scope).href));
const WARM = ["main-CYNimE0W.js","main-Xab9S-qf.css","crm-style-027e65426189.css","engine-startup-5364eb5f695e.js","engine-policy-9612aca7414d.js","engine-crm-8b50e68369d3.js","engine-workflows-ce8a8d765db3.js","engine-quoteRevision-eea9b7b9851e.js","engine-projectQuoteList-5c2f0a5709bf.js","engine-customerQuoteLayout-863272bc1e47.js","engine-orderRevision-87c01372dc1d.js","engine-customerHub-4fbb2922cdde.js","engine-todoDemoFill-8bea994fc26c.js","engine-allocationBatch-d79e8d96da75.js","engine-projectFormProgress-3a196593f417.js","engine-customerIntake-aa9e8f071140.js","engine-businessSync-c73f351329a8.js","engine-designWorkflow-a5ca5671a776.js","engine-opportunityQuotes-cf44a857c249.js","engine-managementWorkflow-ee9591254203.js","engine-progressTracking-88943eedbeaa.js","engine-taskFollowup-208fcc301360.js","engine-taskMonitoringDemo-6204b7ec7ae9.js","engine-todoDrawers-557fefe47625.js","engine-designQuotation-0e71ccde27c7.js","engine-expenseWorkflow-12ebbc440729.js","engine-managementMonitoring-1bce6e89ab32.js","engine-designGds-d695bcecbb3b.js","engine-procurementWorkflow-5371bf1c9e5b.js","engine-unifiedAllocation-439cbe682534.js","engine-designOrderDelivery-ccebfc04b75b.js","engine-designScenario-c8c9330b8eee.js","engine-acceptanceEditing-2f6557e3d297.js","engine-taskHistory-7c66892d72b1.js","engine-clientProposalData-f7524e37d09d.js","engine-clientProposal-709bf3e4affc.js","engine-clientPreviewCalendar-d590f3b2259b.js","engine-clientQuoteDemoHistory-28b9d48effae.js","engine-clientQuoteUpdates-0f4fa3321649.js","engine-clientShare-4af80b3e0fd2.js","engine-quotationDelivery-8b57e2d4c11a.js","engine-quoteAssistance-87df72ef1c80.js","engine-departmentQuotes-cdcaf69b394b.js","engine-productImages-d628301e9a02.js","engine-todoScenario-394589e759e5.js","engine-taskScenarioHistory-6c171218145b.js","engine-projectCodes-630507e687a5.js","engine-taskGuidance-f0362c9dcd80.js","engine-bridge-e4a810c281ae.js"].map(path => new URL(path, self.registration.scope).href);
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
