import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { TUTORIAL_KEY, ROUTES, routePlan, normalizeProgress, readProgress, saveProgress, canNavigateGuide, selectScopedCandidate, actionSettled, quoteAcknowledgement, nextGuideRoute, shouldOfferResume, guideLocationPlan } from "../src/features/tutorial/model.js";
import { selectedTaskFromClick, guideTarget, guideSuccess, visible, tutorialRect } from "../src/features/tutorial/dom.js";

test("项目统一创建，空间选填；项目待办之后选择分配类型", () => {
  const none = routePlan("project-none"), product = routePlan("project-product"), service = routePlan("project-design");
  assert.equal(none.some(item => item.id === "type"), false);
  assert.equal(none.at(-1).target, "plain-save");
  assert.deepEqual(service.map(item => item.target), product.map(item => item.target));
  assert.equal(product.some(item=>item.id==='designer'),false);
  assert.match(product.find(item => item.id === "commit").copy, /只生成 PM 分配商机任务/);
  assert.equal(routePlan('allocation').some(item=>item.id==='space'),false);assert.match(product.find(item=>item.id==='project').copy,/项目空间选填/);
  assert.match(service.find(item => item.id === "commit").copy, /编辑项目或分配三种类型/);
  assert.equal(ROUTES.find(item => item.id === "project-design").next, "allocation");
});
test("PM核对明确区分同步和退回，不把打开界面或确认按钮算完成", () => {
  const sync = routePlan("design-review"), reject = routePlan("design-review", "reject");
  assert.equal(sync.at(-1).target, "sync");
  assert.deepEqual(reject.slice(-3).map(item => item.target), ["reject-open", "reject-reason", "reject-submit"]);
  assert.match(sync.at(-1).copy, /全部图纸确认后/);
  assert.match(reject.at(-1).copy, /只退回此图/);
});

