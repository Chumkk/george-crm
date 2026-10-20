import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=name=>fs.readFileSync(new URL('../src/compat/runtime/'+name,import.meta.url),'utf8');
const management=read('managementWorkflow.js'),crm=read('crm.js'),opportunity=read('opportunityQuotes.js');
const section=(text,start,end)=>text.slice(text.indexOf(start),text.indexOf(end,text.indexOf(start)));
function setup(kind='product'){
 const opp=Array(21).fill('-');opp[0]='BU';opp[1]='住宅项目-家具';opp[2]='进行中';opp[3]=kind==='design'?'设计服务':'家具';opp[4]='P';opp[7]='负责人';opp[20]={kind};
 const c={actor:'负责人',OPPS:[opp],ORDERS:[],TODOS:[],DRAFT_DATA:{},V3:{meta:{}},PROJECTS:[['P','住宅项目']],PROJECT_EXTRA:{},
  qNum:x=>Number(String(x||'').replace(/[^0-9.-]/g,''))||0,qMoney:n=>'¥'+n,esc:String,orderOppOf:order=>order[17],v21CanOperate:task=>c.actor===task.owner||c.actor==='管理员',bs131CanMaintain:()=>c.actor==='PM'||c.actor==='管理员',
  oqOpp:id=>c.OPPS.find(o=>o[0]===id),oqQuoteOpp:code=>c.DRAFT_DATA[code]?opp:null,oqOrder:code=>c.ORDERS.find(o=>o[18]?.quoteCode===code),oqCanQuote:o=>!!o&&c.v21CanOperate({owner:o[7]}),oqStatus:()=>c.quoteStatus||'已保存',
  todoActs:()=>[],crmTodoEnabled:()=>true,dw132OldActs:()=>[],quoteCatOfTodo:t=>t.cat||'',quoteSmOf:()=>'',
  visibleTodos:()=>c.TODOS,tag:String,ptTimingCell:()=> '11天',projectLevelTag:()=> 'B',toolbar:(left,right)=>left+right,foot:count=>String(count),
  ops:actions=>'<td>'+actions.map(action=>`<button data-act="${action.act}">${action.t}</button>`).join('')+'</td>',
  MG135:{opportunityStates:['待接受','已拒绝','洽谈中','报价中','待下定','待下单','交付中','已完成','已输单']},mgInvitationName:task=>task.title};
 vm.createContext(c);vm.runInContext([
  section(read('managementMonitoring.js'),'function mmFeeOrders(','function mmProjectMoney('),
  section(management,'function mgOpportunityState(','function mgLose('),
  section(crm,'function pageOpps(){','function pageCustomers(){'),
  section(opportunity,'const oqActsBase=todoActs;','const oqRowsBase=orderRowsHtml;'),
 ].join('\n'),c);
 return c;
}
function quote(c){const order=Array(19).fill('');order[15]='P';order[17]='BU';order[18]={quoteCode:'Q'};c.ORDERS.push(order);c.DRAFT_DATA.Q={};return order;}

test('商机管理右侧不再显示创建报价或查看报价，详情和其他业务操作保留',()=>{
 for(const kind of ['product','design']){
  const c=setup(kind),opp=c.OPPS[0];
  for(const actor of ['负责人','管理员','PM']){
   c.actor=actor;let html=c.pageOpps();assert.ok(!html.includes('data-act="mgQuote"'));assert.ok(!html.includes('创建报价'));assert.ok(!html.includes('查看报价'));
   assert.ok(html.includes('data-act="go:oppDetail"'));assert.ok(html.includes('data-act="mgLoss"'));
   if(kind==='product')assert.ok(html.includes('data-act="addOpp"'));
  }
  c.actor='负责人';assert.equal(c.mgOppActions(opp,true).find(action=>action.act==='mgQuote').t,'创建报价');
  quote(c);assert.equal(c.mgOppActions(opp,true).find(action=>action.act==='mgQuote').t,'查看报价');assert.ok(!c.pageOpps().includes('data-act="mgQuote"'));
 }
});

test('项目详情报价和方案经理交接保持原权限，输单商机仍不可报价',()=>{
 const c=setup(),opp=c.OPPS[0];
 c.actor='无权限';assert.ok(!c.mgOppActions(opp,true).some(action=>action.act==='mgQuote'));
 c.actor='负责人';assert.ok(c.mgOppActions(opp,true).some(action=>action.act==='mgQuote'));assert.ok(c.mgOppActions(opp,true).some(action=>action.act==='bs131Handover'));
 assert.ok(!c.mgOppActions(opp).some(action=>action.act==='bs131Handover'));
 opp[20].lostAt='2026-10-11';assert.deepEqual(Array.from(c.mgOppActions(opp,true),action=>action.act),['go:oppDetail']);
});

test('报价待办继续保留创建、编辑和确认报价功能，普通用户权限不扩大',()=>{
 const c=setup(),task={id:'QT',type:'报价待办',project:'P',opp:'BU',owner:'负责人',status:'待处理'};
 let actions=c.todoActs(task);assert.equal(actions.find(action=>action.act==='oqEdit').t,'创建报价单');
 const order=quote(c);task.draft='Q';c.V3.meta.Q={revision:1};c.quoteStatus='已报价';actions=c.todoActs(task);assert.equal(actions.find(action=>action.act==='oqEdit').t,'编辑报价单');assert.ok(actions.some(action=>action.act==='oqReview'));
 c.actor='无权限';actions=c.todoActs(task);assert.ok(!actions.some(action=>action.act==='oqEdit'||action.act==='oqReview'));assert.ok(actions.some(action=>action.act==='oqOpenOpp'));
 c.actor='负责人';order[18].erpRequestedRevision=1;assert.ok(!c.todoActs(task).some(action=>action.act==='oqReview'));
});

test('前置待接受及拒绝邀请仍只提供原关联待办操作',()=>{
 const c=setup();c.todoActs=task=>[{t:'查看流程图',act:'viewDealFlow'},{t:'确认',act:'todoAccept'},{t:'驳回',act:'todoReject'}];
 const task={id:'PRE',type:'确认商机',project:'P',status:'待处理',owner:'负责人',cat:'家具',title:'住宅项目-家具'};c.TODOS.push(task);
 const preliminary=c.mgOppRows().find(row=>row[20]?.preliminaryTask);assert.deepEqual(Array.from(c.mgOppActions(preliminary),action=>action.act),['viewDealFlow','todoAccept','todoReject']);assert.ok(!c.pageOpps().includes('创建报价'));
});

