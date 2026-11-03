import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/compat/runtime/customerHub.js', import.meta.url), 'utf8');
const KEY = 'crm-customer-hub-v100';
const customer = (id, name, owner = 'PM') => [id, name, '销售', '销售', owner, '社媒', '-', 'WhatsApp', '-', '肯尼亚', '+254700123456', '终端', '-', '正常', '2026-10-01 09:00', '2026-09-01 10:00'];
const project = (id, name, customerName, pm = 'PM') => [id, name, '销售', '未签约', '进行中', '肯尼亚', '非洲', customerName, '销售', pm];
const opp = (id, projectId, category = '家具', status = '进行中', sm = 'SM') => [id, `${category}商机`, status, category, projectId, '非洲', '过期客户名称', sm, '-', '-', 'PM', '-', '未录单'];
const order = (id, projectId, oppId, type = '销售订单') => {
  const result = [id, 'SM', type, '执行中']; result[15] = projectId; result[17] = oppId; return result;
};
const json = value => JSON.parse(JSON.stringify(value));
function boot(options = {}) {
  const storage = options.storage || new Map();
  let failures = options.failures || 0;
  let failKey = options.failKey || KEY;
  const c = {
    window: {}, Date, Math, JSON,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem(key, value) { if (key === failKey && failures-- > 0) throw Error('storage full'); storage.set(key, value); },
      removeItem: key => storage.delete(key),
    },
    CUSTOMERS: [customer('C1', '客户一')], PROJECTS: [project('P1', '项目一', '客户一')],
    OPPS: [opp('O1', 'P1')], ORDERS: [], TODOS: [], DRAFTS: [], DRAFT_DATA: {},
    PROJECT_EXTRA: { P1: { level: 'B' } }, V3: { meta: {} }, V69_CUSTOMERS: {},
    v17Owner: () => 'PM', v21AllowedOwners: () => ['PM', 'SM'], v21Manager: () => true,
    v21CanOperate: ({ owner }) => owner === 'PM', todoStamp: () => '2026-10-06 10:00', markPagesDirty() {},
    ...options.globals,
  };
  c.v21Data = options.globals?.v21Data || (() => ({ customers: c.CUSTOMERS, projects: c.PROJECTS, opps: c.OPPS }));
  c.ensureCustomerRecord = data => {
    const existing = c.CUSTOMERS.find(row => row[1] === data.customerName);
    if (existing) return existing;
    const row = customer(`C${c.CUSTOMERS.length + 1}`, data.customerName, data.owner);
    row[9] = data.country; row[10] = data.phone; c.CUSTOMERS.unshift(row);
    c.V69_CUSTOMERS[row[0]] = json(data);
    c.localStorage.setItem('crm-customer-rows-v69', JSON.stringify(c.CUSTOMERS));
    return row;
  };
  c.ensureChainTodo = (type, pred, row) => {
    let result = c.TODOS.find(t => t.type === type && t.status === '待处理' && pred(t));
    if (!result) { result = { id: `T${c.TODOS.length + 1}`, type, status: '待处理', ...row }; c.TODOS.unshift(result); }
    return result;
  };
  c.v3Save = options.globals?.v3Save || (() => {
    c.localStorage.setItem('crm-flow-v3', JSON.stringify({ todos: c.TODOS, opps: c.OPPS }));
    c.localStorage.setItem('crm-customer-rows-v69', JSON.stringify(c.CUSTOMERS));
    c.localStorage.setItem('crm-customer-details-v69', JSON.stringify(c.V69_CUSTOMERS));
    return true;
  });
  vm.createContext(c); vm.runInContext(source, c);
  return { c, api: c.window.CRMCustomerHub, storage, fail(key, count = 1) { failKey = key; failures = count; } };
}
const saveLead = (api, extra = {}) => api.action('saveLead', { name: '新线索', country: '美国', phone: '+12025550199', source: '展会', owner: 'PM', need: '采购家具', tags: ['tag-focus'], ...extra });

test('客户经稳定项目ID读取商机，改名及重新打开不丢关联，不受商机旧客户名影响', () => {
  const { api, c, storage } = boot();
  assert.equal(api.snapshot().customers[0].projects[0].opportunities[0].id, 'O1');
  c.CUSTOMERS[0][1] = '客户新名称'; c.PROJECTS[0][7] = '客户新名称';
  assert.equal(api.snapshot().customers[0].projects[0].id, 'P1');
  const reopened = boot({ storage, globals: { CUSTOMERS: c.CUSTOMERS, PROJECTS: c.PROJECTS } });
  assert.equal(reopened.api.snapshot().customers[0].projects[0].id, 'P1');
  assert.equal(c.OPPS[0][6], '过期客户名称');
});

test('同名客户不自动关联项目；显式项目customerId优先', () => {
  const { api, c } = boot({ globals: { CUSTOMERS: [customer('C1', '重名'), customer('C2', '重名')], PROJECTS: [project('P1', '项目', '重名')], PROJECT_EXTRA: {} } });
  assert.deepEqual(api.snapshot().customers.map(c => c.projects.length), [0, 0]);
  c.PROJECT_EXTRA.P1 = { customerId: 'C2' };
  assert.deepEqual(api.snapshot().customers.map(c => c.projects.length), [0, 1]);
});