test("带前置图标的真实待办分类仍能定位并识别选中类型", () => {
  const node = extra => ({ isConnected: true, hidden: false, closest: () => null, getClientRects: () => [{}], ...extra });
  const button = node({ dataset: { taskType: "设计确认待办" }, querySelector: () => ({ textContent: "" }) });
  const page = node({ querySelectorAll: selector => selector.startsWith(".rx-task-nav button") ? [button] : [] });
  const doc = { querySelectorAll: selector => selector.includes(".page.on") ? [page] : [] };
  const route = ROUTES.find(item => item.id === "design-review");
  assert.equal(guideTarget(doc, "task-category", route, {}), button);
  assert.equal(guideSuccess(doc, "task-category", route, {}), true);
  button.dataset.taskType = "设计待办";
  assert.equal(guideTarget(doc, "task-category", route, {}), null);
  assert.equal(guideSuccess(doc, "task-category", route, {}), false);
});
test("报价路线分别保存、提交、二次确认发布、返回精确待办、手动确认ERP", () => {
  const path = routePlan("quotation");
  assert.deepEqual(path.slice(-5).map(item => item.target), ["quote-save", "quote-submit", "quote-publish", "quote-task-return", "quote-confirm"]);
  assert.match(path.find(item => item.id === "quote-save").copy, /不更新客户总览.*不传 ERP/);
  assert.match(path.find(item => item.id === "quote-confirm").copy, /客户确认不代替此操作/);
});
test("教程持久化仅写自身键，不存业务身份，损坏或禁用存储时继续安全运行", () => {
  const records = new Map([["crm-flow-v3", "original-business-records"]]);
  const writes = [];
  const storage = { getItem: key => records.get(key), setItem: (key, value) => { writes.push(key); records.set(key, value); } };
  assert.equal(saveProgress(storage, { seen: true, routeId: "design-review", step: 3, branch: "reject", paused: true, taskId: "private-task", projectId: "private-project" }), true);
  assert.deepEqual(writes, [TUTORIAL_KEY]);
  assert.equal(records.get("crm-flow-v3"), "original-business-records");
  assert.equal(JSON.stringify(readProgress(storage)).includes("private"), false);
  records.set(TUTORIAL_KEY, "broken-json"); assert.equal(readProgress(storage).routeId, "");
  assert.equal(saveProgress({ setItem() { throw Error("quota"); } }, {}), false);
  assert.equal(saveProgress(null, {}), false);
  assert.equal(readProgress({ getItem() { throw Error("denied"); } }).seen, false);
});
test("教程恢复只接受已知路线、有效步数与分支，忽略旧业务字段", () => {
  assert.deepEqual(normalizeProgress({ routeId: "unknown", step: 9, branch: "delete", taskId: "T1" }), { version: 2, seen: false, routeId: "", step: 0, branch: "sync", paused: true });
  assert.equal(normalizeProgress({ routeId: "project-product", step: 999 }).step, routePlan("project-product").length - 1);
  assert.equal(normalizeProgress({ routeId: "project-product", step: -2 }).step, 0);
});
test("导航不会关闭未保存抽屉或报价编辑器；同页也不刷新丢输入", () => {
  assert.equal(canNavigateGuide({ dialogOpen: true, requestedPage: "todos", currentPage: "projects" }), false);
  assert.equal(canNavigateGuide({ editorOpen: true, requestedPage: "projects", currentPage: "draftEditor" }), false);
  assert.equal(canNavigateGuide({ requestedPage: "todos", currentPage: "todos" }), false);
  assert.equal(canNavigateGuide({ requestedPage: "projects", currentPage: "home" }), true);
});
test("暂停后可在业务抽屉上方恢复；只对后台已登录且有真实教程路线显示，不在客户链接出现", () => {
  const paused = { authenticated: true, client: false, mode: "closed", progress: normalizeProgress({ routeId: "project-product", step: 5, paused: true }) };
  assert.equal(shouldOfferResume(paused), true);
  assert.equal(shouldOfferResume({ ...paused, client: true }), false);
  assert.equal(shouldOfferResume({ ...paused, authenticated: false }), false);
  assert.equal(shouldOfferResume({ ...paused, mode: "guide" }), false);
  assert.equal(shouldOfferResume({ ...paused, progress: normalizeProgress({ routeId: "unknown", paused: true }) }), false);
  assert.equal(canNavigateGuide({ dialogOpen: true, requestedPage: "projects", currentPage: "todos" }), false);
});
function action({ id = "T1", project = "P1", type = "设计待办", primary = true } = {}) {
  const row = { dataset: { todoId: id, projectId: project, oppId: "O1", quoteCode: "Q1" }, querySelector(query) { return query === ".rx-task-title strong" ? { textContent: type } : query === ".rx-task-meta" ? { textContent: project } : { textContent: "本项目的设计成果" }; } };
  return { disabled: false, closest(query) { return query === "[data-todo-id]" ? row : query === ".rx-task-main-action" && primary ? {} : null; } };
}
test("教程只绑定用户选择的同类型主要处理动作，不跟随查看、别项目或别待办", () => {
  const route = ROUTES.find(item => item.id === "design-delivery");
  assert.equal(selectedTaskFromClick(action({ primary: false }), route, {}), null);
  assert.equal(selectedTaskFromClick(action({ type: "设计确认待办" }), route, {}), null);
  assert.equal(selectedTaskFromClick(action({ project: "P2" }), route, { projectId: "P1" }), null);
  assert.equal(selectedTaskFromClick(action({ id: "T2" }), route, { taskId: "T1" }), null);
  const actual = selectedTaskFromClick(action(), route, { projectId: "P1" });
  assert.equal(actual.taskId, "T1"); assert.equal(actual.projectId, "P1"); assert.equal(actual.quoteCode, "Q1");
});
test("聚光定位不会从已选任务跌落到其他可用项目或禁用按钮", () => {
  const candidates = [{ taskId: "T2", projectId: "P2", visible: true }, { taskId: "T1", projectId: "P1", visible: false }, { taskId: "T1", projectId: "P1", visible: true, disabled: true }];
  assert.equal(selectScopedCandidate(candidates, { taskId: "T1" }), null);
  assert.equal(selectScopedCandidate(candidates, { projectId: "P1" }), null);
  assert.equal(selectScopedCandidate(candidates, { taskId: "T2" }).projectId, "P2");
  assert.equal(visible({ isConnected: true, hidden: false, closest: () => null, getClientRects: () => [] }), false);
});
test("退出、关闭界面或失败保存不能被教程误判为业务完成", () => {
  assert.equal(actionSettled({ clicked: false, stillOpen: false, recordExists: true }), false);
  assert.equal(actionSettled({ clicked: true, stillOpen: true, recordExists: true }), false);
  assert.equal(actionSettled({ clicked: true, stillOpen: false, recordExists: true, errorVisible: true }), false);
  assert.equal(actionSettled({ clicked: true, sameTask: false, taskStatus: "已处理" }), false);
  assert.equal(actionSettled({ clicked: true, sameTask: true, taskStatus: "待处理" }), false);
  assert.equal(actionSettled({ clicked: true, sameTask: true, taskStatus: "已处理" }), true);
});
test("报价保存回执仅接受当前iframe、当前报价及用户实际点击，失败回执不推进", () => {
  const frame = {}, otherFrame = {}, parent = {}, otherSender = {};
  const context = { quoteFrame: frame, quoteCode: "Q1", quoteSaveClicked: true };
  const event = { source: parent, data: { type: "pimsSaveAck", durable: true, draftCode: "Q1" } };
  assert.equal(quoteAcknowledgement(context, otherFrame, parent, event), null);
  assert.equal(quoteAcknowledgement(context, frame, parent, { ...event, source: otherSender }), null);
  assert.equal(quoteAcknowledgement(context, frame, parent, { ...event, data: { ...event.data, draftCode: "Q2" } }), null);
  assert.equal(quoteAcknowledgement(context, frame, parent, { ...event, data: { ...event.data, durable: false } }), null);
  assert.equal(quoteAcknowledgement({ ...context, quoteSaveClicked: false }, frame, parent, event), null);
  assert.deepEqual(quoteAcknowledgement(context, frame, parent, event), { quoteCode: "Q1", quoteSaved: true, quotePublished: false });
});
test("具体任务指引不因外部事项完成、刷新后的无身份状态或无点击而推进", () => {
  const doc = { querySelectorAll: () => [] };
  const route = ROUTES.find(item => item.id === "design-review");
  assert.equal(guideSuccess(doc, "task-completed", route, {}), false);
  assert.equal(guideSuccess(doc, "task-completed", route, { taskId: "T1", commitClicked: false }), false);
  assert.equal(guideSuccess(doc, "task-completed", route, { taskId: "T1", commitClicked: true, taskOpened: false }), false);
  assert.equal(guideSuccess(doc, "project-saved", route, { commitClicked: true }), false);
  const context = { taskId: "T1", projectId: "P1", commitClicked: true, taskOpened: true };
  assert.equal(guideSuccess(doc, "task-completed", route, { ...context, taskState: { id: "T2", project: "P1", type: "设计确认待办", status: "已处理" } }), false);
  assert.equal(guideSuccess(doc, "task-completed", route, { ...context, taskState: { id: "T1", project: "P2", type: "设计确认待办", status: "已处理" } }), false);
  assert.equal(guideSuccess(doc, "task-completed", route, { ...context, taskState: { id: "T1", project: "P1", type: "设计确认待办", status: "待处理" } }), false);
  assert.equal(guideSuccess(doc, "task-completed", route, { ...context, taskState: { id: "T1", project: "P1", type: "设计确认待办", status: "已处理" } }), true);
});
test("提交失败后快速保存不算发布；只接受用户本次提交请求的精确回执", () => {
  const frame = {}, parent = {};
  const context = { quoteFrame: frame, quoteCode: "Q1", quotePublishClicked: true, quotePublishRequest: "submission-2" };
  const event = { source: parent, data: { type: "pimsSaveAck", durable: true, draftCode: "Q1" } };
  assert.equal(quoteAcknowledgement(context, frame, parent, event), null);
  assert.equal(quoteAcknowledgement(context, frame, parent, { ...event, data: { ...event.data, submissionRequestId: "submission-1" } }), null);
  assert.deepEqual(quoteAcknowledgement(context, frame, parent, { ...event, data: { ...event.data, submissionRequestId: "submission-2" } }), { quoteCode: "Q1", quoteSaved: false, quotePublished: true });
});
test("设计核对后的下一环节根据实际处理分支和设计类型确定，不把独立设计指向SM分配", () => {
  assert.equal(nextGuideRoute("design-review", "reject", { designType: "独立设计服务" }), "design-delivery");
  assert.equal(nextGuideRoute("design-review", "reject", { designType: "采购方案设计" }), "design-delivery");
  assert.equal(nextGuideRoute("design-review", "sync", { designType: "独立设计服务" }), "");
  assert.equal(nextGuideRoute("design-review", "sync", { designType: "采购方案设计" }), "allocation");
  assert.equal(nextGuideRoute("design-review", "sync", { designType: "采购产品设计" }), "allocation");
  assert.equal(nextGuideRoute("design-review", "sync", { taskState: { designType: "独立设计服务" } }), "");
  assert.equal(nextGuideRoute("design-review", "sync", { designType: "独立设计服务", taskState: { designType: "采购方案设计" } }), "allocation");
  assert.equal(nextGuideRoute("design-review", "sync"), "");
});
test("跨页面定位回到记住的精确页面或待办，阻止丢弃其他表单及越权改选", () => {
  const task = { id: "T1", project: "P1", opp: "O1", type: "设计待办", status: "待处理" };
  const selected = { targetVisible: false, taskId: "T1", taskState: task, taskType: task.type, projectId: "P1", oppId: "O1", sourcePage: "todos", currentPage: "opps" };
  assert.deepEqual(guideLocationPlan(selected), { kind: "task", id: "T1" });
  assert.deepEqual(guideLocationPlan({ ...selected, sourcePage: "draft-editor-Q1", preservedTarget: true }), { kind: "page", page: "draft-editor-Q1" });
  assert.equal(guideLocationPlan({ ...selected, businessOpen: true }).kind, "blocked");
  assert.equal(guideLocationPlan({ ...selected, activeEditor: true }).kind, "blocked");
  assert.equal(guideLocationPlan({ ...selected, taskState: { ...task, project: "P12" } }).kind, "wait");
  assert.equal(guideLocationPlan({ ...selected, taskState: null }).kind, "wait");
  assert.deepEqual(guideLocationPlan({ sourcePage: "opp-B1", currentPage: "projects", entryPage: "opps" }), { kind: "page", page: "opp-B1" });
  assert.deepEqual(guideLocationPlan({ targetVisible: true, businessOpen: true }), { kind: "scroll" });
});
const bridgeSource = fs.readFileSync(new URL("../src/compat/runtime/bridge.js", import.meta.url), "utf8");
function guideRuntime(rows, allowed = rows) {
  const calls = [], dialogs = [], context = { window: {}, document: { querySelectorAll: () => dialogs }, PROJECT_EXTRA: {}, V18: { context: null }, V21: { view: "team" }, v17Owner: () => "设计师", visibleTodos: () => allowed, v21Rows: () => allowed, v21CanOperate: task => task.owner === "设计师", mgReviewActive: task => task.status === "待处理" && task.owner === "设计师", v75SearchTask: (task, source) => calls.push([task.id, source]) };
  vm.createContext(context); vm.runInContext(bridgeSource, context);
  return { api: context.window.GeorgeRuntime, calls, dialogs };
}
function designTasks() {
  return [
    { id: "D1", type: "设计待办", project: "P1", owner: "设计师", initiator: "PM", status: "已处理", designSubmission: 2, reviewTodoId: "R2", needInfo: { designType: "独立设计服务" } },
    { id: "R1", type: "设计确认待办", project: "P1", owner: "PM", initiator: "设计师", status: "已驳回", sourceTodoId: "D1", designSubmission: 1 },
    { id: "R2", type: "设计确认待办", project: "P1", owner: "PM", initiator: "设计师", status: "待处理", sourceTodoId: "D1", designSubmission: 2, handoff: { designType: "独立设计服务" } },
    { id: "R3", type: "设计确认待办", project: "P12", owner: "PM", initiator: "设计师", status: "待处理", sourceTodoId: "D1", designSubmission: 2 },
  ];
}
test("设计交付接续只读定位本次真实提交的PM确认，不混入旧版本/别项目，不因失败生成关系", () => {
  const rows = designTasks(), before = JSON.stringify(rows), { api, calls } = guideRuntime(rows);
  const link = api.guideTaskLink("D1", "设计确认待办");
  assert.equal(link.id, "R2"); assert.equal(link.sourceTodoId, "D1"); assert.equal(link.designSubmission, 2); assert.equal(link.designType, "独立设计服务");
  assert.equal(link.canOperate, false); // The designer may locate the PM's task, never operate as PM.
  assert.equal(api.guideLocateTask(link.id).ok, true);
  assert.deepEqual(calls, [["R2", "操作指引"]]); assert.equal(JSON.stringify(rows), before);
  rows[0].status = "待处理"; assert.equal(api.guideTaskLink("D1", "设计确认待办"), null);
  rows[0].status = "已处理"; rows[2].designSubmission = 1; assert.equal(api.guideTaskLink("D1", "设计确认待办"), null);
  rows[2].designSubmission = 2; rows[2].project = "P12"; assert.equal(api.guideTaskLink("D1", "设计确认待办"), null);
});
test("关联任务权限和未提交表单受到保护，驳回精确返回原设计师，不代办或完成任何任务", () => {
  const rows = designTasks(), { api, calls, dialogs } = guideRuntime(rows);
  dialogs.push({ closest: () => null, getClientRects: () => [{}] });
  assert.equal(api.guideLocateTask("R2").ok, false); assert.deepEqual(calls, []); assert.equal(rows[2].status, "待处理");
  dialogs.length = 0; rows[2].status = "已驳回"; rows[0].status = "待处理";
  assert.equal(api.guideTaskLink("R2", "设计待办").id, "D1");
  const hidden = guideRuntime(rows, rows.filter(task => task.id !== "R2"));
  assert.equal(hidden.api.guideTaskState("R2"), null); assert.equal(hidden.api.guideLocateTask("R2").ok, false); assert.deepEqual(hidden.calls, []);
  rows[0].status = "已处理"; assert.equal(hidden.api.guideTaskLink("D1", "设计确认待办"), null);
});
test("统一项目创建不选择设计师或期限，设计审核路线独立结束", () => {
  for (const id of ["project-design"]) {
    const plan = routePlan(id);
    assert.equal(plan.some(step=>step.id==="project-designer"),false);
    assert.equal(plan.some(step=>step.id==="designer"||step.id==="deadline"),false);
    assert.equal(plan.at(-1).target,"plain-save");
  }
  assert.equal(routePlan("project-none").some(step => step.id === "project-designer"), false);
  assert.equal(routePlan("project-product").some(step => step.id === "designer"), false);
  assert.equal(nextGuideRoute("design-review", "sync", { taskState: { designType: "独立设计服务" } }), "");
  assert.equal(nextGuideRoute("design-delivery", "sync", { taskState: { designType: "独立设计服务" } }), "design-review");
});


