import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isCurrentTask, isCurrentNotification, TASK_GROUPS } from '../src/features/todos/model.js';

const source = fs.readFileSync(new URL('../src/compat/runtime/opportunityQuotes.js', import.meta.url), 'utf8');
const business = fs.readFileSync(new URL('../src/compat/runtime/businessSync.js', import.meta.url), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), end ? source.indexOf(end, source.indexOf(start)) : undefined);
const copy = x => JSON.parse(JSON.stringify(x));
function setup() {
  const c = {
    PROJECTS:[['P','项目','','','','北美','','客户','','PM']],PROJECT_EXTRA: { P: { formData: { designType: '采购方案设计', spaceCats: [{name:'客厅',cats:['家具']}] } } },
    OPPS: [['O', '家具商机', '进行中', '家具', 'P', '北美', '客户', 'SM'], ['A', '家具加单', '进行中', '家具', 'P', '北美', '客户', 'SM',,,,,,,,,,,,, {isAddon:true,selectedSpaces:['客厅']}]],
    ORDERS: [['SO',,,,,,,,,,,,,,,,, 'O', {quoteCode:'Q'}], ['ADD',,,,,,,,,,,,,,,,, 'A', {quoteCode:'AQ'}]],
    DRAFT_DATA: { Q: {oppId:'O',project:'P'}, AQ: {oppId:'A',project:'P'} }, V3: {meta:{Q:{},AQ:{}}}, TODOS: [],
    V72: {messages:[]}, V72_TYPES: {'订单待办':'sm','报价待办':'sm'},
    V72_DEMOS: [['sm','客户已确认报价，请衔接订单','已确认','旧说明','订单待办','todo']],
    oqDesignType:value=>value||'暂无',crmTodoEnabled: value => !['收款待办','备货待办'].includes(typeof value==='string'?value:value?.type),
    v3Copy:copy,v3Stamp:()=> '2026-10-10 15:00',oqLockReason:()=>'',toast:message=>c.lastToast=message,
    oqOpp:id=>c.OPPS.find(o=>o[0]===id),oqOrder:code=>c.ORDERS.find(o=>o[18]?.quoteCode===code),oqQuoteOpp:code=>c.OPPS.find(o=>o[0]===c.DRAFT_DATA[code]?.oppId),
    oqEnsureTodo:opp=>{let task=c.TODOS.find(t=>t.type==='报价待办'&&t.opp===opp[0]&&t.status!=='已取消');if(!task){task={id:'CURRENT-'+opp[0],type:'报价待办',opp:opp[0],project:opp[4],cat:opp[3],owner:opp[7],status:'待处理'};c.TODOS.push(task);}return task;},
    v21Rows:()=>c.TODOS,v21FlowAllowed:t=>t.owner===c.actor,v21CanOperate:t=>t.owner===c.actor,v75SearchTask:t=>c.destination=t.id,
    v72Go:id=>c.oldDestination=id,v73TextCard:m=>({title:m.title,description:m.body,btntxt:m.target==='todo'?'查看待办':'查看报价'}),
    v72NotificationEvents:(before,after)=>{c.snapshot=after;return c.testEvents||[];},
  };
  vm.createContext(c);
  vm.runInContext(section('const OQ_RETIRED_TODO_TYPES', '\ndw132Type'),c);
  vm.runInContext(section('function oqTaskQuoteCode(', 'v125DraftLocked ='),c);
  vm.runInContext(section('function oqMigrateActiveTodos()', '\ntry{if(typeof localStorage'),c);
  vm.runInContext(section('// The task-center source'),c);
  return c;
}
test('当前待办中心及分类不含旧类型，但历史记录仍保留',()=>{
  const c=setup(),obsolete=['客户待办','创建项目待办','草稿报价待办','订单待办','设计单','设计订单待办'];
  c.TODOS.push(...obsolete.map((type,i)=>({id:'OLD-'+i,type,status:'已处理'})),{id:'VALID',type:'项目待办',status:'待处理'},{id:'REVIEW',type:'设计确认待办',project:'P',status:'待处理'});
  assert.deepEqual(Array.from(c.v21Rows(),t=>t.id),['VALID','REVIEW']);
  assert.equal(c.TODOS.length,8);
  for(const type of obsolete){assert.equal(isCurrentTask({type}),false);assert.equal(c.crmTodoEnabled(type),false);assert.equal(TASK_GROUPS.some(([,types])=>types.includes(type)),false);}
  assert.equal(c.crmTodoEnabled('收款待办'),false);assert.equal(c.crmTodoEnabled('备货待办'),false);
});
test('旧未完成订单步骤退休，报价待办只按唯一商机/报价关联迁移，不按相同品类误关联',()=>{
  const c=setup();
  c.TODOS.push({id:'OLD',type:'订单待办',project:'P',opp:'O',draft:'Q',status:'待处理'},
    {id:'DONE',type:'订单待办',project:'P',status:'已处理',order:'KEEP',approveTime:'2026-09-01'},
    {id:'QUOTE',type:'草稿报价待办',project:'P',draft:'Q',status:'待处理'},
    {id:'ORPHAN',type:'报价待办',project:'P',cat:'家具',status:'待处理'});
  const history=copy(c.TODOS[1]);c.oqMigrateActiveTodos();
  assert.equal(c.TODOS[0].status,'已取消');assert.equal(c.TODOS[0].retiredSnapshot135.status,'待处理');
  assert.equal(c.TODOS[1].approveTime,history.approveTime);assert.equal(c.TODOS[1].order,'KEEP');assert.equal(c.TODOS[1].status,'已处理');
  assert.equal(c.TODOS[2].type,'报价待办');assert.equal(c.TODOS[2].opp,'O');assert.equal(c.TODOS[2].legacyType135,'草稿报价待办');
  assert.equal(c.TODOS[3].status,'已取消');assert.equal(c.TODOS[3].opp,undefined);
  assert.equal(c.TODOS.filter(t=>t.type==='报价待办'&&t.opp==='O'&&c.crmTodoEnabled(t)).length,1);
  const count=c.TODOS.length;c.oqMigrateActiveTodos();assert.equal(c.TODOS.length,count);assert.equal(c.ORDERS[0][0],'SO');
});
test('客户确认通知指向同商机报价待办，不混入同品类加单，保留历史通知原内容',()=>{
  const c=setup();c.TODOS.push({id:'ORIGINAL',type:'报价待办',project:'P',opp:'O',cat:'家具',draft:'Q',owner:'SM',status:'待处理'},
    {id:'ADDON',type:'报价待办',project:'P',opp:'A',cat:'家具',draft:'AQ',owner:'SM',status:'待处理'},
    {id:'OLD',type:'订单待办',project:'P',opp:'O',draft:'Q',status:'已取消'});
  const message={id:'NOTICE',event:'quote-confirmed',title:'客户已确认品类报价',type:'订单待办',task:'OLD',project:'P',category:'家具',quote:'Q',revision:3,body:'旧绑定说明',target:'todo'};
  c.V72.messages.push(message);c.actor='SM';c.v72Go('NOTICE');assert.equal(c.destination,'ORIGINAL');assert.equal(c.oldDestination,undefined);
  assert.equal(message.body,'旧绑定说明');assert.equal(message.revision,3);
  const card=c.v73TextCard(message);assert.equal(card.btntxt,'查看报价待办');assert.ok(card.description.includes('对应报价'));assert.ok(!card.description.includes('绑定'));
  c.actor='OTHER';c.destination='';c.v72Go('NOTICE');assert.equal(c.destination,'');assert.match(c.lastToast,/无权/);
  assert.equal(isCurrentNotification(message),true);assert.equal(isCurrentNotification({type:'订单待办',title:'旧订单待办已到达'}),false);
});
test('新通知事件不再包含废弃任务，客户确认不产生订单待办',()=>{
  const c=setup();c.TODOS.push({id:'QUOTE',type:'报价待办',project:'P',opp:'O',draft:'Q',cat:'家具',status:'待处理'});
  c.testEvents=[{event:'quote-confirmed',title:'客户已确认品类报价',project:'P',quote:'Q',category:'家具',target:'quote'},{event:'todo-arrived',type:'订单待办',title:'订单待办已到达'}];
  const events=c.v72NotificationEvents({todos:{},quotes:{}},{todos:{OLD:{type:'订单待办'},CURRENT:c.TODOS[0]},quotes:{}});
  assert.equal(events.length,1);assert.equal(events[0].task,'QUOTE');assert.equal(events[0].target,'todo');assert.equal(events[0].type,'报价待办');
  assert.deepEqual(Object.keys(c.snapshot.todos),['CURRENT']);assert.equal(c.TODOS.length,1);assert.equal(c.V72_TYPES['订单待办'],undefined);assert.equal(c.V72_TYPES['设计确认待办'],'pm');
  assert.equal(c.V72_DEMOS[0][4],'报价待办');assert.equal(c.V72_DEMOS[0][5],'todo');
});
test('可见通知样例采用已建项目设计流程，历史原文不被改写',()=>{
 const c=setup(),message={sample:true,title:'设计需求已完成',body:'已交接 PM 创建项目',type:'设计待办'};
 const card=c.v73TextCard(message);assert.match(card.title,/PM 确认/);assert.match(card.description,/同步到项目信息/);assert.equal(message.body,'已交接 PM 创建项目');
 assert.doesNotMatch(c.v73TextCard({sample:true,title:'新的独立设计需求'}).description,/生成独立项目/);
 assert.doesNotMatch(c.v73TextCard({sample:true,title:'报价待办已到达'}).description,/全部相关空间/);
 const real={sample:false,title:'设计需求已完成',body:'原始业务记录'};assert.equal(c.v73TextCard(real).description,'原始业务记录');
});
test('客户确认样例已完成报价待办，重复打开不重建且不触发 ERP',()=>{
 const c=setup(),project='PJ-NOTICE-DEMO';c.PROJECTS.push([project,'演示项目']);c.PROJECT_EXTRA[project]={formData:{designType:'暂无',spaceCats:[]}};
 c.OPPS.push(['DEMO','本地商机','进行中','家具',project,'北美','演示客户','SM']);
 const message={id:'SAMPLE',sample:true,title:'客户已确认报价，请确认传输',type:'报价待办',target:'todo',project,task:'DEMO-TODO'};
 const task={id:'DEMO-TODO',type:'报价待办',notificationSample:true,project,opp:'DEMO',cat:'家具',owner:'SM',status:'待处理',customer:'演示客户',sourceMessage:message};c.TODOS.push(task);c.V72.messages.push(message);
 c.bs131Atomic=fn=>fn();c.v3Meta=code=>c.V3.meta[code]||={};c.v3FromQuote=()=>({spaces:[{name:'客厅',products:[{name:'样例沙发',cat:'家具',sku:'LOCAL',qty:1,price:2000,amt:2000}]}]});
 c.upsertDraftFromPims=input=>{c.DRAFT_DATA.DEMOQUOTE={...copy(input),draftCode:'DEMOQUOTE'};return 'DEMOQUOTE';};
 c.oqNewOrder=(opp,code)=>{const row=Array(19).fill('');row[0]='LOCAL-ORDER';row[15]=opp[4];row[17]=opp[0];row[18]={quoteCode:code,erpState:''};c.ORDERS.push(row);return row;};
 c.oqStorePublishedVersion=(code,data)=>Object.assign(c.v3Meta(code),{categories:['家具'],revision:1,submitted:copy(data),currentQuoteVersion:code+':1',quoteVersions:[{id:code+':1',revision:1}]});
 c.v3RebuildDraftQuotes=()=>{};c.oqQueueERP=()=>assert.fail('本地确认样例不能发起 ERP 请求');
 c.oqCanQuote=()=>true;c.todoActs=()=>[];c.esc=x=>String(x);c.actor='SM';
 vm.runInContext(section('function oqStatus(', '\nv3Status ='),c);vm.runInContext(section('const oqActsBase=todoActs;', '\nconst oqRowsBase=orderRowsHtml;'),c);
 c.v72Go('SAMPLE');assert.equal(c.destination,'DEMO-TODO');assert.equal(c.oqStatus('DEMOQUOTE'),'已确认');assert.equal(task.status,'已处理');
 assert.deepEqual(Array.from(c.todoActs(task),a=>a.t),['查看商机','查看流程图']);
 assert.equal(c.DRAFT_DATA.DEMOQUOTE.oppId,'DEMO');assert.equal(c.V3.meta.DEMOQUOTE.quoteVersions[0].confirmations[0].by,'演示客户（客户）');
 const original=copy(c.DRAFT_DATA.Q),seeded=copy(c.DRAFT_DATA.DEMOQUOTE),count=c.ORDERS.length;c.v72Go('SAMPLE');assert.equal(c.ORDERS.length,count);assert.deepEqual(copy(c.DRAFT_DATA.DEMOQUOTE),seeded);assert.deepEqual(copy(c.DRAFT_DATA.Q),original);
 assert.equal(c.ORDERS.at(-1)[18].erpState,'');
});
test('旧客户阶段设计任务不进入当前待办，新设计样例在独立已建项目中办理',()=>{
 const c=setup();assert.equal(c.crmTodoEnabled({type:'设计待办',project:'-'}),false);assert.equal(isCurrentTask({type:'设计待办',project:'-'}),false);
 c.V72_ROLES={pm:{person:'PM'}};c.V75={records:[],dirty:false};c.PROJECT_QUOTES={};c.todoStamp=()=> '2026-10-10';c.v75PrepareBusiness=task=>task;
 c.addChainTodo=fields=>{c.TODOS.push(copy(fields));return c.TODOS.at(-1);};
 vm.runInContext(section("if(typeof v75PrepareBusiness==='function'){", "if(typeof v72Go==='function'){"),c);
 const task={id:'DESIGN',type:'设计待办',project:'-',owner:'设计甲',initiator:'业务员',customer:'演示客户',status:'待处理',notificationSample:true,needInfo:{attachments:[{name:'客户CAD'}]}};c.TODOS.push(task);
 const result=c.v75PrepareBusiness(task);assert.ok(c.PROJECTS.some(p=>p[0]===result.project));assert.equal(c.crmTodoEnabled(result),true);
 assert.equal(c.PROJECT_EXTRA[result.project].formData.designType,'暂无');assert.equal(c.PROJECT_EXTRA[result.project].pendingDesign.contents.designType,'采购方案设计');
 assert.equal(result.needInfo.attachments[0].name,'客户CAD');assert.equal(result.legacySampleContext135.project,'-');assert.equal(result.initiator,'业务员');
 const count=c.TODOS.length;c.v75PrepareBusiness(result);assert.equal(c.TODOS.length,count);assert.equal(c.TODOS.some(t=>t.type==='创建项目待办'),false);
 const historical={...task,id:'HISTORY',status:'已处理',project:'-',approveTime:'旧时间'};assert.equal(c.v75PrepareBusiness(historical).project,'-');assert.equal(historical.approveTime,'旧时间');
});
test('不按空间报价的产品商机可以创建唯一报价，采购方案设计仍需对应空间',()=>{
  const c=setup();vm.runInContext(section('function oqCreateQuote(', '\nfunction oqValidateInput('),c);
  c.oqCanQuote=()=>true;c.bs131Atomic=fn=>fn();c.v125ProjectSpaces=p=>c.PROJECT_EXTRA[p].formData.spaceCats;c.v3Meta=code=>c.V3.meta[code]||={};
  c.upsertDraftFromPims=data=>{c.created=copy(data);c.DRAFT_DATA.NEW=copy(data);return 'NEW';};c.oqNewOrder=(opp,code)=>c.ORDERS.push(['NEW',,,,,,,,,,,,,,,,,opp[0],{quoteCode:code}]);
  delete c.DRAFT_DATA.Q;c.ORDERS.splice(0,1);c.PROJECT_EXTRA.P.formData.designType='暂无';c.PROJECT_EXTRA.P.formData.spaceCats=[];
  assert.equal(c.oqCreateQuote('O'),'NEW');assert.equal(c.created.requiresSpaces,false);assert.equal(c.created.spaces[0].name,'不分空间');assert.deepEqual(c.PROJECT_EXTRA.P.formData.spaceCats,[]);
  assert.throws(()=>c.oqCreateQuote('O'),/不允许重复创建/);
  delete c.DRAFT_DATA.NEW;c.ORDERS=c.ORDERS.filter(o=>o[18]?.quoteCode!=='NEW');c.PROJECT_EXTRA.P.formData.designType='采购方案设计';
  assert.throws(()=>c.oqCreateQuote('O'),/采购空间/);
});
test('不按空间的加单独立归属新商机，无空间前置检查，保留原订单和报价',()=>{
 const c=setup();c.PROJECT_EXTRA.P.formData.designType='独立设计服务';c.PROJECT_EXTRA.P.formData.spaceCats=[];
 c.stocked=true;c.permitted=true;c.bs131AddonOrder=()=>c.stocked?c.ORDERS[0]:null;c.bs131CanMaintain=()=>c.permitted;c.v21CanOperate=()=>c.permitted;c.bs131Atomic=fn=>fn();
 c.quoteSmOf=()=> 'SM';c.projectPmOf=()=> 'PM';c.findProject=()=> ['P','原项目'];c.todoStamp=()=> '2026-10-10 15:00';c.v17Owner=()=> 'PM';c.v125ProjectSpaces=()=>[];
 c.addChainTodo=fields=>{const t={id:'NEW-TODO',status:'待处理',...copy(fields)};c.TODOS.push(t);return t;};
 c.upsertDraftFromPims=data=>{c.DRAFT_DATA.ADDQUOTE=copy(data);c.V3.meta.ADDQUOTE={};return 'ADDQUOTE';};c.v3LinkDraftTodo=()=>{};
 vm.runInContext(business.slice(business.indexOf('function bs131CreateAddon('),business.indexOf('function bs131OpenAddon(')),c);
 const order=copy(c.ORDERS[0]),oldQuote=copy(c.DRAFT_DATA.Q);
 const addon=c.bs131CreateAddon('O',[],'NONSPACE');
 assert.equal(addon[20].requiresSpaces,false);assert.equal(addon[20].sourceOrderId,'SO');assert.deepEqual([...addon[20].selectedSpaces],[]);
 assert.equal(c.DRAFT_DATA.ADDQUOTE.spaces[0].name,'不分空间');assert.equal(c.DRAFT_DATA.ADDQUOTE.oppId,addon[0]);assert.equal(c.TODOS.at(-1).opp,addon[0]);
 assert.deepEqual(copy(c.ORDERS[0]),order);assert.deepEqual(copy(c.DRAFT_DATA.Q),oldQuote);
 assert.equal(c.bs131CreateAddon('O',[],'NONSPACE')[0],addon[0]);assert.equal(c.TODOS.length,1);
 c.permitted=false;assert.throws(()=>c.bs131CreateAddon('O',[],'DENIED'),/无权/);c.permitted=true;c.stocked=false;const early=c.bs131CreateAddon('O',[],'EARLY');assert.equal(early[20].sourceOppId,'O');
 c.stocked=true;c.PROJECT_EXTRA.P.formData.designType='采购方案设计';assert.throws(()=>c.bs131CreateAddon('O',[],'SPATIAL'),/加单空间/);
});


