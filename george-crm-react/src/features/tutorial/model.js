// Tutorial state is deliberately separate from all customer/project/task storage.
export const TUTORIAL_KEY = "george-operation-guide-v1";
export const TUTORIAL_VERSION = 2;
export const ROUTES = [
  { id: "project-product", group: "创建项目", title: "创建项目与产品商机", role: "运营 / PM → SM", page: "projects", description: "创建项目生成分配商机任务，再选择区域内分配或跨区域申请；产品分配前补齐项目空间。", path: "建项目并填写空间 → 拉商机 → 报价", next: "allocation" },
  { id: "project-design", group: "创建项目", title: "创建项目与设计商机", role: "业务 / PM → 设计师", page: "projects", description: "创建项目生成分配商机任务，从统一分配入口选择设计服务和设计师主管。商机确认后生成报价任务，设计单确认报价后生成设计中任务。", path: "建项目 → 分配设计服务 → 设计报价 → GDS 设计交付", next: "allocation" },
  { id: "design-delivery", group: "设计协作", title: "提交设计成果", role: "设计师 → PM", page: "todos", task: "设计待办", description: "已确认设计单报价，查看同步给 GDS 的设计单信息，等待设计师回传图纸。", path: "设计单确认报价 → GDS 回传图纸 → PM 逐张确认", next: "design-review" },
  { id: "design-review", group: "设计协作", title: "逐张确认设计图纸", role: "PM → 设计师 / 项目", page: "todos", task: "设计确认待办", description: "PM 或指定协调员逐张确认图纸；全部确认后，手动同步项目信息完成审核。", path: "选待办 → 逐张确认或驳回 → 同步项目信息", next: "allocation" },
  { id: "allocation", group: "商机与报价", title: "拉商机", role: "PM → SM / 总经办", page: "todos", task: "项目待办", description: "选择区域内分配、跨区域申请或设计服务；设计类型不再由项目限定。", path: "分配商机任务 → 选择设计师或 SM → 确认商机 / 审批", next: "opportunity" },
  { id: "opportunity", group: "商机与报价", title: "确认商机", role: "SM / 设计师", page: "todos", task: "确认商机", description: "负责人收到一项商机邀请，核对并确认承接。", path: "选邀请 → 核对 → 确认生成商机与报价任务", next: "quotation" },
  { id: "quotation", group: "商机与报价", title: "产品或设计报价", role: "SM / 设计师 → 客户 → ERP", page: "todos", task: "报价待办", description: "从已承接商机创建唯一报价单，保存、提交、确认。", path: "创建报价 → 保存 → 提交 → 线上客户报价 → 确认报价" },
];
const step = (id, title, copy, target, options = {}) => ({ id, title, copy, target, ...options });
export function routePlan(routeId, branch = "sync") {
  if (routeId === "project-none") routeId = "project-product";
  const route = ROUTES.find(item => item.id === routeId);
  if (!route) return [];
  if (routeId.startsWith("project-")) return [
    step("create", "打开创建项目", "在项目管理点击【创建项目】，填写本次客户的项目信息。", "create", { success: "project-form" }),
    step("basic", "填写客户与项目基本信息", "选择客户，填写项目名称、国家、PM 和交付经理。", "basic", { gate: "basic" }),
    step("project", "填写项目信息与附件", "项目不选择设计类型。项目空间选填，图纸与备注在本分区维护；后续分配产品商机前须补齐空间。", "project"),
    step("files", "补齐其余必填信息", "按填写进度补齐必填项，再保存项目。空间留空不影响创建。", "files"),
    step("commit", "保存项目", "保存成功只生成 PM 分配商机任务。通过该待办可编辑项目或分配三种类型的商机。", "plain-save", { success: "plain-project-saved" }),
  ];
  const common = [
    step("task-category", `选择${({项目待办:"分配商机",确认商机:"采购商机接单或设计商机接单",报价待办:"产品报价或设计报价",设计待办:"设计中",设计确认待办:"设计定稿"})[route.task] || route.task}`, "在左侧分类选择对应任务。待办只是处理入口，从其他授权入口完成同一业务，也会完成对应待办。", "task-category", { success: "task-category" }),
    step("task", "选择你要办理的具体事项", "核对项目名称、负责人和待办状态，点击这条待办的主要处理按钮。指引只跟随你选中的事项，不会替你选择其他项目。", "task", { success: "task-open" }),
  ];
  if (routeId === "design-delivery") return [...common,
    step("design-fields", "查看设计单交付信息", "设计单确认报价后生成设计中任务，携带设计单费用、附件和备注。设计师在 GDS 决定回传图纸，按平面设计图、3D意向图、全屋3D图或其他图分类。", "design-fields"),
    step("design-submit", "等待 GDS 回传图纸", "设计师在 GDS 选择回传图纸，CRM 收到图纸回执后生成设计定稿；设计中任务继续由 GDS 处理，GDS 完成回执才会结束它。", "design-fields", { success: "design-review-ready" }),
  ];
  if (routeId === "design-review") return [...common,
    step("review-fields", "核对 / 编辑本次设计信息", "PM 查看每张图纸的类型、附件及当前版本。PM 或指定协调员逐张确认或驳回；由设计师安排的协调员在 GDS 确认。全部确认后点击【同步到项目信息】。", "design-fields"),
    ...(branch === "reject" ? [
      step("reject-open", "图纸有问题：驳回此图", "在问题图纸下点击【驳回此图】，保留其他图纸的确认结果，只退回此图修改。", "reject-open", { success: "reject-form" }),
      step("reject-reason", "说明需要修改的内容", "填写具体驳回原因，方便设计师修改。尚未点击确认驳回时，待办不会变化。", "reject-reason", { gate: "reject-reason" }),
      step("reject-submit", "确认驳回此图", "保存原因后只退回此图，待办继续待处理；原设计师在 GDS 修改该图后重提。", "reject-submit"),
    ] : [step("sync", "同步已确认图纸", "全部图纸确认后点击【同步到项目信息】，完成设计定稿；它不会结束设计中任务。", "sync", { success: "task-completed" })]),
  ];
  if (routeId === "allocation") return [...common,
    step("sm", "选择本次设计师或 SM", "选择分配类型：区域内默认，方案经理可多选；有转介绍人时填写原因并上传同意截图。跨区域必填申请原因；设计服务选择设计师主管、期望完成时间和协调员安排；由 PM 安排时还需选择协调员。", "allocation-form"),
    step("allocation-submit", "发起确认商机或商机审批", "区域内和设计服务分别生成接收人的商机接单任务，跨区域生成审批待办。区域内、跨区域完整空间必填；分配界面可编辑空间并随提交回写项目，也可用【编辑项目】补充。成功分配完成源分配商机任务。", "allocation-submit", { success: "task-completed" }),
  ];
  if (routeId === "opportunity") return [...common,
    step("accept", "核对并确认承接", "确认成功生成正式商机和报价任务；设计单确认报价后才生成设计中任务并同步到 GDS。若不承接，使用原界面的驳回功能说明原因；待接受、已拒绝记录只保留关联待办操作。", "accept", { success: "task-completed" }),
  ];
  return [...common,
    step("quote-content", "填写产品或设计报价", "每个商机只有一张报价单。产品从商机报价编辑器录入；独立设计服务用【创建设计单】录入设计费用、附件和备注，确认创建即发布到总览。按该商机范围填写，不能重复创建。", "quote-content"),
    step("quote-save", "保存：保留工作内容", "【保存】只保留正在编辑的内容，不更新客户总览，也不传 ERP。已保存后继续在原报价单编辑。", "quote-save", { success: "quote-saved" }),
    step("quote-submit", "提交：对客户发布当前版本", "【提交】校验对应空间范围与名称并更新两端总览，留存历史。所有产品商机校验项目最新完整空间范围。未采购的空间可不填产品；设计服务类不校验空间。重新提交后需客户重新确认当前版本。", "quote-submit", { success: "quote-submit-form" }),
    step("quote-publish", "核对并确认提交", "产品报价在提交窗口核对报价名称、商机范围及负责人后点击【确认提交】。设计单确认创建或提交后直接发布。本次提交成功才写入总览和历史。", "quote-publish", { success: "quote-published" }),
    step("quote-return", "返回本次报价任务", "提交成功后返回刚才这张报价单对应的报价任务。客户线上确认可在待办卡片查看；无需等待客户确认，也不能把提交当作待办完成。", "quote-task-return", { success: "quote-task-ready" }),
    step("quote-confirm", "报价任务：点击确认报价", "在本次报价任务点击【确认报价】，核对已报价 / 已确认版本，再手动确认传输。成功保存请求才完成此待办；已保存版本不可确认。可先查看本项目线上总览，再返回此待办；客户确认不代替此操作。", "quote-confirm", { success: "task-completed" }),
  ];
}
export function nextGuideRoute(routeId, branch, context = {}) {
  if (routeId === "design-review") {
    if (branch === "reject") return "design-delivery";
    const designType = context.taskState?.designType || context.designType;
    if (["独立设计服务", "设计服务类"].includes(designType)) return "";
    if (["采购方案设计", "采购产品设计"].includes(designType)) return "allocation";
    return "";
  }
  return ROUTES.find(route => route.id === routeId)?.next || "";
}

