import scaffold from "./scaffold.html?raw";
import { createLazyThree, loadOrderedScripts } from "./scriptLoader";
let pending;
export function loadRuntime() {
  if (pending) return pending;
  pending = (async () => {
    window.__CRM_REACT_BOOTING__ = true;
    const host = document.createElement("div");
    host.id = "crm-runtime-host";
    host.innerHTML = scaffold;
    document.body.appendChild(host);
    window.GeorgeLazy3D = createLazyThree({
      document,
      url: `${import.meta.env.BASE_URL}${__CRM_ENGINE_ASSETS__.three}`,
      ready: () => Boolean(window.THREE),
      renderError(status, retry) {
        const english = document.documentElement.lang === "en";
        const message = document.createElement("p");
        message.textContent = english ? "3D preview could not load. Please retry." : "三维预览加载失败，请重试。";
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = english ? "Retry" : "重新加载";
        button.onclick = retry;
        status.replaceChildren(message, button);
      },
    });
    await loadOrderedScripts(document, ["startup", "policy", "crm", "workflows", "quoteRevision", "projectQuoteList", "customerQuoteLayout", "orderRevision", "customerHub", "todoDemoFill", "allocationBatch", "projectFormProgress", "customerIntake", "businessSync", "designWorkflow", "opportunityQuotes", "managementWorkflow", "progressTracking", "taskFollowup", "taskMonitoringDemo", "todoDrawers", "designQuotation", "expenseWorkflow", "managementMonitoring", "designGds", "procurementWorkflow", "unifiedAllocation", "designOrderDelivery", "designScenario", "acceptanceEditing", "taskHistory", "bridge"]
      .map((name) => `${import.meta.env.BASE_URL}${__CRM_ENGINE_ASSETS__[name]}`));
    if (!window.GeorgeRuntime) throw Error("业务模块未能启动");
    return window.GeorgeRuntime;
  })();
  return pending;
}
