import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const bridge = fs.readFileSync(
  new URL("../src/compat/runtime/bridge.js", import.meta.url),
  "utf8",
);
const workflow = fs.readFileSync(
  new URL("../src/compat/runtime/workflows.js", import.meta.url),
  "utf8",
);
const scopeHelpers = ["v21View", "v21Owners", "v21Rows"]
  .map((name) => {
    const line = workflow.match(new RegExp(`^function ${name}\\([^\\n]+`, "m"));
    assert.ok(line, `${name} remains available to the business bridge`);
    return line[0];
  })
  .join("\n");

function boot({ owner = "PM", manager = true } = {}) {
  const task = (id, assignee, initiator, extra = {}) => ({
    id,
    owner: assignee,
    initiator,
    type: "设计待办",
    status: "待处理",
    time: "2026-10-05 08:00",
    customer: "Oceanview",
    project: "PJ1",
    hours: 240,
    ...extra,
  });
  const records = [
    task("mine", "PM", "SALES"),
    task("both", "PM", "PM"),
    task("team", "REPORT", "SALES"),
    task("sent-outside", "OUTSIDE", "PM"),
    task("sent-rejected", "OUTSIDE", "PM", { status: "已驳回" }),
    task("sent-done", "REPORT", "PM", { status: "已处理" }),
    task("sent-old", "OUTSIDE", "PM", { time: "2026-10-03 08:00" }),
    task("sent-recent", "OUTSIDE", "PM", { hours: 24 }),
    task("sent-project", "OUTSIDE", "PM", { type: "项目待办" }),
    task("unrelated", "OUTSIDE", "SALES"),
  ];
  const calls = [];
  const state = { owner, manager, records };
  const context = {
    window: {},
    document: {},
    V18: { context: null },
    V21: { auth: "", view: "team", stay: "all" },
    WK: { sort: "oldest" },
    todoFilter: "全部",
    todoStatus: "全部",
    todoQuick: "",
    todoSearch: "",
    todoProject: "",
    openPage: (page) => calls.push(page),
    v17Owner: () => state.owner,
    v21Manager: () => state.manager,
    v21SuperAdmin: () => false,
    v21AllowedOwners: () =>
      state.manager ? [state.owner, "REPORT"] : [state.owner],
    visibleTodos: () => state.records,
    v21Arrival: (t) => t.v21ArrivedAt || t.time,
    v21ScopeName: () => "当前可见范围",
    todoDay: () => "2026-10-05",
    todoMatchesSearch: (t, q) =>
      [t.id, t.customer, t.project].some((value) => value.includes(q)),
    todoStayHours: (t) => t.hours,
    parseTodoTime: (value) => Date.parse(value),
    v18Name: (type) => type,
    todoSubject: (t) => t.type,
    todoMeta: (t) => t.customer,
    todoStayLabel: (t) => String(t.hours),
    v21CanOperate: (t) => t.owner === state.owner,
    v68CustomerMeta: (t) => t.customer,
    todoActs: () => [],
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL("../src/compat/runtime/policy.js", import.meta.url), "utf8"), context);
  vm.runInContext(scopeHelpers, context);
  vm.runInContext(bridge, context);
  return { api: context.window.GeorgeRuntime, context, state, calls };
}

const ids = (result) => Array.from(result.rows, (row) => row.id).sort();