test('顶层项目包括尚未关联客户的可见项目；快照不写存储、不修改原业务状态', () => {
  const { api, c, storage } = boot({ globals: { PROJECTS: [project('P1', '项目一', '未建档客户')] } });
  const original = json({ projects: c.PROJECTS, opportunities: c.OPPS, orders: c.ORDERS, tasks: c.TODOS });
  const before = [...storage];
  const snap = api.snapshot(); assert.equal(snap.projects.length, 1); assert.equal(snap.projects[0].customerId, ''); assert.equal(snap.customers[0].projects.length, 0);
  assert.deepEqual([...storage], before);
  assert.deepEqual(json({ projects: c.PROJECTS, opportunities: c.OPPS, orders: c.ORDERS, tasks: c.TODOS }), original);
});

test('项目显式改关联客户后更新稳定映射，单纯客户改名保持原客户ID', () => {
  const { api, c } = boot({ globals: { CUSTOMERS: [customer('C1', '客户一'), customer('C2', '客户二')] } });
  assert.equal(api.snapshot().projects[0].customerId, 'C1');
  c.CUSTOMERS[0][1] = '新名称'; c.PROJECTS[0][7] = '新名称'; assert.equal(api.snapshot().projects[0].customerId, 'C1');
  c.PROJECTS[0][7] = '客户二'; assert.equal(api.snapshot().projects[0].customerId, 'C2');
});

test('项目汇总按全部商机计算，未知/进行中保持推进，只有所有商机终止/输单才结束', () => {
  const { api, c } = boot({ globals: { OPPS: [opp('O1', 'P1', '家具', '结束'), opp('O2', 'P1', '灯饰', '输单')] } });
  let p = api.snapshot().customers[0].projects[0];
  assert.equal(p.status, '已结束'); assert.equal(p.stageCounts['已结束'], 1); assert.equal(p.stageCounts['已输单'], 1);
  c.OPPS[1][2] = '进行中'; p = api.snapshot().customers[0].projects[0]; assert.equal(p.status, '推进中');
  c.OPPS[1][2] = '新业务状态'; p = api.snapshot().customers[0].projects[0];
  assert.equal(p.status, '推进中'); assert.equal(p.stageCounts['状态待核实'], 1);
  c.OPPS.splice(0); assert.equal(api.snapshot().customers[0].projects[0].status, '未建立商机');
  assert.equal(c.PROJECTS[0][4], '进行中');
});

test('只有实际销售订单计入成交，录单标志/虚拟单不冒充成交；未知状态不强行变成交', () => {
  const { api, c } = boot(); c.OPPS[0][12] = '已录单'; c.ORDERS.push(order('V1', 'P1', 'O1', '虚拟单'));
  let p = api.snapshot().customers[0].projects[0]; assert.equal(p.dealCount, 0); assert.equal(p.opportunities[0].stage, '待报价');
  c.ORDERS.push(order('S1', 'P1', 'O1')); p = api.snapshot().customers[0].projects[0];
  assert.equal(p.dealCount, 1); assert.equal(p.opportunities[0].stage, '已成交'); assert.equal(p.status, '全部成交');
  c.OPPS[0][2] = '未知'; assert.equal(api.snapshot().customers[0].projects[0].opportunities[0].stage, '状态待核实');
});

test('项目显示部分与全部成交，关闭输单商机不计成交也不阻塞剩余商机的整体进度', () => {
  const { api, c } = boot({ globals: { OPPS: [opp('O1', 'P1', '家具'), opp('O2', 'P1', '灯饰'), opp('O3', 'P1', '地板', '输单')] } });
  c.ORDERS.push(order('S1', 'P1', 'O1'));
  let p = api.snapshot().customers[0].projects[0]; assert.equal(p.status, '部分成交'); assert.equal(p.dealCount, 1); assert.equal(p.closedCount, 1);
  c.ORDERS.push(order('S2', 'P1', 'O2'));
  p = api.snapshot().customers[0].projects[0]; assert.equal(p.status, '全部成交'); assert.equal(p.dealCount, 2); assert.equal(p.stageCounts['已输单'], 1);
  c.OPPS[1][2] = '未知'; assert.equal(api.snapshot().customers[0].projects[0].status, '部分成交');
});