test('整区高亮包括标题与全部可见字段，止于下一分区，不包含隐藏条件字段',()=>{
 const box=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
 const make=(rect,title=false,hidden=false)=>({isConnected:true,hidden,getClientRects:()=>[rect],getBoundingClientRect:()=>rect,closest:()=>null,matches:q=>title&&(q.includes('sec-title')),ownerDocument:{defaultView:{}},nextElementSibling:null});
 const heading=make(box(100,100,600,36),true),a=make(box(100,148,290,70)),b=make(box(410,228,290,70)),hidden=make(box(100,320,900,300),false,true),next=make(box(100,340,600,36),true);
 heading.nextElementSibling=a;a.nextElementSibling=b;b.nextElementSibling=hidden;hidden.nextElementSibling=next;
 assert.deepEqual(tutorialRect(heading),{left:100,top:100,width:600,height:198});
});
test('新待办路线清除上一次搜索上下文，精确链接衔接和未保存抽屉不重置',()=>{
 const source=fs.readFileSync(new URL('../src/features/tutorial/OperationGuide.jsx',import.meta.url),'utf8');
 assert.match(source,/!sameLiveRoute && !linkedTask && next.task && !dialogOpen && !editorOpen\) api.todoReset/);
 assert.match(source,/route\?\.task && !context.current.taskId\) api.todoReset/);
});

