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
  function pendingQuotationFrame(doc) {
    const frames = [...(doc.querySelectorAll?.('iframe#pimsFrame') || [])];
    const first = doc.getElementById('pimsFrame');
    if (first && !frames.includes(first)) frames.push(first);
    return frames.find(frame => {
      try {
        const editor = frame.contentDocument;
        return !!editor && (/有未保存的更改|正在保存/.test(editor.getElementById('edSaveStatus')?.textContent || '') || !!editor.querySelector('td.edit'));
      } catch { return false; }
    });
  }
  function quotationNeedsSave(doc) { return !!pendingQuotationFrame(doc); }
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
    const box = doc.createElement('dialog'); box.id = 'crm-release-notice';
    box.setAttribute('aria-labelledby', 'crm-release-title');
    box.setAttribute('aria-describedby', 'crm-release-description');
    const title = options.documentKey ? '文档有新版本' : '页面有新版本';
    const description = options.documentKey ? '点击「立即刷新」查看最新文档。' : '点击「立即刷新」加载最新版。正在编辑的内容请先保存。';
    box.innerHTML = '<h2 id="crm-release-title">' + title + '</h2><p id="crm-release-description">' + description + '</p><p data-release-warning hidden role="alert"></p><div><button type="button" data-release-later autofocus>稍后</button><button type="button" data-release-save hidden>返回报价暂存</button><button type="button" data-release-refresh>立即刷新</button></div>';
    const style = doc.createElement('style');
    style.textContent = `
      #crm-release-notice{position:fixed;inset:0;margin:auto;box-sizing:border-box;width:min(480px,calc(100vw - 32px));max-height:calc(100vh - 32px);padding:clamp(20px,5vw,32px);border:0;border-top:5px solid #1677ff;border-radius:14px;background:white;color:#233b53;box-shadow:0 18px 70px #10233755;font:15px/1.65 system-ui,sans-serif}
      #crm-release-notice::backdrop{background:#152b43a3}
      #crm-release-notice h2{margin:0 0 8px;font-size:25px;line-height:1.3}
      #crm-release-notice p{margin:0 0 20px;color:#4e6479}
      #crm-release-notice div{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px}
      #crm-release-notice button{min-height:44px;padding:8px 20px;border:1px solid #ccd9e5;border-radius:8px;background:white;color:#334c64;font:inherit;font-weight:600;cursor:pointer}
      #crm-release-notice button:focus-visible{outline:2px solid #1677ff;outline-offset:3px}
      #crm-release-notice [data-release-refresh]{background:#0969da;border-color:#0969da;color:white}
      #crm-release-notice [data-release-warning]{padding:10px 12px;border-radius:6px;background:#fff4df;color:#81510d}
      @media print{#crm-release-notice,#crm-release-notice::backdrop{display:none!important}}
    `;
    box.appendChild(style);
    box.addEventListener('keydown', event => event.stopPropagation());
    box.addEventListener('close', () => box.remove(), { once: true });
    box.querySelector('[data-release-later]').onclick = () => box.close();
    box.querySelector('[data-release-save]').onclick = () => {
      const frame = pendingQuotationFrame(doc);
      box.close();
      if (frame) {
        const tab = frame.closest?.('[data-tab]')?.dataset?.tab;
        if (tab) win.GeorgeRuntime?.navigate(tab, true);
        frame.contentWindow?.focus();
      }
      // Keep the update reachable after returning to the editor. Reload still
      // requires another explicit click and rechecks the durable-save guard.
      if (!doc.getElementById('crm-release-resume')) {
        const resume = doc.createElement('button'); resume.id = 'crm-release-resume'; resume.type = 'button';
        resume.textContent = '新版本待刷新';
        resume.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:2147483000;padding:10px 18px;border:1px solid #0969da;border-radius:8px;background:white;color:#0969da;cursor:pointer;font:600 14px system-ui';
        resume.onclick = () => { resume.remove(); showNotice(doc, win, options); };
        doc.body.appendChild(resume);
      }
    };
    box.querySelector('[data-release-refresh]').onclick = () => {
      const frame = pendingQuotationFrame(doc);
      if (frame) {
        const warning = box.querySelector('[data-release-warning]'); warning.hidden = false;
        const name = frame.contentDocument?.getElementById('draftName')?.value;
        warning.textContent = (name ? '报价「' + name + '」' : '报价') + '有未暂存的修改或正在保存。请点击「返回报价暂存」，完成暂存后点击「新版本待刷新」。';
        box.querySelector('[data-release-save]').hidden = false; return;
      }
      rememberReading(doc, win, options.documentKey);
      for (const frame of doc.querySelectorAll?.('iframe') || []) try { const reader = frame.contentWindow.CRMReleaseNotice; if (reader?.documentKey) reader.rememberReading(frame.contentDocument, frame.contentWindow, reader.documentKey); } catch { /* Only same-origin readers share reading position. */ }
      if (options.version && win.location.href && win.location.replace) {
        const target = new URL(win.location.href);
        target.searchParams.set('crmRelease', options.version);
        target.searchParams.set('crmRefresh', String(Date.now()));
        win.location.replace(target.href);
      } else win.location.reload();
    };
    doc.body.appendChild(box);
    box.showModal();
  }
  root.CRMReleaseNotice = { createReleaseWatcher, quotationNeedsSave, showNotice, rememberReading, restoreReading };
  if (root.document?.body && root.document.documentElement?.dataset?.entry !== 'client') {
    const script = root.document.currentScript;
    const documentKey = script.dataset.releaseDocument || '';
    root.CRMReleaseNotice.documentKey = documentKey;
    restoreReading(root, documentKey);
    try { if (documentKey && root.parent !== root && root.parent.CRMReleaseNotice?.watcher) return; } catch { /* Independent readers run their own observer. */ }
    const url = new URL('./app-release.json', script.src).href;
    root.CRMReleaseNotice.watcher = createReleaseWatcher({ version: script.dataset.releaseVersion || "41a23c474f74bb81bb709517783eaf7319835d524cfd123468b178d8475d12f2", builtAt: script.dataset.releaseBuiltAt || "2026-11-20T06:54:47.511Z", documentKey, url, onUpdate: release => { try { if (documentKey && root.parent !== root && root.parent.CRMReleaseNotice?.watcher) return; } catch {} showNotice(root.document, root, { documentKey, version: release.version }); }, fetch: root.fetch.bind(root), document: root.document, window: root });
  }
})(typeof window === 'undefined' ? globalThis : window);