test("采购和设计接单/报价独立计数筛选，保留关联范围和原任务身份", () => {
  const { api, context, state } = boot();
  const seed = { owner: "PM", initiator: "PM", status: "待处理", time: "2026-10-05 08:00", customer: "Oceanview", project: "PJ1" };
  state.records = [
    { ...seed, id: "product-accept", type: "确认商机", allocation: { cat: "家具" } },
    { ...seed, id: "design-accept", type: "确认商机", designOpportunity: true },
    { ...seed, id: "product-quote", type: "报价待办", opp: "BU1" },
    { ...seed, id: "design-quote", type: "报价待办", opp: "BU2" },
    { ...seed, id: "design-addon", type: "报价待办", designOpportunity: true, isAddon: true },
    { ...seed, id: "outside", type: "报价待办", owner: "OUTSIDE", initiator: "OTHER" },
    { ...seed, id: "done", type: "报价待办", designOpportunity: true, status: "已处理" },
  ];
  context.OPPS = [["BU1"], ["BU2", ...Array(19).fill(null), { kind: "design" }]];
  api.todoUpdate({ status: "待处理", filter: "设计报价" });
  let model = api.todos();
  assert.deepEqual(ids(model), ["design-addon", "design-quote"]);
  assert.equal(model.counts["产品报价"], 1);
  assert.equal(model.counts["设计报价"], 2);
  assert.equal(model.counts["采购商机接单"], 1);
  assert.equal(model.counts["设计商机接单"], 1);
  assert.ok(model.rows.every(t => t.type === "报价待办" && t.typeLabel === "设计报价"));
  api.todoUpdate({ filter: "采购商机接单" });
  assert.deepEqual(ids(api.todos()), ["product-accept"]);
  api.todoUpdate({ filter: "设计商机接单" });
  assert.deepEqual(ids(api.todos()), ["design-accept"]);
  api.todoUpdate({ filter: "报价待办" });
  assert.deepEqual(ids(api.todos()), ["design-addon", "design-quote", "product-quote"]);
  context.V18.context = { ids: ["design-quote"] };
  api.todoUpdate({ filter: "产品报价" });
  model = api.todos();
  assert.equal(model.rows.length, 0);
  assert.equal(model.counts["产品报价"], 0);
  assert.equal(model.counts["设计报价"], 1);
  assert.deepEqual(state.records.map(t => t.type), ["确认商机", "确认商机", "报价待办", "报价待办", "报价待办", "报价待办", "报价待办"]);
});

test("待办中心默认全部，按授权管理范围和本人发起记录展示", () => {
  const { api } = boot();
  const result = api.todos();
  assert.equal(result.relation, "all");
  assert.equal(result.rows.length, 9);
  assert.equal(result.metrics.pending, 7);
  assert.equal(result.counts["全部"], 9);
  assert.ok(ids(result).includes("team"));
  assert.ok(ids(result).includes("sent-outside"));
  assert.ok(!ids(result).includes("unrelated"));
});

test("显式选择我负责后仅展示本人负责待办，其他刷新不会覆盖选择", () => {
  const { api } = boot();
  api.todos();
  api.todoRelation("responsible");
  const result = api.todos();
  assert.equal(result.relation, "responsible");
  assert.deepEqual(ids(result), ["both", "mine"]);
  assert.equal(result.metrics.pending, 2);
  assert.equal(result.counts["全部"], 2);
  api.todoUpdate({ query: "Oceanview" });
  assert.equal(api.todos().relation, "responsible");
  assert.deepEqual(ids(api.todos()), ["both", "mine"]);
});

test("我发起包含交给团队外人员的待办，排除他人发起记录", () => {
  const { api } = boot();
  api.todos();
  api.todoRelation("initiated");
  const result = api.todos();
  assert.equal(result.relation, "initiated");
  assert.deepEqual(ids(result), [
    "both",
    "sent-done",
    "sent-old",
    "sent-outside",
    "sent-project",
    "sent-recent",
    "sent-rejected",
  ]);
  assert.equal(result.metrics.pending, 5);
  assert.equal(result.metrics.done, 1);
  assert.equal(result.metrics.rejected, 1);
});

test("全部合并管理范围和本人发起待办，不重复计数或扩大到无关人员", () => {
  const { api } = boot();
  api.todos();
  api.todoRelation("all");
  const result = api.todos();
  assert.equal(result.rows.length, 9);
  assert.equal(new Set(ids(result)).size, 9);
  assert.ok(ids(result).includes("team"));
  assert.ok(ids(result).includes("sent-outside"));
  assert.ok(!ids(result).includes("unrelated"));
});

test("普通员工默认全部，包含本人发起并交给其他人的待办但不扩大授权", () => {
  const { api } = boot({ manager: false });
  const result = api.todos();
  assert.equal(result.relation, "all");
  assert.equal(result.view, "PM");
  assert.equal(result.rows.length, 8);
  assert.ok(ids(result).includes("sent-outside"));
  assert.ok(!ids(result).includes("team"));
  assert.ok(!ids(result).includes("unrelated"));
});

