import { matchesTaskType } from "./model.js";

export const visible = element => !!element?.isConnected && !element.hidden && !element.closest?.("[hidden]") && !!element.getClientRects().length;
const all = (root, query) => [...(root?.querySelectorAll(query) || [])].filter(visible);
const first = (root, query) => all(root, query)[0] || null;
const textButton = (root, words) => all(root, "button,a").find(element => words.some(word => (element.textContent || "").trim() === word)) || null;
export function currentDialog(doc) {
  return first(doc, "#v3Dialog") || first(doc, "#mask.on #modalBox") || all(doc, '[role="dialog"], [role="alertdialog"], #drawer.on').find(element => !element.closest?.("[data-tutorial-root]")) || null;
}
export function pageRoot(doc) { return first(doc, "#pages > .page.on") || first(doc, ".page.on"); }
export function taskRow(doc, taskId) { return all(pageRoot(doc), "[data-todo-id]").find(element => element.dataset.todoId === taskId) || null; }
export function selectedTaskFromClick(element, route, context) {
  const row = element?.closest?.("[data-todo-id]");
  if (!row || !route?.task || !matchesTaskType(row.querySelector(".rx-task-title strong")?.textContent, route.task)) return null;
  if (context.taskId && context.taskId !== row.dataset.todoId) return null;
  if (context.projectId && row.dataset.projectId !== context.projectId) return null;
  if (!element.closest(".rx-task-main-action") || element.disabled) return null;
  return { taskId: row.dataset.todoId, taskSubject: row.querySelector(".rx-task-subject")?.textContent || route.task, taskTitle: route.task, projectId: row.dataset.projectId || context.projectId || "", oppId: row.dataset.oppId || "", quoteCode: row.dataset.quoteCode || "" };
}
function selectedProjectRow(doc, context) {
  return all(pageRoot(doc), "tbody tr").find(row => {
    const buttons = all(row, "[data-proj]");
    if (context.projectId) return buttons.some(button => button.dataset.proj === context.projectId);
    if (context.projectIdsBefore?.length && !buttons.some(button => !context.projectIdsBefore.includes(button.dataset.proj))) return false;
    return context.projectName && all(row, "td").some(cell => cell.textContent.trim() === context.projectName);
  }) || null;
}
export function quoteDocuments(doc) {
  const documents = [pageRoot(doc)].filter(Boolean), frame = first(doc, "#pimsFrame");
  try { if (frame?.contentDocument?.body) documents.push(frame.contentDocument.body); } catch { /* A deferred or external editor keeps its own loading/retry surface. */ }
  return documents;
}
function quotedButton(doc, names) {
  for (const root of quoteDocuments(doc)) { const match = textButton(root, names); if (match) return match; }
  return null;
}
function exactQuoteButton(root, query, context) {
  return all(root, query).find(button => context.quoteCode ? button.dataset.code === context.quoteCode : context.oppId ? button.dataset.opp === context.oppId : false) || null;
}
function frameMatches(doc, context) {
  const frame = first(doc, "#pimsFrame");
  if (!frame || context.quoteFrame && context.quoteFrame !== frame) return null;
  try {
    const project = frame.contentDocument?.querySelector("#edProject");
    if (context.projectId && project?.value && project.value !== context.projectId) return null;
  } catch { return null; }
  return frame;
}
export function guideTarget(doc, target, route, context) {
  const page = pageRoot(doc), dialog = currentDialog(doc), body = first(doc, "#mask.on #mBody"), form = /创建项目|新建项目/.test(first(doc, "#mask.on #mTitle")?.textContent || "") ? first(body, "#wizForm") : null;
  const bound = !!context.taskId && !!context.taskOpened;
  const hasExactTask = dialog && all(dialog, "[data-id]").some(button => button.dataset.id === context.taskId);
  const hasExactQuote = dialog && !!exactQuoteButton(dialog, "[data-code],[data-opp]", context);
  const expectedImpact = context.syncImpactExpected && /同步设计资料的影响/.test(dialog?.querySelector("h3")?.textContent || "");
  const taskDialog = bound && dialog && (hasExactTask || hasExactQuote || expectedImpact || context.dialogElement === dialog && context.dialogTitle === dialog.querySelector("#mTitle,h3")?.textContent) ? dialog : null;
  const feeOpp = first(body, "#dw132FeeOpp");
  const feeMatches = !feeOpp || !context.oppId || feeOpp.value === context.oppId;
  switch (target) {
    case "create": return first(page, '[data-act="createProject"]') || (form ? first(form, '[name="customerPick"]') : null);
    case "basic": return form && all(form, '.sec-title').find(element => element.textContent.trim() === '基础信息');
    case "project": return form && all(form, '.sec-title').find(element => element.textContent.trim() === '项目信息');
    case "design-type": return first(form, '[name="designType"]')?.closest('.fi');
    case "project-designer": return first(form, '[name="designer"]')?.closest('.fi');
    case "files": return form && all(form, '.sec-title').find(element => element.textContent.trim() === '物流方式');
    case "categories": return first(form, "#projCatBox")?.closest('.fi');
    case "plain-save": return form && first(doc, '#mask.on #mFoot [data-act="confirmCreate"]');
    case "save-start": return form && first(doc, '#mask.on #mFoot [data-act="confirmCreate"], #mask.on #mFoot [data-act="saveProjectEdit"]');
    case "designer": return first(body, "#mgStartDesigner")?.closest('label');
    case "deadline": return first(body, "#mgStartExpected")?.closest(".tf138-expected");
    case "commit": return first(doc, '#mask.on #mFoot [data-act="mgSaveStart"]');
    case "created": return first(selectedProjectRow(doc, context), '[data-act="mmViewTasks"]');
    case "task-category": {
      const categories = all(page, ".rx-task-nav button");
      const category = context.taskState?.category;
      return categories.find(button => category && button.textContent.trim().startsWith(category)) || categories.find(button => matchesTaskType(button.dataset.taskType, route.task)) || null;
    }
    case "task": return context.taskId ? first(taskRow(doc, context.taskId), ".rx-task-main-action button") || taskRow(doc, context.taskId) : first(page, ".rx-task-main");
    case "design-fields": return taskDialog && (first(body, ".planned-form") || first(body, ".dr185-order"));
    case "review-deadline": return taskDialog && first(body, '#mgReviewExpected, #tfReviewExpected, [id*="ReviewExpected"], [id*="ReviewDeadline"], input[aria-label="PM 核对期望完成日期"]')?.closest(".tf138-expected");
    case "design-submit": return taskDialog && first(dialog, '[data-act="dr185Submit"], [data-act="oqDesignComplete"]');
    case "sync": return taskDialog && (first(dialog, "#mgSyncImpact") || first(dialog, '[data-act="dr187Sync"], [data-act="mgDesignSync"]'));
    case "reject-open": return taskDialog && first(dialog, '[data-act="dr185Reject"], [data-act="mgDesignReject"]');
    case "reject-reason": return taskDialog && first(body, "#dr185Reason, #mgRejectReason");
    case "reject-submit": return taskDialog && first(dialog, '[data-act="dr185RejectSave"], [data-act="mgDesignRejectSave"]');
    case "allocation-space": return first(body, "#pw173Spaces") || first(body, "#allocationBatch, #ab133Designers");
    case "allocation-form": return taskDialog && (first(body, '#ua176Form, #allocationBatch [data-sm-trigger], #allocationBatch [data-sm-panel], #v68SM') || body);
    case "allocation-submit": return taskDialog && first(dialog, '[data-act="ua176Submit"], [data-act="v68AllocationSubmit"], [data-act="ab133Submit"], [data-act="dw132Allocate"]');
    case "accept": return taskDialog && (first(dialog, '[data-act="todoConfirm"]') || textButton(dialog, ["确认接受", "确认", "接受"]));
    case "quote-content": return bound && (frameMatches(doc, context) || taskDialog && feeMatches && first(body, "#dqDesignForm, #gdsForm") || exactQuoteButton(page, '[data-act="oqEdit"], [data-act="dw132Fee"], [data-act="oqDesignEdit"]', context));
    case "quote-save": {
      if (!bound) return null;
      const frame = frameMatches(doc, context);
      if (frame) return first(frame.contentDocument, '[onclick="quickSave()"]');
      return taskDialog && feeMatches && first(dialog, '[data-act="dqDesignSave"], [data-act="dqDesignPublish"], [data-act="confirmCreateFee"]');
    }
    case "quote-submit": {
      if (!bound) return null;
      const frame = frameMatches(doc, context);
      if (frame) return first(frame.contentDocument, '.actionbar [onclick="saveDraft()"], [onclick="saveDraft()"]');
      return exactQuoteButton(page, '[data-act="oqPublishDesign"]', context);
    }
    case "quote-publish": {
      const frame = bound && frameMatches(doc, context);
      return frame ? first(frame.contentDocument, '#saveMask [onclick="confirmSaved()"]') : null;
    }
    case "quote-online": return bound && (all(page, '[data-act="go:board"], [data-act="go:clientQuote"], [data-v15="share"]').find(button => (button.dataset.proj || button.dataset.project) === context.projectId) || first(doc, "[data-guide-view-overview]")) || null;
    case "quote-task-return": return bound && first(taskRow(doc, context.taskId), '[data-guide-action="oqReview"]');
    case "quote-confirm": return bound && (exactQuoteButton(taskDialog, '[data-act="oqConfirm"]', context) || exactQuoteButton(page, '[data-act="oqReview"]', context) || textButton(taskRow(doc, context.taskId), ["确认报价"]));
    default: return null;
  }
}
export function guideGate(doc, gate) {
  const form = first(doc, "#mask.on #wizForm"), body = first(doc, "#mask.on #mBody");
  const value = selector => String(first(body, selector)?.value || "").trim();
  if (gate === "basic") return !!first(form, '[name="customerPick"]')?.value && !!first(form, '[name="projectName"]')?.value?.trim();
  if (gate === "product") return ["采购方案设计", "采购产品设计"].includes(value('[name="designType"]'));
  if (gate === "none") return value('[name="designType"]') === "暂无";
  if (gate === "independent") return value('[name="designType"]') === "独立设计服务";
  if (gate === "designer") return !!value("#mgStartDesigner");
  if (gate === "project-designer") return !!value('#wizForm [name="designer"]');
  if (gate === "deadline") return !!value("#mgStartExpected");
  if (gate === "review-deadline") return !!value('input[aria-label="PM 核对期望完成日期"]');
  if (gate === "reject-reason") return !!value("#dr185Reason, #mgRejectReason");
  return true;
}
export function guideSuccess(doc, success, route, context) {
  const dialog = currentDialog(doc), form = first(doc, "#mask.on #wizForm");
  if (success === "project-form") return !!form && /创建项目|新建项目/.test(first(doc, "#mask.on #mTitle")?.textContent || "");
  if (success === "allocation-space-ready") return !first(doc, "#mask.on #pw173Spaces") && !!first(doc, "#mask.on #allocationBatch, #mask.on #v68SM, #mask.on #ab133Designers");
  if (success === "designer-form") return !!first(doc, "#mask.on #mgStartDesigner");
  if (success === "project-saved") return !!context.commitClicked && !dialog && !!selectedProjectRow(doc, context);
  if (success === "plain-project-saved") return !!context.commitClicked && !dialog && /项目已保存|项目已创建/.test(first(doc, "#toast.on")?.textContent || "");
  if (success === "task-category") return !!context.taskId || all(pageRoot(doc), ".rx-task-nav button.on").some(button => matchesTaskType(button.dataset.taskType, route.task));
  if (success === "task-open") {
    if (!context.taskId || !context.taskOpened) return false;
    const entryTarget = ["design-delivery", "design-review"].includes(route.id) ? "design-fields" : route.id === "allocation" ? "allocation-form" : route.id === "opportunity" ? "accept" : "quote-content";
    return !!guideTarget(doc, entryTarget, route, context);
  }
  if (success === "reject-form") return !!context.taskId && !!first(doc, "#mask.on #mgRejectReason");
  if (success === "quote-saved") return !!context.quoteSaved;
  if (success === "quote-submit-form") { const frame = frameMatches(doc, context); return !!context.quotePublished || !!frame && !!first(frame.contentDocument, '#saveMask [onclick="confirmSaved()"]'); }
  if (success === "quote-published") return !!context.quotePublished;
  if (success === "quote-task-ready") {
    const row = taskRow(doc, context.taskId), button = first(row, '[data-guide-action="oqReview"]');
    return !!context.quotePublished && !!row && (!context.projectId || row.dataset.projectId === context.projectId) && (!context.oppId || row.dataset.oppId === context.oppId) && (!context.quoteCode || row.dataset.quoteCode === context.quoteCode) && !!button && !button.disabled;
  }
  if (success === "design-review-ready") return !!context.taskId && context.taskState?.id === context.taskId && !!context.taskState?.reviewTodoId;
  if (success === "task-completed") {
    if (!context.commitClicked || !context.taskOpened || dialog || !context.taskId) return false;
    // The public API checks the same business permissions but ignores list
    // filters. A disappearing row or any toast can never complete the guide.
    const state = context.taskState;
    return !!state && state.id === context.taskId && state.type === route.task && (!context.projectId || state.project === context.projectId) && (!context.oppId || state.opp === context.oppId) && ["已处理", "已驳回"].includes(state.status);
  }
  return false;
}
export function tutorialRect(element, target = '') {
  if (!visible(element)) return null;
  let rectangle = element.getBoundingClientRect();
  // Include the heading and current visible fields, stopping at the next section.
  if (element.matches?.('#wizForm .sec-title')) {
    const rectangles = [rectangle];
    for (let sibling = element.nextElementSibling; sibling && (target === 'files' || !sibling.matches('.sec-title')); sibling = sibling.nextElementSibling) {
      if (visible(sibling)) rectangles.push(sibling.getBoundingClientRect());
    }
    const left = Math.min(...rectangles.map(item => item.left)), top = Math.min(...rectangles.map(item => item.top));
    rectangle = { left, top, width: Math.max(...rectangles.map(item => item.right)) - left, height: Math.max(...rectangles.map(item => item.bottom)) - top };
  }
  try {
    const frame = element.ownerDocument.defaultView.frameElement;
    if (frame) {
      const parent = frame.getBoundingClientRect(), scaleX = parent.width / frame.clientWidth, scaleY = parent.height / frame.clientHeight;
      return { left: parent.left + rectangle.left * scaleX, top: parent.top + rectangle.top * scaleY, width: rectangle.width * scaleX, height: rectangle.height * scaleY };
    }
  } catch { /* Host iframe is highlighted when its contents cannot be read. */ }
  return { left: rectangle.left, top: rectangle.top, width: rectangle.width, height: rectangle.height };
}

