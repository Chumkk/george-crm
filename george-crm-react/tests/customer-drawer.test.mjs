import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { transformWithEsbuild } from "vite";

// Exercise component handlers and persisted hook state without a browser.
// DOM layout, focus movement and native confirmation presentation are verified separately.
const url = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const reactUrl = url(`
export * from ${JSON.stringify(import.meta.resolve("react"))};
let state=[], cursor=0;
export function reset(){state=[];cursor=0;}
export function render(Component, props){cursor=0;return Component(props);}
export function useState(initial){const i=cursor++; if(!(i in state)) state[i]=typeof initial==='function'?initial():initial; return [state[i], value=>{state[i]=typeof value==='function'?value(state[i]):value;}];}
export function useRef(initial){const i=cursor++; if(!(i in state))state[i]={current:initial};return state[i];}
export function useEffect(){cursor++;}
export function useId(){return 'test-'+cursor++;}
`);
const portalUrl = url("export const createPortal = (child) => child;");
async function compile(relative, replacements = {}) {
  let source = await fs.readFile(new URL(relative, import.meta.url), "utf8");
  if (relative.endsWith("CustomerCenter.jsx"))
    source += "\nexport { CustomerDrawer, CustomerProgress };\n";
  source = source.replace(/import "\.\/customers.css";/g, "");
  for (const [from, to] of Object.entries(replacements))
    source = source.replaceAll(from, to);
  const result = await transformWithEsbuild(source, relative, {
    loader: "jsx",
    format: "esm",
    jsx: "automatic",
  });
  return url(
    result.code
      .replaceAll('"react"', JSON.stringify(reactUrl))
      .replaceAll('"react-dom"', JSON.stringify(portalUrl))
      .replaceAll(
        '"react/jsx-runtime"',
        JSON.stringify(import.meta.resolve("react/jsx-runtime")),
      ),
  );
}
const uiUrl = await compile("../src/components/ui.jsx", {
  "../compat/managementHeaders": new URL("../src/compat/managementHeaders.js", import.meta.url).href,
});
const componentUrl = await compile(
  "../src/features/customers/CustomerCenter.jsx",
  { "../../components/ui": uiUrl },
);
const { CustomerDrawer, CustomerCenter } = await import(componentUrl);
const hooks = await import(reactUrl);
const flatten = (node) =>
  Array.isArray(node)
    ? node.flatMap(flatten)
    : node && typeof node === "object" && node.props
      ? [node, ...flatten(node.props.children)]
      : [];
const text = (node) =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : Array.isArray(node)
      ? node.map(text).join("")
      : node?.props
        ? text(node.props.children)
        : "";
const button = (tree, label) =>
  flatten(tree).find((node) => node.type === "button" && text(node) === label);
const field = (tree, label) =>
  flatten(tree).find(
    (node) => node.type?.name === "Field" && node.props.label === label,
  )?.props.children;
const section = (tree, name) =>
  flatten(tree).find((node) => node.props["data-drawer-section"] === name);
const submit = (form) => form.props.onSubmit({ preventDefault() {} });
const customer = () => ({
  id: "C1",
  name: "示例客户",
  country: "肯尼亚",
  phone: "+254700000001",
  owner: "PM",
  identity: "业主",
  source: "展会",
  priority: "常规",
  nextAt: "2026-10-06",
  nextAction: "确认需求",
  tags: ["T1"],
  followups: [],
  projects: [],
  canManage: true,
});
function setup(overrides = {}) {
  hooks.reset();
  globalThis.document = { body: {} };
  globalThis.window = { confirm: () => false };
  const calls = [],
    data = customer();
  let closed = 0;
  const props = {
    customer: data,
    model: {
      customers: [data],
      canManage: true,
      tags: [{ id: "T1", name: "已沟通", group: "跟进" }],
    },
    api: {
      customerAction: (type, payload) => {
        calls.push([type, payload]);
        return { ok: true };
      },
    },
    onClose: () => closed++,
    onRefresh() {},
    ...overrides,
  };
  return {
    props,
    calls,
    render: () => hooks.render(CustomerDrawer, props),
    closed: () => closed,
  };
}

test("drawer retains inputs across tabs and preserves other sections after a successful save", () => {
  const ctx = setup();
  let tree = ctx.render();
  field(section(tree, "basics"), "客户名称 *").props.onChange({
    target: { value: "修改后的客户" },
  });
  tree = ctx.render();
  field(section(tree, "profile"), "客户备注").props.onChange({
    target: { value: "尚未保存的备注" },
  });
  tree = ctx.render();
  button(tree, "跟进").props.onClick();
  tree = ctx.render();
  field(tree, "跟进内容 *").props.onChange({
    target: { value: "尚未保存的沟通" },
  });
  tree = ctx.render();
  button(tree, "资料编辑").props.onClick();
  tree = ctx.render();
  assert.equal(
    field(section(tree, "basics"), "客户名称 *").props.value,
    "修改后的客户",
  );
  submit(section(tree, "basics"));
  tree = ctx.render();
  assert.equal(ctx.calls[0][0], "saveCustomerBasics");
  assert.equal(ctx.calls[0][1].customerId, "C1");
  assert.equal(
    field(section(tree, "profile"), "客户备注").props.value,
    "尚未保存的备注",
  );
  assert.equal(field(tree, "跟进内容 *").props.value, "尚未保存的沟通");
  assert(text(tree).includes("基础资料已保存"));
  assert(text(tree).includes("有未保存内容"));
});