test('草稿通过真实商机关系派生阶段，不能把同品类另一加单的草稿混入原商机', () => {
  const { api, c } = boot({ globals: { OPPS: [opp('O1', 'P1'), opp('O2', 'P1')] } });
  c.DRAFTS.push(['D1']); c.DRAFT_DATA.D1 = { project: 'P1', todoId: 'T1' }; c.TODOS.push({ id: 'T1', opp: 'O2' });
  c.V3.meta.D1 = { project: 'P1', categories: ['家具'], revision: 1, confirmedCats: [], bindings: {} };
  let os = api.snapshot().customers[0].projects[0].opportunities;
  assert.equal(os[0].stage, '待报价'); assert.equal(os[1].stage, '已暂存');
  c.V3.meta.D1.submitted = {}; assert.equal(api.snapshot().customers[0].projects[0].opportunities[1].stage, '已提交');
  c.V3.meta.D1.confirmedCats = ['家具']; assert.equal(api.snapshot().customers[0].projects[0].opportunities[1].stage, '已确认');
  c.ORDERS.push(['Q1','SM','报价单','等待ERP回执']); c.ORDERS[0][15]='P1';c.ORDERS[0][17]='O2';c.ORDERS[0][18]={quoteCode:'D1',erpRequestedRevision:1};
  assert.equal(api.snapshot().customers[0].projects[0].opportunities[1].stage, '已确认');
  c.TODOS.splice(0); c.V3.meta.D1.bindings = {}; c.DRAFT_DATA.D1.todoId = '';
  assert.equal(api.snapshot().customers[0].projects[0].opportunities[0].stage, '待报价');
});

test('仅部分商机可見时不错误宣称项目全部结束，也不泄露隐藏商机', () => {
  const { api } = boot({ globals: { OPPS: [opp('O1', 'P1', '家具', '结束'), opp('O2', 'P1', '灯饰')], v21Data: () => ({ customers: [customer('C1', '客户一')], projects: [project('P1', '项目一', '客户一')], opps: [opp('O1', 'P1')] }) } });
  const p = api.snapshot().customers[0].projects[0]; assert.equal(p.status, '部分商机可见'); assert.equal(p.completeScope, false); assert.equal(p.opportunities.length, 1);
});

test('标签批量增删去重，资料和跟进重新打开保留，旧业务存储不受影响', () => {
  const { api, storage, c } = boot(); storage.set('crm-flow-v3', '原业务记录');
  assert.equal(api.action('saveTags', { customerIds: ['C1'], tagIds: ['tag-focus', 'tag-focus'], mode: 'add' }).ok, true);
  assert.equal(api.action('saveTags', { customerIds: ['C1'], tagIds: ['tag-price'], mode: 'add' }).ok, true);
  assert.equal(api.action('saveTags', { customerIds: ['C1'], tagIds: ['tag-focus'], mode: 'remove' }).ok, true);
  assert.equal(api.action('saveProfile', { customerId: 'C1', patch: { priority: '重点', focus: '交期', notes: '客户资料', nextAction: '回电' } }).ok, true);
  assert.equal(api.action('addFollowup', { customerId: 'C1', content: '客户要求月底到货', nextAction: '核实交期', nextAt: '2026-10-10', projectId: 'P1' }).ok, true);
  const reopened = boot({ storage }).api.snapshot().customers[0];
  assert.deepEqual(reopened.tags, ['tag-price']); assert.equal(reopened.priority, '重点'); assert.equal(reopened.nextAction, '核实交期'); assert.equal(reopened.followups.length, 1);
  assert.equal(storage.get('crm-flow-v3'), '原业务记录'); assert.equal(c.CUSTOMERS[0][14], '2026-10-01 09:00');
});

test('原负责人之外的客户只读，标签批量保存无部分成功；无效优先级不写入', () => {
  const { api } = boot({ globals: { CUSTOMERS: [customer('C1', '客户一'), customer('C2', '客户二', 'SM')] } });
  assert.equal(api.snapshot().customers[1].canManage, false);
  assert.equal(api.action('saveTags', { customerIds: ['C1', 'C2'], tagIds: ['tag-focus'], mode: 'add' }).ok, false);
  assert.deepEqual(api.snapshot().customers[0].tags, []);
  assert.equal(api.action('saveProfile', { customerId: 'C1', patch: { priority: 'A级' } }).ok, false);
});

test('重点和协调可取消，旧false字符串不会变成勾选，重新打开保持布尔值', () => {
  const storage = new Map([[KEY, JSON.stringify({ version: 100, profiles: { C1: { focus: 'false', coordination: 'false' } } })]]);
  const { api } = boot({ storage });
  assert.equal(api.snapshot().customers[0].focus, false); assert.equal(api.snapshot().customers[0].coordination, false);
  assert.equal(api.action('saveProfile', { customerId: 'C1', patch: { focus: true, coordination: true } }).ok, true);
  assert.equal(api.snapshot().customers[0].focus, true);
  assert.equal(api.action('saveProfile', { customerId: 'C1', patch: { focus: false, coordination: false } }).ok, true);
  const reopened = boot({ storage }).api.snapshot().customers[0];
  assert.equal(reopened.focus, false); assert.equal(reopened.coordination, false);
  assert.equal(JSON.parse(storage.get(KEY)).profiles.C1.focus, false);
});