test("全部下指定成员时按成员交集展示，再切我发起恢复本人全部发起记录", () => {
  const { api, context } = boot();
  api.todos();
  api.todoRelation("all");
  context.V21.view = "REPORT";
  assert.deepEqual(ids(api.todos()), ["sent-done", "team"]);
  api.todoRelation("initiated");
  assert.equal(context.V21.view, "team");
  assert.equal(api.todos().rows.length, 7);
});

test("重置清除指定成员筛选，恢复全部授权范围而不显示无关记录", () => {
  const { api, context } = boot();
  api.todos();
  context.V21.view = "REPORT";
  assert.deepEqual(ids(api.todos()), ["sent-done", "team"]);
  api.todoReset();
  const result = api.todos();
  assert.equal(result.relation, "all");
  assert.equal(result.view, "team");
  assert.equal(result.rows.length, 7);
  assert.ok(ids(result).includes("mine"));
  assert.ok(ids(result).includes("sent-outside"));
  assert.ok(!ids(result).includes("unrelated"));

  const staff = boot({ manager: false });
  staff.api.todos();
  staff.api.todoRelation("responsible");
  staff.api.todoReset();
  const staffResult = staff.api.todos();
  assert.equal(staffResult.relation, "all");
  assert.equal(staffResult.view, "PM");
  assert.equal(staffResult.rows.length, 6);
  assert.ok(!ids(staffResult).includes("team"));
  assert.ok(!ids(staffResult).includes("unrelated"));
});

test("关系筛选与状态、分类、搜索、今日和停留时间组合生效", () => {
  const { api } = boot();
  api.todos();
  api.todoRelation("initiated");
  api.todoUpdate({
    status: "待处理",
    filter: "设计待办",
    query: "sent-",
    quick: "today",
    stay: "7",
  });
  const result = api.todos();
  assert.deepEqual(ids(result), ["sent-outside"]);
  // Category counts include matching rows in other categories; metrics keep the relation scope.
  assert.equal(result.counts["全部"], 2);
  assert.equal(result.counts["项目待办"], 1);
  assert.equal(result.metrics.pending, 5);
  api.todoUpdate({ status: "已驳回", quick: "", stay: "all", query: "" });
  assert.deepEqual(ids(api.todos()), ["sent-rejected"]);
});

test("通知按准确编号定位我发起的跨团队待办，不自动打开详情", () => {
  const { api, context, calls } = boot({ manager: false });
  api.todos();
  api.todoRelation("responsible");
  context.V18.context = { ids: ["sent-outside"], label: "通知目标" };
  const result = api.todos();
  assert.equal(result.relation, "all");
  assert.deepEqual(ids(result), ["sent-outside"]);
  assert.equal(result.context.count, 1);
  assert.deepEqual(calls, ["todos"]);
  // A forged notification identifier cannot make an unrelated record visible.
  context.V18.context = { ids: ["unrelated"], label: "无权查看" };
  assert.deepEqual(ids(api.todos()), []);
});

test("切换关系清除通知定位，重置恢复全部及默认列表条件", () => {
  const { api, context } = boot();
  api.todos();
  context.V18.context = { ids: ["sent-outside"] };
  context.todoSearch = "sent-outside";
  api.todos();
  api.todoRelation("initiated");
  assert.equal(context.V18.context, null);
  assert.equal(context.todoSearch, "");
  assert.equal(api.todos().rows.length, 7);
  api.todoUpdate({
    status: "已驳回",
    filter: "设计待办",
    quick: "today",
    stay: "7",
    query: "sent",
  });
  api.todoReset();
  const result = api.todos();
  assert.equal(result.relation, "all");
  assert.equal(result.status, "待处理");
  assert.equal(result.filter, "全部");
  assert.equal(result.quick, "");
  assert.equal(result.query, "");
  assert.equal(result.stay, "all");
  assert.deepEqual(ids(result), [
    "both",
    "mine",
    "sent-old",
    "sent-outside",
    "sent-project",
    "sent-recent",
    "team",
  ]);
});