test("failed basic save retains values and shows a section error without success", () => {
  const ctx = setup({
    api: { customerAction: () => ({ ok: false, error: "保存空间不足" }) },
  });
  let tree = ctx.render();
  field(section(tree, "basics"), "客户名称 *").props.onChange({
    target: { value: "保留此输入" },
  });
  tree = ctx.render();
  submit(section(tree, "basics"));
  tree = ctx.render();
  assert.equal(
    field(section(tree, "basics"), "客户名称 *").props.value,
    "保留此输入",
  );
  assert(text(tree).includes("保存空间不足"));
  assert(!text(tree).includes("基础资料已保存"));
  assert.equal(button(tree, "保存基础资料").props.disabled, false);
});

test("close cancels without dropping unsaved content and closes only after confirmation", () => {
  const ctx = setup();
  let tree = ctx.render();
  field(section(tree, "profile"), "客户备注").props.onChange({
    target: { value: "未保存输入" },
  });
  tree = ctx.render();
  button(tree, "关闭抽屉").props.onClick();
  assert.equal(ctx.closed(), 0);
  assert.equal(
    field(section(ctx.render(), "profile"), "客户备注").props.value,
    "未保存输入",
  );
  globalThis.window.confirm = () => true;
  button(ctx.render(), "关闭抽屉").props.onClick();
  assert.equal(ctx.closed(), 1);
});

test("followup and profile share the next action without saving unrelated profile fields", () => {
  const ctx = setup();
  let tree = ctx.render();
  field(section(tree, "profile"), "客户备注").props.onChange({
    target: { value: "仍需单独保存的画像" },
  });
  tree = ctx.render();
  field(tree, "跟进内容 *").props.onChange({
    target: { value: "本次沟通结果" },
  });
  tree = ctx.render();
  const followupForm = flatten(tree).find(
    (node) => node.type === "form" && text(node).includes("记录本次跟进"),
  );
  field(followupForm, "下一步行动").props.onChange({
    target: { value: "预约方案沟通" },
  });
  tree = ctx.render();
  assert.equal(
    field(section(tree, "profile"), "下一步行动").props.value,
    "预约方案沟通",
  );
  submit(
    flatten(tree).find(
      (node) => node.type === "form" && text(node).includes("记录本次跟进"),
    ),
  );
  tree = ctx.render();
  assert.equal(ctx.calls[0][0], "addFollowup");
  assert.equal(ctx.calls[0][1].nextAction, "预约方案沟通");
  assert.equal(ctx.calls[0][1].notes, undefined);
  assert.equal(field(tree, "跟进内容 *").props.value, "");
  assert.equal(
    field(section(tree, "profile"), "客户备注").props.value,
    "仍需单独保存的画像",
  );
  assert.equal(button(tree, "保存跟进画像").props.disabled, false);
});

test("opening and closing drawer preserves list search and selected column mode", () => {
  hooks.reset();
  const data = customer();
  const props = {
    api: {
      customerHub: () => ({
        customers: [data],
        canManage: true,
        tags: [],
        owners: [],
      }),
    },
    surface: { kind: "customers", id: "customers" },
  };
  let tree = hooks.render(CustomerCenter, props);
  field(tree, "搜索客户").props.onChange({ target: { value: "示例" } });
  tree = hooks.render(CustomerCenter, props);
  button(tree, "更多资料").props.onClick();
  tree = hooks.render(CustomerCenter, props);
  button(tree, "客户详情").props.onClick();
  tree = hooks.render(CustomerCenter, props);
  const drawer = flatten(tree).find((node) => node.type === CustomerDrawer);
  assert(drawer);
  drawer.props.onClose();
  tree = hooks.render(CustomerCenter, props);
  assert.equal(field(tree, "搜索客户").props.value, "示例");
  assert.equal(button(tree, "更多资料").props["aria-pressed"], true);
  assert(text(tree).includes("归属与运营"));
});

test("read-only customers have disabled drawer fields and no save controls", () => {
  const data = { ...customer(), canManage: false };
  const ctx = setup({ customer: data });
  const tree = ctx.render();
  assert.equal(
    field(section(tree, "basics"), "客户名称 *").props.disabled,
    true,
  );
  assert.equal(button(tree, "保存基础资料"), undefined);
  assert.equal(button(tree, "保存跟进画像"), undefined);
  assert.equal(button(tree, "保存客户标签"), undefined);
  assert.equal(button(tree, "保存本次跟进"), undefined);
});

test("the original full form cannot overwrite an unsaved basic-info draft", () => {
  let opened = 0;
  const ctx = setup({
    api: {
      action() {
        opened++;
      },
    },
  });
  let tree = ctx.render();
  field(section(tree, "basics"), "客户名称 *").props.onChange({
    target: { value: "抽屉中尚未保存" },
  });
  tree = ctx.render();
  button(tree, "打开完整资料表单").props.onClick();
  tree = ctx.render();
  assert.equal(opened, 0);
  assert.equal(
    field(section(tree, "basics"), "客户名称 *").props.value,
    "抽屉中尚未保存",
  );
  assert(text(tree).includes("请先保存本区基础资料"));
});
