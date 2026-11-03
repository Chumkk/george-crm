/* Deployment notification is independent of quotation/workflow data. It never saves or reloads automatically. */
(function(root){
  function createReleaseWatcher(options) {
    const { version, builtAt, url, onUpdate, fetch: request, document: doc, window: win } = options;
    const clock = options.now || Date.now, timers = options.timers || root;
    const notified = new Set();
    let stopped = false, pending = false, checkedAt = -Infinity, controller = null;
    async function check() {
      if (stopped || pending || doc.hidden || clock() - checkedAt < 10000) return;
      pending = true; checkedAt = clock();
      controller = new AbortController();
      const deadline = timers.setTimeout(() => controller?.abort(), 5000);
      try {
        const target = new URL(url); target.searchParams.set('check', String(clock()));
        const response = await request(target.href, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const release = await response.json();
        const nextVersion = options.documentKey ? release?.documents?.[options.documentKey] : release?.version;
        if (stopped || release?.schema !== 1 || !/^[a-f0-9]{64}$/.test(nextVersion || '') || !Number.isFinite(Date.parse(release.builtAt)) || Date.parse(release.builtAt) < Date.parse(builtAt) || nextVersion === version || notified.has(nextVersion)) return;
        notified.add(nextVersion); onUpdate({ ...release, version: nextVersion });
      } catch { /* Offline checks do not block work or report an update that was not verified. */ }
      finally { timers.clearTimeout(deadline); pending = false; controller = null; }
    }
    const visible = () => { if (!doc.hidden) check(); };
    doc.addEventListener('visibilitychange', visible);
    win.addEventListener('focus', visible); win.addEventListener('online', visible);
    const interval = timers.setInterval(check, options.interval || 60000);
    check();
    return { check, stop() { stopped = true; controller?.abort(); timers.clearInterval(interval); doc.removeEventListener('visibilitychange', visible); win.removeEventListener('focus', visible); win.removeEventListener('online', visible); } };
  }
  function quotationNeedsSave(doc) {
    const frame = doc.getElementById('pimsFrame');
    if (!frame) return false;
    try {
      const editor = frame.contentDocument;
      return !!editor && (/有未保存的更改|正在保存/.test(editor.getElementById('edSaveStatus')?.textContent || '') || !!editor.querySelector('td.edit'));
    } catch { return false; }
  }
  function rememberReading(doc, win, key) {
    if (!key) return;
    try { win.sessionStorage.setItem('crm-document-reading:' + key, JSON.stringify({ top: win.scrollY || 0, left: win.scrollX || 0, hash: win.location.hash || '', at: Date.now() })); } catch { /* Reading storage is optional. */ }
  }
  function restoreReading(win, key) {
    if (!key) return;
    try { const value = win.sessionStorage.getItem('crm-document-reading:' + key); if (!value) return; win.sessionStorage.removeItem('crm-document-reading:' + key); const saved = JSON.parse(value); if (saved.hash !== (win.location.hash || '') || Date.now() - saved.at > 1800000) return; win.requestAnimationFrame(() => win.requestAnimationFrame(() => win.scrollTo(saved.left, saved.top))); } catch { /* Native reading/navigation remains available. */ }
  }
  function showNotice(doc, win, options = {}) {
    if (doc.getElementById('crm-release-notice')) return;
    const box = doc.createElement('aside'); box.id = 'crm-release-notice'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
    box.innerHTML = '<strong>页面已更新</strong><p>刷新后查看最新内容，编辑中的内容请先保存。</p><p data-release-warning hidden role="alert"></p><div><button type="button" data-release-later>稍后</button><button type="button" data-release-refresh>刷新</button></div>';
    if (options.documentKey) { box.querySelector('strong').textContent = '文档已更新'; box.querySelector('p').textContent = '刷新后查看最新文档内容。'; }
    const style = doc.createElement('style');
    style.textContent = '#crm-release-notice{position:fixed;right:24px;bottom:24px;width:min(390px,calc(100vw - 48px));box-sizing:border-box;background:#fff;border:1px solid #c8def0;border-radius:10px;box-shadow:0 8px 28px #173d5c20;padding:18px;z-index:18000;color:#29445b;font:14px/1.6 system-ui,sans-serif}#crm-release-notice strong{font-size:16px}#crm-release-notice p{margin:6px 0 12px;color:#6b8194}#crm-release-notice div{display:flex;justify-content:flex-end;gap:8px}#crm-release-notice button{cursor:pointer;border:1px solid #d8e2eb;background:white;border-radius:5px;padding:6px 18px;font:inherit;color:#526b80}#crm-release-notice [data-release-refresh]{background:#1677ff;border-color:#1677ff;color:white}#crm-release-notice [data-release-warning]{color:#a56819}@media print{#crm-release-notice{display:none!important}}';
    box.appendChild(style);
    box.querySelector('[data-release-later]').onclick = () => box.remove();
    box.querySelector('[data-release-refresh]').onclick = () => {
      if (quotationNeedsSave(doc)) {
        const warning = box.querySelector('[data-release-warning]'); warning.hidden = false;
        warning.textContent = '报价有未暂存的修改或正在保存，请完成暂存后再刷新。'; return;
      }
      rememberReading(doc, win, options.documentKey);
      for (const frame of doc.querySelectorAll?.('iframe') || []) try { const reader = frame.contentWindow.CRMReleaseNotice; if (reader?.documentKey) reader.rememberReading(frame.contentDocument, frame.contentWindow, reader.documentKey); } catch { /* Only same-origin readers share reading position. */ }
      if (options.version && win.location.href && win.location.replace) { const target = new URL(win.location.href); target.searchParams.set('crmRelease', options.version); win.location.replace(target.href); } else win.location.reload();
    };
    doc.body.appendChild(box);
  }
  root.CRMReleaseNotice = { createReleaseWatcher, quotationNeedsSave, showNotice, rememberReading, restoreReading };
  if (root.document?.body && root.document.documentElement?.dataset?.entry !== 'client') {
    const script = root.document.currentScript;
    const documentKey = script.dataset.releaseDocument || '';
    root.CRMReleaseNotice.documentKey = documentKey;
    restoreReading(root, documentKey);
    try { if (documentKey && root.parent !== root && root.parent.CRMReleaseNotice?.watcher) return; } catch { /* Independent readers run their own observer. */ }
    const url = new URL('./app-release.json', script.src).href;
    root.CRMReleaseNotice.watcher = createReleaseWatcher({ version: script.dataset.releaseVersion || "e34c8558981a7745102237a4d06e7804e73a7a9b1a0fa41432e7267828aa4583", builtAt: script.dataset.releaseBuiltAt || "2026-11-03T16:00:50.964Z", documentKey, url, onUpdate: release => { try { if (documentKey && root.parent !== root && root.parent.CRMReleaseNotice?.watcher) return; } catch {} showNotice(root.document, root, { documentKey, version: release.version }); }, fetch: root.fetch.bind(root), document: root.document, window: root });
  }
})(typeof window === 'undefined' ? globalThis : window);