test('其他页面较新记录不会被旧页画像或初始化关联覆盖，失败后重复保存仍阻止覆盖', () => {
  const { api, storage } = boot();
  const newer = JSON.parse(storage.get(KEY)); newer.profiles.C1 = { notes: '另一页面刚刚保存' };
  const raw = JSON.stringify(newer); storage.set(KEY, raw);
  for (let n = 0; n < 2; n++) {
    const result = api.action('saveProfile', { customerId: 'C1', patch: { notes: '旧页内容' } });
    assert.equal(result.ok, false); assert.match(result.error, /其他页面更新/); assert.equal(storage.get(KEY), raw);
  }
  const invalid = new Map([[KEY, '{broken']]);
  assert.equal(boot({ storage: invalid }).api.action('createTag', { name: '标签' }).ok, false); assert.equal(invalid.get(KEY), '{broken');
  const unsupported = new Map([[KEY, JSON.stringify({ version: 101, profiles: { C1: { notes: '新版记录' } } })]]), before = unsupported.get(KEY);
  assert.equal(boot({ storage: unsupported }).api.action('createTag', { name: '标签' }).ok, false); assert.equal(unsupported.get(KEY), before);
});

test('客户改名重开时旧项目名称关联仍可见，主管选看单人时不拓宽到其他客户', () => {
  const storage = new Map([[KEY, JSON.stringify({ version: 100, projectCustomers: { P1: 'C1' }, projectCustomerNames: { P1: '客户旧名称' } })]]);
  const clients = [customer('C1', '客户新名称', 'PM'), customer('C2', '另一客户', 'SM')];
  const projects = [project('P1', '我的客户项目', '客户旧名称', '其他PM'), project('P2', '另一客户项目', '另一客户', '其他PM')];
  const { api } = boot({ storage, globals: { CUSTOMERS: clients, PROJECTS: projects, v21Data: () => ({ owners: new Set(['PM']), customers: [clients[0]], projects: [], opps: [] }) } });
  assert.deepEqual(api.snapshot().projects.map(p => p.id), ['P1']); assert.equal(api.snapshot().customers[0].projects[0].id, 'P1');
});

test('线索需人工转换，校验重复候选，显式关联并保持重复转换幂等', () => {
  const { api, c } = boot(); const made = saveLead(api, { name: '客户一', phone: '+254700123456' });
  assert.equal(made.ok, true); assert.equal(c.CUSTOMERS.length, 1); assert.equal(c.TODOS.length, 0);
  assert.equal(api.action('convertLead', { id: made.id }).ok, false);
  const converted = api.action('convertLead', { id: made.id, customerId: 'C1' }); assert.equal(converted.ok, true); assert.equal(converted.id, 'C1');
  assert.equal(api.action('convertLead', { id: made.id, customerId: 'C1' }).ok, true); assert.equal(c.TODOS.length, 0); assert.equal(c.CUSTOMERS.length, 1);
  assert.equal(api.action('convertLead', { id: made.id, customerId: 'C2' }).ok, false);
  assert.equal(api.snapshot().customers[0].followups.length, 1);
});

test('线索关联已有客户不生成或改写客户待办，保留既有任务和历史信息', () => {
  const task = { id: 'T-EXISTING', type: '客户待办', status: '待处理', customer: '客户一', owner: '原负责人', initiator: '原发起人', title: '已约定下周核实空间资料', time: '2026-09-01 10:00', note: '已记录的重要说明' };
  const { api, c } = boot({ globals: { TODOS: [task] } });
  const crm = fs.readFileSync(new URL('../src/compat/runtime/crm.js', import.meta.url), 'utf8');
  const start = crm.indexOf('function ensureChainTodo('), end = crm.indexOf('function quoteCatOfTodo(', start);
  c.crmTodoEnabled = () => true;
  c.findPendingChain = (type, pred) => c.TODOS.find(t => t.type === type && t.status === '待处理' && pred(t));
  c.addChainTodo = () => { throw Error('不应创建新任务'); };
  vm.runInContext(crm.slice(start, end), c);
  const before = json(task), lead = saveLead(api);
  const result = api.action('convertLead', { id: lead.id, customerId: 'C1' });
  assert.equal(result.ok, true); assert.equal(result.todoId, undefined); assert.equal(c.TODOS.length, 1);
  assert.deepEqual(json(c.TODOS[0]), before);
  assert.equal(api.action('convertLead', { id: lead.id, customerId: 'C1' }).ok, true);
  assert.deepEqual(json(c.TODOS[0]), before);
});

test('新线索转客户保留负责人和需求跟进，不生成客户待办，刷新恢复转换关系', () => {
  const { api, c, storage } = boot(); const made = saveLead(api);
  const converted = api.action('convertLead', { id: made.id }); assert.equal(converted.ok, true);
  assert.equal(c.CUSTOMERS.length, 2); assert.equal(c.TODOS.length, 0);
  assert.equal(c.CUSTOMERS.find(row => row[0] === converted.id)[4], 'PM'); assert.ok(c.V69_CUSTOMERS[converted.id]);
  assert.equal(api.snapshot().customers.find(row => row.id === converted.id).followups[0].content, '采购家具');
  assert.equal(api.snapshot().leads[0].status, '已转客户');
  const reopened = boot({ storage, globals: { CUSTOMERS: c.CUSTOMERS, TODOS: c.TODOS } });
  assert.equal(reopened.api.action('convertLead', { id: made.id }).id, converted.id); assert.equal(reopened.c.TODOS.length, 0);
});

