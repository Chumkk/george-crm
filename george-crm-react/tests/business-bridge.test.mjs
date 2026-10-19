import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import {
  metricFilter,
  splitActions,
  taskLabel,
} from "../src/features/todos/model.js";

const source = fs.readFileSync(
  new URL("../src/compat/runtime/bridge.js", import.meta.url),
  "utf8",
);
function boot(overrides = {}) {
  const calls = [];
  const context = {
    window: {},
    calls,
    document: {
      createElement: () => ({
        dataset: {},
        setAttribute(key, value) {
          this.dataset[
            key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
          ] = value;
        },
      }),
    },
    openPage: (page) => calls.push(["page", page]),
    handleAct: (button) => calls.push(["action", { ...button.dataset }]),
    v3Tags: (code) => calls.push(["tags", code]),
    v3DraftDetail: (code) => calls.push(["detail", code]),
    v3CopyDraft: (code) => calls.push(["copy", code]),
    v3BindFromDraft: (code) => calls.push(["bind", code]),
    v21Manager: () => false,
    v17Owner: () => "PM",
    V21: { stay: "14" },
    V18: { context: { ids: ["TD1"] } },
    WK: { sort: "oldest" },
    V72: { scenario: 0, messages: [] },
    V72_DEMOS: [
      ["pm", "客户待办已到达", "", "", "客户待办"],
      ["sm", "报价待办已到达", "", "", "报价待办"],
      ["pm", "跨区域审批已到达", "", "", "跨区域商机审批待办"],
      ["pm", "无需设计，请创建项目", "", "", "创建项目待办"],
    ],
    V72_ROLES: { pm: { label: "项目经理" }, sm: { label: "方案经理" } },
    crmTodoEnabled: type => type !== "客户待办",
    V3: { filter: "已绑定", search: "旧搜索" },
    ...overrides,
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { api: context.window.GeorgeRuntime, context, calls };
}

test("通知目标和待办按钮保留准确记录编号，不自动打开详情", () => {
  const { api, calls } = boot({
    v72Go: (id) => calls.push(["notification-search", id]),
  });
  api.openNotification("old-card-009");
  api.todoAction({
    act: "v75DemoDetail",
    attrs: { "data-record-id": "NT-DEMO-009" },
  });
  assert.deepEqual(calls, [
    ["notification-search", "old-card-009"],
    ["action", { act: "v75DemoDetail", recordId: "NT-DEMO-009" }],
  ]);
});

test("React 通知演示在没有旧版选择器时仍使用所选场景", () => {
  const workflow = fs.readFileSync(
    new URL("../src/compat/runtime/workflows.js", import.meta.url),
    "utf8",
  );
  const start = workflow.indexOf("const v72Handle=handleAct;");
  const end = workflow.indexOf("document.addEventListener('change'", start);
  assert.ok(start >= 0 && end > start);
  const samples = [];
  const { api, context, calls } = boot({
    V72: { scenario: 0, messages: [], sequence: 0 },
    v72Sample: (index) => {
      assert.ok(Number.isInteger(index));
      samples.push(index);
      return { title: ["客户待办", "报价待办", "跨区域审批"][index] };
    },
    v72RolePage: () => "wecom-notifications",
    todoStamp: () => "2026-10-05 12:00",
    v72SaveMessages: () => calls.push(["saved"]),
    toast: (message) => calls.push(["toast", message]),
  });
  context.document.querySelector = () => null;
  vm.runInContext(workflow.slice(start, end), context);
  for (const scenario of [1, 2, 0]) {
    api.setScenario(String(scenario));
    api.simulate();
  }
  assert.deepEqual(samples, [1, 2, 1]);
  assert.equal(context.V72.messages.length, 3);
  assert.equal(context.V72.messages[0].title, "报价待办");
  assert.equal(calls.filter(([action]) => action === "saved").length, 3);
  assert.equal(calls.filter(([action]) => action === "page").length, 3);
  api.setScenario("invalid");
  api.simulate();
  assert.equal(context.V72.messages.length, 4);
  assert.equal(samples.at(-1), 1);
});

test("通知默认项自动避开退休客户场景，保留仍然有效的选择", () => {
  const { api, context } = boot();
  for (const stale of [0, 3, 999, NaN]) {
    context.V72.scenario = stale;
    const model = api.notifications();
    assert.deepEqual(Array.from(model.scenarios, scenario => scenario.id), [1, 2]);
    assert.equal(model.scenario, 1);
    assert.equal(context.V72.scenario, 1);
  }
  api.setScenario(2);
  assert.equal(api.notifications().scenario, 2);
});

test("模拟通知不依赖先读取页面，旧场景索引仍安全回退", () => {
  const { api, context, calls } = boot();
  context.V72.scenario = 3;
  api.simulate();
  assert.deepEqual(calls, [["action", { act: "v72Simulate", scenario: "1" }]]);
});

test("无可用通知场景时不生成通知或业务记录", () => {
  const notices = [];
  const { api, context, calls } = boot({
    crmTodoEnabled: () => false,
    toast: message => notices.push(message),
  });
  assert.equal(api.notifications().scenario, -1);
  api.setScenario(0);
  api.simulate();
  assert.equal(context.V72.scenario, -1);
  assert.equal(context.V72.messages.length, 0);
  assert.deepEqual(calls, []);
  assert.deepEqual(notices, ["暂无可用的通知演示场景"]);
});

test("真实待办动作保留流程、项目、目标记录上下文", () => {
  const { api, calls } = boot();
  api.todoAction({
    act: "deal",
    attrs: { "data-id": "TD104", "data-project": "PJ0018011" },
  });
  assert.deepEqual(calls[0], [
    "action",
    { act: "deal", id: "TD104", project: "PJ0018011" },
  ]);
});

test("关闭当前页签切换到剩余页签，关闭后台页签保留当前页", () => {
  for (const current of ["mall", "todos"]) {
    const dropped = [];
    const { api, context, calls } = boot({
      tabs: ["projects", "home", "todos", "mall"],
      page: current,
      dropPageEl: (id) => dropped.push(id),
    });
    api.closeTab("mall");
    assert.deepEqual(Array.from(context.tabs), ["projects", "home", "todos"]);
    assert.deepEqual(dropped, ["mall"]);
    assert.deepEqual(calls, [["page", "todos"]]);
    api.closeTab("home");
    api.closeTab("projects");
    api.closeTab("already-closed");
    assert.equal(calls.length, 1);
  }
});

test("清空筛选同时清除通知范围、项目、今日和停留条件", () => {
  const { api, context, calls } = boot();
  api.todoReset();
  assert.equal(context.V18.context, null);
  assert.equal(context.V21.stay, "all");
  assert.equal(context.todoProject, "");
  assert.equal(context.todoQuick, "");
  assert.equal(context.todoSearch, "");
  assert.equal(context.todoStatus, "待处理");
  assert.deepEqual(calls, [["page", "todos"]]);
});

test("草稿操作继续使用原有报价与绑定入口，保留标签编辑", () => {
  const { api, calls } = boot();
  for (const action of ["detail", "tags", "copy", "bind", "edit"])
    api.draftAction(action, "DRAFT-7");
  assert.deepEqual(calls, [
    ["detail", "DRAFT-7"],
    ["tags", "DRAFT-7"],
    ["copy", "DRAFT-7"],
    ["bind", "DRAFT-7"],
    ["action", { act: "go:draftEditor", draft: "DRAFT-7" }],
  ]);
});

test("主操作优先办理，查看流程独立，已处理记录不丢失查看入口", () => {
  const actions = [
    { act: "detail", t: "查看详情" },
    { act: "deal", t: "填写客户需求" },
    { act: "viewDealFlow", t: "查看流程图" },
  ];
  assert.equal(splitActions(actions).main.act, "deal");
  assert.equal(splitActions(actions).flow[0].act, "viewDealFlow");
  assert.equal(splitActions([actions[0]]).main.act, "detail");
  assert.equal(splitActions([]).main, undefined);
  assert.deepEqual(metricFilter("done"), { status: "已处理", quick: "" });
  assert.equal(taskLabel("确认商机"), "商机接单");
});