export function normalizeProgress(value) {
  const route = ROUTES.find(item => item.id === value?.routeId);
  const branch = value?.branch === "reject" ? "reject" : "sync";
  const steps = route ? routePlan(route.id, branch) : [];
  return { version: TUTORIAL_VERSION, seen: !!value?.seen, routeId: route?.id || "", step: Math.max(0, Math.min(Number.isInteger(value?.step) ? value.step : 0, Math.max(0, steps.length - 1))), branch, paused: value?.paused !== false };
}
export function readProgress(storage) {
  try { return normalizeProgress(JSON.parse(storage?.getItem(TUTORIAL_KEY) || "null")); }
  catch { return normalizeProgress(null); }
}
export function saveProgress(storage, value) {
  try { if (!storage?.setItem) return false; storage.setItem(TUTORIAL_KEY, JSON.stringify(normalizeProgress(value))); return true; }
  catch { return false; }
}
export function canNavigateGuide({ dialogOpen, editorOpen, requestedPage, currentPage }) {
  return !dialogOpen && !editorOpen && requestedPage !== currentPage;
}
export function shouldOfferResume({ authenticated, client, mode, progress }) {
  return !!authenticated && !client && mode === "closed" && progress?.paused === true && ROUTES.some(route => route.id === progress.routeId);
}
export function guideLocationPlan({ targetVisible, businessOpen, activeEditor, taskId, taskState, taskType, projectId, oppId, sourcePage, currentPage, entryPage, preservedTarget }) {
  if (targetVisible) return { kind: "scroll" };
  if (businessOpen || activeEditor) return { kind: "blocked", message: "当前有业务表单或报价编辑器打开。请先保存或返回原表单；定位不会关闭它或清空输入。" };
  if (taskId) {
    if (!taskState || taskState.id !== taskId || taskState.type !== taskType || projectId && taskState.project !== projectId || oppId && taskState.opp !== oppId)
      return { kind: "wait", message: "当前无法查看这条关联待办，请由有权限的负责人进入；定位不会改选其他事项。" };
    if (preservedTarget && sourcePage && sourcePage !== currentPage) return { kind: "page", page: sourcePage };
    return { kind: "task", id: taskId };
  }
  const page = sourcePage || entryPage;
  return page && page !== currentPage ? { kind: "page", page } : { kind: "wait", message: "已在本步骤对应页面。请先完成前置操作，让当前对象出现；定位不会创建新记录。" };
}
export function matchesTaskType(text, type) {
  const title = String(text || "").trim();
  const aliases = { 项目待办: ["分配商机"], 确认商机: ["采购商机接单", "设计商机接单", "确认商机待办"], 报价待办: ["产品报价", "设计报价"], 设计待办: ["设计中"], 设计确认待办: ["设计定稿"] };
  if ([type, ...(aliases[type] || [])].includes(title)) return true;
  if (type === "设计待办") return /^设计待办(?:\s|$)/.test(title);
  if (type === "确认商机") return /^(?:确认商机|确认商机待办)(?:\s|$)/.test(title);
  return title === type || title.startsWith(type + " ") || title.startsWith(type + "\n");
}
export function selectScopedCandidate(candidates, context = {}) {
  // Once an actual task/project is selected, never fall back to another record.
  const exact = context.taskId ? candidates.filter(item => item.taskId === context.taskId) : context.projectId ? candidates.filter(item => item.projectId === context.projectId) : candidates;
  return exact.find(item => item.visible && !item.disabled) || null;
}
export function actionSettled({ clicked, stillOpen, recordExists, sameTask, taskStatus, errorVisible }) {
  if (!clicked || errorVisible) return false;
  if (taskStatus) return sameTask && ["已处理", "已驳回"].includes(taskStatus);
  return !stillOpen && recordExists;
}
export function quoteAcknowledgement(context, frame, parentWindow, event) {
  if (!frame || frame !== context.quoteFrame || event.source !== parentWindow || event.data?.type !== "pimsSaveAck" || event.data.durable !== true) return null;
  if (!context.quoteSaveClicked && !context.quotePublishClicked) return null;
  if (context.quoteCode && event.data.draftCode && event.data.draftCode !== context.quoteCode) return null;
  const published = !!context.quotePublishClicked && !!context.quotePublishRequest && event.data.submissionRequestId === context.quotePublishRequest;
  const saved = !!context.quoteSaveClicked && !event.data.submissionRequestId;
  if (!published && !saved) return null;
  return { quoteCode: context.quoteCode || event.data.draftCode || "", quoteSaved: saved, quotePublished: published };
}

export function quotePublication(context, receipt) {
  if (!context.taskId || !context.quotePublishClicked || !context.quotePublishRequest || receipt?.durable !== true) return null;
  if (receipt.submissionRequestId !== context.quotePublishRequest || receipt.draftCode !== context.quoteCode || receipt.opp !== context.oppId || receipt.project !== context.projectId) return null;
  return { quotePublished: true };
}

export function quoteRecordPublished(context, task) {
  return !!context.taskOpened && !!context.taskId && task?.id === context.taskId && task.type === "报价待办" && task.project === context.projectId && task.opp === context.oppId && !!task.quotation?.code && (!context.quoteCode || task.quotation.code === context.quoteCode) && !!task.quotation.submittedAt && Number.isInteger(context.quoteRevisionBefore) && task.quotation.revision > context.quoteRevisionBefore;
}