test('新客户转换校验基本资料与电话，同名既有客户只按明确ID关联，不复用歧义客户待办', () => {
  const { api, c } = boot({ globals: { CUSTOMERS: [customer('C1', '同名'), customer('C2', '同名')], TODOS: [{ id: '旧任务', type: '客户待办', status: '待处理', customer: '同名', owner: 'PM' }] } });
  let made = saveLead(api, { name: '电话不全', phone: 'x' }); assert.equal(api.action('convertLead', { id: made.id }).ok, false);
  made = saveLead(api, { name: '国家不全', country: '' }); assert.equal(api.action('convertLead', { id: made.id }).ok, false);
  made = saveLead(api, { name: '同名' }); const linked = api.action('convertLead', { id: made.id, customerId: 'C2' });
  assert.equal(linked.ok, true); assert.equal(linked.customerId, 'C2'); assert.equal(linked.todoId, undefined);
  assert.equal(c.TODOS.length, 1); assert.equal(c.TODOS[0].customerId, undefined); assert.equal(c.TODOS[0].id, '旧任务');
});

test('转客户保存失败恢复客户、待办、客户完整资料、线索及旧持久化键', () => {
  const { api, c, storage, fail } = boot(); const made = saveLead(api);
  storage.set('crm-flow-v3', '旧流程'); storage.set('crm-customer-rows-v69', '旧客户');
  const before = storage.get(KEY); fail('crm-flow-v3');
  assert.equal(api.action('convertLead', { id: made.id }).ok, false);
  assert.equal(c.CUSTOMERS.length, 1); assert.equal(c.TODOS.length, 0); assert.deepEqual(c.V69_CUSTOMERS, {});
  assert.equal(storage.get(KEY), before); assert.equal(storage.get('crm-flow-v3'), '旧流程'); assert.equal(storage.get('crm-customer-rows-v69'), '旧客户');
  assert.equal(api.snapshot().leads[0].status, '待核实');
  assert.equal(api.action('convertLead', { id: made.id }).ok, true);
});

test('真实v3Save源码包装链返回布尔值，实际wkWrite失败触发转客户回滚并可重试', () => {
  const workflow = fs.readFileSync(new URL('../src/compat/runtime/workflows.js', import.meta.url), 'utf8');
  const lines = workflow.split(/\r?\n/);
  const exact = prefix => {
    const line = lines.find(line => line.startsWith(prefix)); assert.ok(line, prefix); return line;
  };
  const { api, c, storage, fail } = boot();
  Object.assign(c, { PROJECT_FILES: {}, archiveEdits: {}, PROJECT_QUOTES: {}, PROJECT_DRAFT_CATS: {}, v72Collect() {} });
  const chain = [
    exact('function wkWrite('), exact('function wkPersistDrafts('), exact('function v3Save('),
    exact('const v68BaseSave='), exact("v3Save=function(){const projects="),
    exact('const v69Save='), exact("v3Save=function(){const saved=wkWrite('crm-customer-details-v69'"),
    exact('const v72BaseSave='), exact('v3Save=function(){const result=v72BaseSave();'),
  ].join('\n');
  vm.runInContext(chain, c);
  assert.equal(c.v3Save(), true);
  const made = saveLead(api), oldFlow = storage.get('crm-flow-v3');
  fail('crm-flow-v3'); const result = api.action('convertLead', { id: made.id });
  assert.equal(result.ok, false); assert.match(result.error, /保存失败/);
  assert.equal(c.CUSTOMERS.length, 1); assert.equal(c.TODOS.length, 0); assert.equal(storage.get('crm-flow-v3'), oldFlow);
  assert.equal(api.action('convertLead', { id: made.id }).ok, true); assert.equal(c.TODOS.length, 0);
});

test('一般保存失败保持原标签和表单数据，下一次保存可重试', () => {
  const { api, fail } = boot(); api.snapshot(); fail(KEY);
  assert.equal(api.action('saveTags', { customerIds: ['C1'], tagIds: ['tag-focus'], mode: 'replace' }).ok, false);
  assert.deepEqual(api.snapshot().customers[0].tags, []);
  assert.equal(api.action('saveTags', { customerIds: ['C1'], tagIds: ['tag-focus'], mode: 'replace' }).ok, true);
});

test('失效必须记录原因且不能转换；编辑核实后可恢复；普通用户不能分配他人', () => {
  const { api } = boot({ globals: { v21Manager: () => false, v21AllowedOwners: () => ['PM'] } }); const made = saveLead(api);
  assert.equal(api.action('invalidateLead', { id: made.id, reason: '' }).ok, false);
  assert.equal(api.action('invalidateLead', { id: made.id, reason: '重复线索' }).ok, true);
  assert.equal(api.action('convertLead', { id: made.id }).ok, false);
  assert.equal(api.action('saveLead', { id: made.id, need: '重新核实有效' }).ok, true);
  assert.equal(api.snapshot().leads[0].status, '待核实');
  assert.equal(api.action('assignLead', { id: made.id, owner: 'PM' }).ok, false);
  assert.equal(api.action('saveLead', { id: made.id, owner: '其他人' }).ok, false);
});