test('补齐其余信息从物流开始覆盖至表单末尾，普通分区仍止于下一标题',()=>{
 const rect=(top,height)=>({left:10,top,width:600,height,right:610,bottom:top+height});
 const make=(top,height,title=false)=>({isConnected:true,hidden:false,getClientRects:()=>[rect(top,height)],getBoundingClientRect:()=>rect(top,height),closest:()=>null,matches:q=>title&&q.includes('sec-title'),ownerDocument:{defaultView:{}},nextElementSibling:null});
 const logistics=make(100,36,true),field=make(146,70),extra=make(230,36,true),rest=make(280,360);logistics.nextElementSibling=field;field.nextElementSibling=extra;extra.nextElementSibling=rest;
 assert.equal(tutorialRect(logistics,'files').height,540);assert.equal(tutorialRect(logistics,'project').height,116);
 const source=fs.readFileSync(new URL('../src/features/tutorial/dom.js',import.meta.url),'utf8');assert.match(source,/case "files".*'物流方式'/);
});
test('成功发布后返回本次报价待办，再指引手动确认，客户线上确认不作为门禁',()=>{
 const plan=routePlan('quotation');
 assert.deepEqual(plan.slice(-3).map(s=>s.id),['quote-publish','quote-return','quote-confirm']);
 assert.equal(plan.at(-2).success,'quote-task-ready');assert.match(plan.at(-1).copy,/客户确认不代替/);
 const source=fs.readFileSync(new URL('../src/features/tutorial/OperationGuide.jsx',import.meta.url),'utf8');
 assert.match(source,/item\?\.id !== "quote-return" \|\| !context.current.quotePublished \|\| !context.current.taskId/);
 assert.match(source,/api.guideLocateTask\?\.\(context.current.taskId\)/);
});

 test('教程提交回执匹配本次实际操作、商机、项目、报价及请求，不依赖已卸载的编辑器',async()=>{
 const {quotePublication}=await import('../src/features/tutorial/model.js');
 const ctx={taskId:'T1',quotePublishClicked:true,quotePublishRequest:'R1',quoteCode:'Q1',oppId:'B1',projectId:'P1'},receipt={durable:true,submissionRequestId:'R1',draftCode:'Q1',opp:'B1',project:'P1'};
 assert.deepEqual(quotePublication(ctx,receipt),{quotePublished:true});
 for(const field of ['submissionRequestId','draftCode','opp','project'])assert.equal(quotePublication(ctx,{...receipt,[field]:'OTHER'}),null);
 assert.equal(quotePublication(ctx,{...receipt,durable:false}),null);assert.equal(quotePublication({...ctx,quotePublishClicked:false},receipt),null);assert.equal(quotePublication({...ctx,taskId:''},receipt),null);assert.equal(quotePublication({...ctx,quotePublishRequest:''},receipt),null);
 });

 test('编辑器切页后以关联待办的已保存提交版本衔接，保存或其他商机不推进',async()=>{
 const {quoteRecordPublished}=await import('../src/features/tutorial/model.js');const ctx={taskOpened:true,taskId:'T',projectId:'P',oppId:'B',quoteCode:'Q',quoteRevisionBefore:2};const t={id:'T',type:'报价待办',project:'P',opp:'B',quotation:{code:'Q',revision:3,submittedAt:'2026-10-12 16:30'}};
 assert.equal(quoteRecordPublished(ctx,t),true);assert.equal(quoteRecordPublished(ctx,{...t,quotation:{...t.quotation,revision:2}}),false);
 for(const key of ['id','project','opp','type'])assert.equal(quoteRecordPublished(ctx,{...t,[key]:'OTHER'}),false);
 assert.equal(quoteRecordPublished(ctx,{...t,quotation:{...t.quotation,code:'OTHER'}}),false);assert.equal(quoteRecordPublished(ctx,{...t,quotation:{...t.quotation,submittedAt:''}}),false);assert.equal(quoteRecordPublished({...ctx,taskOpened:false},t),false);assert.equal(quoteRecordPublished({...ctx,quoteRevisionBefore:undefined},t),false);
 });

