/* Load the current non-blocking update observer; navigation and business assets keep their own caching rules. */
(() => {
  if (window.__CRM_RELEASE_NOTICE_LOADING__) return;
  window.__CRM_RELEASE_NOTICE_LOADING__ = true;
  const url = new URL('./update-notice.js', document.currentScript.src);
  url.searchParams.set('boot', String(Date.now()));
  const script = document.createElement('script');
  script.src = url.href;
  script.async = true;
  script.dataset.releaseVersion = document.currentScript.dataset.releaseVersion || '';
  script.dataset.releaseBuiltAt = document.currentScript.dataset.releaseBuiltAt || '';
  script.dataset.releaseDocument = document.currentScript.dataset.releaseDocument || '';
  document.head.appendChild(script);
})();