function legacyCustomerAction(extra = {}) {
  const crm = fs.readFileSync(new URL('../src/compat/runtime/crm.js', import.meta.url), 'utf8');
  const start = crm.indexOf("  if(a==='saveCustomer'){");
  const end = crm.indexOf("  if(a==='confirmCreate'){", start);
  assert.ok(start >= 0 && end > start);
  const calls = [], validations = [];
  const c = { CUSTOMERS: [], PROJECTS: [], TODOS: [], wizardEdit: '', viewCustomer: '',
    wizardState: { customer: { customerName: '新客户', phone: '+12025550199', country: '美国', owner: 'PM' } },
    toast: message => calls.push(['toast', message]), clearWizBody: () => calls.push(['clear']),
    $: selector => ({ classList: { remove: () => calls.push(['close', selector]) } }),
    openPage: page => calls.push(['page', page]), ...extra };
  c.validateCustomer = () => {
    validations.push(c.wizardEdit);
    return !c.CUSTOMERS.some(row => row[10] === c.wizardState.customer.phone && !(c.wizardEdit === 'customer' && row[1] === c.viewCustomer));
  };
  c.ensureCustomerRecord = extra.ensureCustomerRecord || (data => {
    let row = c.CUSTOMERS.find(row => row[1] === data.customerName);
    if (!row) { row = customer('C1', data.customerName, data.owner); row[10] = data.phone; c.CUSTOMERS.push(row); }
    return row;
  });
  c.ensureChainTodo = (type, pred, data) => {
    let task = c.TODOS.find(t => t.type === type && t.status === '待处理' && pred(t));
    if (!task) { task = { id: `T${c.TODOS.length + 1}`, status: '待处理', type, ...data }; c.TODOS.unshift(task); }
    return task;
  };
  vm.createContext(c); vm.runInContext(`function invoke(){const a='saveCustomer';${crm.slice(start, end)}}`, c);
  return { c, calls, validations };
}

test('旧创建客户入口待办保存失败保留模态和输入，重试排除自身重复且不重复建客户/任务', () => {
  let attempts = 0, persisted;
  const { c, calls, validations } = legacyCustomerAction({ v3Save: () => ++attempts > 1 });
  c.invoke();
  assert.equal(c.CUSTOMERS.length, 1); assert.equal(c.TODOS.length, 1); assert.equal(c.TODOS[0].customerId, 'C1');
  assert.equal(c.wizardState.customer.customerName, '新客户'); assert.equal(c.wizardState.customerTodoRetryId, 'C1');
  assert.equal(calls.some(([kind]) => kind === 'close' || kind === 'clear' || kind === 'page'), false);
  assert.equal(calls.at(-1)[1], '客户资料已保存，但待办保存失败，请重试');
  c.v3Save = () => { persisted = json(c.TODOS); return true; };
  c.invoke();
  assert.equal(c.CUSTOMERS.length, 1); assert.equal(c.TODOS.length, 1); assert.equal(persisted[0].customerId, 'C1');
  assert.deepEqual(validations, ['', 'customer']); assert.equal(c.wizardEdit, '');
  assert.equal(c.wizardState.customerTodoRetryId, undefined); assert.deepEqual(calls.at(-1), ['page', 'customers']);
  assert.equal(calls.filter(([kind, message]) => kind === 'toast' && message === '客户已保存，已生成客户待办').length, 1);
});

test('旧创建入口相同名字的未知归属待办不误复用，明确ID的原任务可幂等复用', () => {
  const clients = [customer('C1', '同名'), customer('C2', '同名')]; clients[1][10] = '+19999999999';
  const original = { id: 'old', type: '客户待办', status: '待处理', customer: '同名', owner: 'PM' };
  const { c } = legacyCustomerAction({ CUSTOMERS: clients, TODOS: [original], ensureCustomerRecord: () => clients[1], v3Save: () => true });
  c.validateCustomer = () => true;
  c.invoke(); assert.equal(c.TODOS.length, 2); assert.equal(c.TODOS[0].customerId, 'C2'); assert.equal(original.customerId, undefined);
  c.invoke(); assert.equal(c.TODOS.length, 2); assert.equal(c.TODOS[0].customerId, 'C2');
});

test('客户抽屉基础资料读取既有完整字段，局部保存不丢联系人、附件、公司扩展资料和负责人', () => {
  const full = { customerName: '客户一', email: 'before@example.test', wechat: 'customer-wx', companyName: '旧公司', companyAddress: '旧地址', companySite: 'https://example.test', companyPhone: '+254700111111', extraContacts: [{ relation: '设计师', contact: 'designer@example.test' }], attachments: [{ id: 'attachment-1', name: '需求.pdf' }], commissionRate: '12', photographer: '摄影师', owner: 'PM', bizDept: '销售', arbitraryExtension: { keep: true } };
  const { api, c, storage } = boot({ globals: { V69_CUSTOMERS: { C1: json(full) } } });
  const originalRow = json(c.CUSTOMERS[0]);
  const current = api.snapshot().customers[0];
  assert.equal(current.email, full.email); assert.equal(current.wechat, full.wechat); assert.equal(current.companyName, full.companyName); assert.equal(current.companyAddress, full.companyAddress);
  const result = api.action('saveCustomerBasics', { customerId: 'C1', patch: { email: 'after@example.test', wechat: '', companyName: '新公司', companyAddress: '新地址' } });
  assert.equal(result.ok, true);
  assert.deepEqual(json(c.CUSTOMERS[0]), originalRow);
  assert.deepEqual(json(c.V69_CUSTOMERS.C1), { ...full, email: 'after@example.test', wechat: '', companyName: '新公司', companyAddress: '新地址' });
  assert.equal(JSON.parse(storage.get('crm-customer-details-v69')).C1.email, 'after@example.test');
  assert.equal(api.snapshot().customers[0].companyAddress, '新地址');
});

