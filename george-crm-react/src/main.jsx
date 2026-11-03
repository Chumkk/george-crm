import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { App } from "./App";
import { loadRuntime } from "./compat/loadRuntime";
import { runtimeStore } from "./state/runtimeStore";
import { registerAssetCache } from "./compat/registerAssetCache";
import "./styles.css";
import "./features/todos/allocationBatch.css";
import "./compat/todoDrawers.css";
import "./compat/quoteHistory.css";
import "./compat/projectQuoteList.css";
import "./compat/customerQuoteLayout.css";
import "./compat/customerIntake.css";
import "./compat/managementLayout.css";
try {
  const api = await loadRuntime();
  const root = createRoot(document.getElementById("react-root"));
  let mounted = false;
  api.install(() => {
    if (mounted) flushSync(() => runtimeStore.emit());
  });
  flushSync(() => root.render(<App api={api} />));
  mounted = true;
  document.documentElement.dataset.frontend = "react";
  document.getElementById("react-startup")?.remove();
  window.crmBootReady?.();
  setTimeout(registerAssetCache, 0);
} catch (error) {
  console.error(error);
  const startup = document.getElementById("react-startup");
  if (startup) {
    startup.setAttribute("role", "alert");
    startup.innerHTML =
      '<h2>页面暂时无法打开</h2><p>请检查网络连接后重试，已保存的数据会保留。</p><button type="button">重新加载</button>';
    startup.querySelector("button").onclick = () => location.reload();
  }
}