test("切换登录身份后恢复新用户的全部，不继承旧用户关系或通知范围", () => {
  const { api, context, state } = boot();
  api.todos();
  api.todoRelation("initiated");
  context.V18.context = { ids: ["sent-outside"] };
  state.owner = "REPORT";
  state.manager = false;
  state.records.push({
    ...state.records[0],
    id: "report-sent",
    owner: "OUTSIDE",
    initiator: "REPORT",
  });
  const result = api.todos();
  assert.equal(result.relation, "all");
  assert.equal(result.context, null);
  assert.equal(result.view, "REPORT");
  assert.deepEqual(ids(result), ["report-sent", "sent-done", "team"]);
});

test("无效的关系值不改变当前筛选或触发页面操作", () => {
  const { api, calls } = boot();
  api.todos();
  api.todoRelation("everyone-unrestricted");
  assert.equal(api.todos().relation, "all");
  assert.deepEqual(calls, []);
  api.todoRelation("responsible");
  api.todoRelation(undefined);
  assert.equal(api.todos().relation, "responsible");
  assert.deepEqual(calls, ["todos"]);
});

test("待办默认最新到达，同分钟新建及批量待办在顶部且刷新顺序稳定", () => {
  const { api, state } = boot();
  const first = api.todos();
  assert.equal(first.sort, "recent");
  assert.equal(first.relation, "all");
  assert.equal(first.rows.at(-1).id, "sent-old");
  const base = state.records[0];
  // Include a newly initiated task outside the managed team so scope merging cannot push it down.
  state.records.unshift({ ...base, id: "new-1", owner: "OUTSIDE", initiator: "PM" });
  state.records.unshift({ ...base, id: "new-2", time: "2026-10-05 08:01" });
  state.records.unshift({ ...base, id: "new-3", time: "2026-10-05 08:01" });
  const expected = ["new-3", "new-2", "new-1"];
  assert.deepEqual(Array.from(api.todos().rows.slice(0, 3), row => row.id), expected);
  assert.deepEqual(Array.from(api.todos().rows.slice(0, 3), row => row.id), expected);
  assert.equal(new Set(api.todos().rows.map(row => row.id)).size, api.todos().rows.length);
});

test("最新到达读取本次到达时间，不使用处理或修改时间，缺失时间排最后", () => {
  const { api, state } = boot();
  const base = state.records[0];
  state.records = [
    { ...base, id: "completed", status: "已处理", time: "2026-10-01 08:00", approveTime: "2026-10-10 09:00", updatedAt: "2026-10-11 09:00" },
    { ...base, id: "new", time: "2026-10-05 08:00" },
    { ...base, id: "reactivated", time: "2026-09-30 08:00", v21ArrivedAt: "2026-10-06 08:00" },
    { ...base, id: "undated", time: "", updatedAt: "2026-10-12 09:00" },
  ];
  assert.deepEqual(Array.from(api.todos().rows, row => row.id), ["reactivated", "new", "completed", "undated"]);
  assert.equal(state.records[0].time, "2026-10-01 08:00");
});

test("手动选择停留最久后新增和筛选仍保留选择，重置恢复最新到达", () => {
  const { api, state, context } = boot();
  api.todos();
  api.todoUpdate({ sort: "oldest", status: "待处理" });
  state.records.unshift({ ...state.records[0], id: "brand-new", time: "2026-10-06 09:00", hours: 0 });
  api.todoRelation("responsible");
  assert.equal(api.todos().sort, "oldest");
  assert.equal(api.todos().rows.at(-1).id, "brand-new");
  api.todoUpdate({ query: "Oceanview" });
  assert.equal(api.todos().sort, "oldest");
  api.todoReset();
  assert.equal(api.todos().sort, "recent");
  assert.equal(context.WK.sort, "recent");
  assert.equal(api.todos().rows[0].id, "brand-new");
  assert.equal(api.todos().relation, "all");
  assert.equal(api.todos().status, "待处理");
});
