/* Deployment checks never save or reload; an explicit save-and-refresh click may save working quotations. */
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
  const failedSaves = new WeakSet();
  function quotationFrames(doc) {
    const frames = [...(doc.querySelectorAll?.('iframe#pimsFrame') || [])];
    const first = doc.getElementById('pimsFrame');
    if (first && !frames.includes(first)) frames.push(first);
    return frames;
  }
  function frameNeedsSave(frame) {
      try {
        const editor = frame.contentDocument;
        const state = frame.contentWindow?.CRMQuotationSave391?.state?.();
        return failedSaves.has(frame) || !!state?.dirty || !!state?.saving || !!editor && (/有未保存的更改|正在保存|尚未保存|暂存失败|保存失败/.test(editor.getElementById('edSaveStatus')?.textContent || '') || !!editor.querySelector('td.edit'));
      } catch { return false; }
  }
  function pendingQuotationFrame(doc) {
    return quotationFrames(doc).find(frameNeedsSave);
  }
  function quotationNeedsSave(doc) { return !!pendingQuotationFrame(doc); }
  function saveQuotationFrame(frame, win, options = {}) {
    const child = frame.contentWindow, editor = frame.contentDocument;
    if (!child?.addEventListener || typeof child.quickSave !== 'function') return Promise.reject(Error('当前报价页不支持直接暂存，请返回报价完成暂存后再刷新。'));
    const timers = options.timers || win, timeout = options.timeout || 15000;
    return new Promise((resolve, reject) => {
      let done = false, timer;
      const finish = error => { if (done) return; done = true; child.removeEventListener('message', message); options.signal?.removeEventListener('abort', abort); timers.clearTimeout(timer); if (error) { failedSaves.add(frame); reject(error); } else { failedSaves.delete(frame); resolve(); } };
      const abort = () => finish(Error('已取消刷新，报价内容保留。'));
      const message = event => {
        if (event.source !== win) return;
        if (event.data?.type === 'v3SaveError') return finish(Error(event.data.message || '暂存失败，未刷新，报价内容保留。'));
        if (event.data?.type !== 'pimsSaveAck') return;
        if (event.data.durable !== true) return finish(Error('报价未能持久暂存，未刷新。请返回报价检查后重试。'));
        failedSaves.delete(frame);
        if (frameNeedsSave(frame)) return finish(Error('暂存后仍有新的修改，未刷新，请再次点击暂存并刷新。'));
        finish();
      };
      child.addEventListener('message', message); options.signal?.addEventListener('abort', abort, { once: true });
      if (options.signal?.aborted) return abort();
      timer = timers.setTimeout(() => finish(Error('暂存尚未确认，未刷新。请返回报价检查暂存结果后重试。')), timeout);
      try { if (!/正在保存/.test(editor?.getElementById('edSaveStatus')?.textContent || '')) child.quickSave(); }
      catch (error) { finish(Error(error.message || '暂存失败，未刷新，报价内容保留。')); }
    });
  }
  async function saveQuotationsBeforeRefresh(doc, win, options = {}) {
    for (const frame of quotationFrames(doc)) if (frameNeedsSave(frame)) await saveQuotationFrame(frame, win, options);
    if (quotationNeedsSave(doc)) throw Error('仍有未暂存的报价，未刷新。');
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
    box.addEventListener('close', () => { cancelled = true; controller?.abort(); box.remove(); }, { once: true });
    let busy = false, cancelled = false, controller = null;
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
    function refreshNow() {
      rememberReading(doc, win, options.documentKey);
      for (const frame of doc.querySelectorAll?.('iframe') || []) try { const reader = frame.contentWindow.CRMReleaseNotice; if (reader?.documentKey) reader.rememberReading(frame.contentDocument, frame.contentWindow, reader.documentKey); } catch { /* Only same-origin readers share reading position. */ }
      if (options.version && win.location.href && win.location.replace) {
        const target = new URL(win.location.href);
        target.searchParams.set('crmRelease', options.version);
        target.searchParams.set('crmRefresh', String(Date.now()));
        win.location.replace(target.href);
      } else win.location.reload();
    }
    const refresh = box.querySelector('[data-release-refresh]');
    function explainPending(message) {
      const frame = pendingQuotationFrame(doc), name = frame?.contentDocument?.getElementById('draftName')?.value;
      const warning = box.querySelector('[data-release-warning]'); warning.hidden = false;
      warning.textContent = message || (name ? '报价「' + name + '」' : '报价') + '有未暂存内容。点击「暂存并刷新」先暂存工作稿，确认成功后加载新版；不会提交报价。';
      box.querySelector('[data-release-save]').hidden = false;
      const description = box.querySelector('#crm-release-description');
      if (description) description.textContent = '先暂存所有未保存的报价工作稿，确认成功后加载新版。不会提交报价或发送ERP请求。';
      refresh.textContent = '暂存并刷新';
    }
    refresh.onclick = async () => {
      if (busy) return;
      const frame = pendingQuotationFrame(doc);
      if (frame) {
        explainPending();
        if (!frame.contentWindow?.addEventListener || typeof frame.contentWindow?.quickSave !== 'function') { explainPending('请点击「返回报价暂存」完成暂存后再刷新。'); return; }
        busy = true; refresh.disabled = true; refresh.textContent = '正在暂存…';
        controller = new AbortController();
        try {
          await saveQuotationsBeforeRefresh(doc, win, { ...options, signal: controller.signal });
          if (!cancelled) refreshNow();
        } catch (error) { if (!cancelled) explainPending(error.message); }
        finally { busy = false; refresh.disabled = false; if (!cancelled) refresh.textContent = quotationNeedsSave(doc) ? '暂存并刷新' : '立即刷新'; }
        return;
      }
      refreshNow();
    };
    doc.body.appendChild(box);
    if (pendingQuotationFrame(doc)) explainPending();
    box.showModal();
  }
  root.CRMReleaseNotice = { createReleaseWatcher, quotationNeedsSave, showNotice, rememberReading, restoreReading, saveQuotationsBeforeRefresh };
  if (root.document?.body && root.document.documentElement?.dataset?.entry !== 'client') {
    const script = root.document.currentScript;
    const documentKey = script.dataset.releaseDocument || '';
    root.CRMReleaseNotice.documentKey = documentKey;
    restoreReading(root, documentKey);
    try { if (documentKey && root.parent !== root && root.parent.CRMReleaseNotice?.watcher) return; } catch { /* Independent readers run their own observer. */ }
    const url = new URL('./app-release.json', script.src).href;
    root.CRMReleaseNotice.watcher = createReleaseWatcher({ version: script.dataset.releaseVersion || "34b5605429d1df83abbf9e09293e130542a807aecaca148d621c44162ab0f012", builtAt: script.dataset.releaseBuiltAt || "2026-11-24T04:19:57.511Z", documentKey, url, onUpdate: release => { try { if (documentKey && root.parent !== root && root.parent.CRMReleaseNotice?.watcher) return; } catch {} showNotice(root.document, root, { documentKey, version: release.version }); }, fetch: root.fetch.bind(root), document: root.document, window: root });
  }
})(typeof window === 'undefined' ? globalThis : window);