test('基础资料沿用既有客户映射补齐扩展字段，修改后源列表和完整资料一致', () => {
  const { api, c } = boot({ globals: { customerRecordToWizard: row => ({ customerName: row[1], phone: row[10], country: row[9], customerIdentity: row[11], sourceChannel: row[5], email: 'mapped@example.test', wechat: 'mapped-wx', companyName: '映射公司', companyAddress: '映射地址', extraContacts: [{ contact: '保留' }] }) } });
  assert.equal(api.snapshot().customers[0].email, 'mapped@example.test');
  const result = api.action('saveCustomerBasics', { customerId: 'C1', patch: { name: '新客户名称', country: '美国(United States)', phone: '+1 202 555 0188', identity: '设计师', source: '展会' } });
  assert.equal(result.ok, true);
  assert.equal(c.CUSTOMERS[0][1], '新客户名称'); assert.equal(c.CUSTOMERS[0][9], '美国'); assert.equal(c.CUSTOMERS[0][10], '+1 202 555 0188'); assert.equal(c.CUSTOMERS[0][11], '设计师'); assert.equal(c.CUSTOMERS[0][5], '展会');
  assert.equal(c.V69_CUSTOMERS.C1.country, '美国(United States)'); assert.equal(c.V69_CUSTOMERS.C1.email, 'mapped@example.test'); assert.equal(c.V69_CUSTOMERS.C1.extraContacts[0].contact, '保留');
});

test('同名客户改名只同步明确ID关联的项目商机待办，不借名字修改歧义记录', () => {
  const customers = [customer('C1', '同名'), customer('C2', '同名')];
  const projects = [project('P1', '项目一', '同名'), project('P2', '项目二', '同名'), project('P3', '未明确归属', '同名')];
  const opportunities = [opp('O1', 'P1'), opp('O2', 'P2'), opp('O3', 'P3')]; opportunities.forEach(item => item[6] = '同名');
  const tasks = [
    { id: 'T1', customerId: 'C1', customer: '同名' },
    { id: 'T2', customerId: 'C2', customer: '同名', initiator: '原发起人', status: '已驳回', rejectReason: '原原因' },
    { id: 'T3', project: 'P2', customer: '同名' },
    { id: 'T4', opp: 'O2', customer: '同名' },
    { id: 'T5', customer: '同名' },
    { id: 'T6', project: 'P2', customerId: 'C1', customer: '同名' },
  ];
  const { api, c } = boot({ globals: { CUSTOMERS: customers, PROJECTS: projects, OPPS: opportunities, TODOS: tasks, PROJECT_EXTRA: { P1: { customerId: 'C1' }, P2: { customerId: 'C2', formData: { customerPick: '同名', purchaseCategory: ['家具'] } } } } });
  assert.equal(api.action('saveCustomerBasics', { customerId: 'C2', patch: { name: '客户二新名称' } }).ok, true);
  assert.deepEqual(c.PROJECTS.map(p => p[7]), ['同名', '客户二新名称', '同名']);
  assert.deepEqual(c.OPPS.map(o => o[6]), ['同名', '客户二新名称', '同名']);
  assert.deepEqual(c.TODOS.map(t => t.customer), ['同名', '客户二新名称', '客户二新名称', '客户二新名称', '同名', '同名']);
  assert.equal(c.TODOS[1].initiator, '原发起人'); assert.equal(c.TODOS[1].status, '已驳回'); assert.equal(c.TODOS[1].rejectReason, '原原因');
  assert.equal(c.PROJECT_EXTRA.P2.formData.customerPick, '客户二新名称'); assert.deepEqual(c.PROJECT_EXTRA.P2.formData.purchaseCategory, ['家具']);
  assert.equal(c.PROJECT_EXTRA.P2.v68Managed, undefined);
});

test('唯一旧名称的历史待办可同步，外部明确归属优先；旧项目重开恢复名称且不改变业务标志', () => {
  const { api, c, storage } = boot({ globals: { TODOS: [{ id: 'legacy', customer: '客户一', status: '已处理' }, { id: 'foreign', customerId: 'C-other', customer: '客户一' }] } });
  const originalProject = json(c.PROJECTS[0]);
  assert.equal(api.action('saveCustomerBasics', { customerId: 'C1', patch: { name: '客户新名称' } }).ok, true);
  assert.equal(c.TODOS[0].customer, '客户新名称'); assert.equal(c.TODOS[0].customerId, 'C1'); assert.equal(c.TODOS[1].customer, '客户一');
  assert.equal(c.OPPS[0][6], '客户新名称');
  const reopened = boot({ storage, globals: { CUSTOMERS: json(c.CUSTOMERS), PROJECTS: [originalProject], PROJECT_EXTRA: { P1: { level: 'B' } }, OPPS: json(c.OPPS) } });
  assert.equal(reopened.c.PROJECTS[0][7], '客户新名称'); assert.equal(reopened.c.PROJECTS[0][4], originalProject[4]); assert.equal(reopened.c.PROJECT_EXTRA.P1.v68Managed, undefined);
  assert.equal(reopened.api.snapshot().customers[0].projects[0].id, 'P1');
});

test('基础资料维护校验权限、必填与联系方式，拒绝负责人或部门旁路修改', () => {
  const { api, c } = boot({ globals: { CUSTOMERS: [customer('C1', '客户一'), customer('C2', '客户二', 'SM')] } });
  const original = json(c.CUSTOMERS);
  for (const payload of [
    { customerId: 'C2', patch: { name: '越权' } },
    { customerId: 'C1', patch: { owner: 'SM' } },
    { customerId: 'C1', patch: { department: '其他部门' } },
    { customerId: 'C1', patch: { name: '' } },
    { customerId: 'C1', patch: { country: '' } },
    { customerId: 'C1', patch: { phone: 'not-a-phone' } },
    { customerId: 'C1', patch: { email: 'not-an-email' } },
  ]) assert.equal(api.action('saveCustomerBasics', payload).ok, false);
  assert.deepEqual(json(c.CUSTOMERS), original); assert.deepEqual(c.V69_CUSTOMERS, {});
});

test('基础资料跨存储保存失败完整回滚名称、完整资料、关联记录及持久化，并允许重试', () => {
  const keys = ['crm-flow-v3', 'crm-customer-rows-v69', 'crm-customer-details-v69', 'crm-projects-v68'];
  for (const failedKey of keys) {
    const storage = new Map(keys.map(key => [key, JSON.stringify({ original: key })]));
    const full = { email: 'original@example.test', extraContacts: [{ contact: '保留联系人' }] };
    const { api, c, fail } = boot({ storage, globals: { V69_CUSTOMERS: { C1: full }, TODOS: [{ id: 'T1', customerId: 'C1', customer: '客户一' }] } });
    const saveBase = c.v3Save;
    // Include the real project's save destination in this fixture.
    c.v3Save = () => { c.localStorage.setItem('crm-projects-v68', JSON.stringify(c.PROJECTS)); return saveBase(); };
    const beforeStorage = new Map(storage), before = json({ customers: c.CUSTOMERS, projects: c.PROJECTS, opps: c.OPPS, tasks: c.TODOS, details: c.V69_CUSTOMERS, extra: c.PROJECT_EXTRA });
    fail(failedKey);
    const result = api.action('saveCustomerBasics', { customerId: 'C1', patch: { name: '未保存改名', email: 'changed@example.test' } });
    assert.equal(result.ok, false, failedKey);
    assert.deepEqual(json({ customers: c.CUSTOMERS, projects: c.PROJECTS, opps: c.OPPS, tasks: c.TODOS, details: c.V69_CUSTOMERS, extra: c.PROJECT_EXTRA }), before, failedKey);
    assert.deepEqual(storage, beforeStorage, failedKey);
    assert.equal(api.action('saveCustomerBasics', { customerId: 'C1', patch: { name: '成功改名' } }).ok, true, failedKey);
  }
});

test('基础资料拒绝过期页面覆盖其他页面业务记录，同页既有业务保存后仍可维护', () => {
  for (const key of [KEY, 'crm-flow-v3', 'crm-customer-rows-v69', 'crm-customer-details-v69', 'crm-projects-v68']) {
    const { api, c, storage } = boot();
    const before = json({ customers: c.CUSTOMERS, projects: c.PROJECTS, opps: c.OPPS });
    const newer = JSON.stringify(key === KEY ? { ...JSON.parse(storage.get(KEY)), newer: true } : { newer: true }); storage.set(key, newer);
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = api.action('saveCustomerBasics', { customerId: 'C1', patch: { name: '过期页面修改' } });
      assert.equal(result.ok, false, key); assert.match(result.error, /其他页面更新/); assert.equal(storage.get(key), newer);
    }
    assert.deepEqual(json({ customers: c.CUSTOMERS, projects: c.PROJECTS, opps: c.OPPS }), before);
  }
  const { api, c } = boot();
  assert.equal(c.v3Save(), true);
  assert.equal(api.action('saveCustomerBasics', { customerId: 'C1', patch: { companyName: '同页业务保存后修改' } }).ok, true);
  const corrupt = boot({ storage: new Map([['crm-flow-v3', 'broken-json']]) });
  assert.equal(corrupt.api.action('saveCustomerBasics', { customerId: 'C1', patch: { name: '不应覆盖' } }).ok, false);
  assert.equal(corrupt.storage.get('crm-flow-v3'), 'broken-json');
});
