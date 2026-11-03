import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {setup,quote} from './helpers/quotation-runtime.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
function assistance(c){Object.assign(c,{V21:{view:'team'},V68_SMS:[],mgOpportunityState:()=> '报价中',v21Rows:()=>c.TODOS,v21FlowAllowed:()=>false,visibleTodos:()=>c.TODOS,bindPimsFrame(){},mgTaskBusinessInfo:()=>({}),v21AllowedOwners:()=>[c.actor],window:{addEventListener(){}},tfStoredTasks:()=>[],v3CloseDialog(){}});vm.runInContext(fs.readFileSync(new URL('../src/compat/runtime/quoteAssistance.js',import.meta.url),'utf8'),c);}
function submitted(){const c=setup(),q=quote(c);c.actor='SM';c.applyDraftSaved(q.data);return {c,...q};}
test('历史提交缺少ERP请求也恢复为已处理，采用原提交人时间且不重复通知、传输或改写历史',()=>{
 const {c,code}=submitted(),m=c.V3.meta[code],order=c.oqOrder(code),t=c.TODOS[0];
 Object.assign(m.quoteVersions[0],{submittedAt:'2026-10-01 09:15',submittedBy:'原报价助理'});t.status='待处理';t.approver='-';t.approveTime='-';delete order[18].erpRequests;delete order[18].erpRequestedRevision;
 const before=JSON.stringify({order,meta:m});c.actor='当前PM';
 c.v72NotificationEvents=()=>[{task:t.id,event:'quote-erp-requested'},{task:'OTHER',event:'todo-result'}];const atomic=c.bs131Atomic;
 c.bs131Atomic=fn=>atomic(()=>{const value=fn();c.events=c.v72NotificationEvents({},{});return value;});
 assistance(c);assert.equal(t.status,'已处理');assert.equal(t.approver,'原报价助理');assert.equal(t.approveTime,'2026-10-01 09:15');assert.equal(t.quoteCompletionLegacy244.status,'待处理');
 assert.deepEqual(copy(c.events),[{task:'OTHER',event:'todo-result'}]);assert.equal(JSON.stringify({order,meta:m}),before);assert.equal(c.oqReconcileSubmittedTasks(),0);
 m.confirmedCats=['家具'];assert.equal(c.qaQuoteInfo(t).status,'已确认');assert.equal(t.status,'已处理');
});
test('普通暂存不会激活已完成待办；空间变更重新激活时保留已暂存，重新提交才完成',()=>{
 const {c,code,data}=submitted(),m=c.V3.meta[code],t=c.TODOS[0];c.v3QuickSave(data);assert.equal(t.status,'已处理');
 t.status='待处理';assert.equal(c.oqReconcileSubmittedTasks(),1);assert.equal(t.status,'已处理');
 m.needsSpaceUpdate=true;m.active=false;t.status='待处理';assert.equal(c.oqReconcileSubmittedTasks(),0);assert.equal(c.oqStatus(code),'已暂存');
 assistance(c);assert.equal(t.status,'待处理');assert.equal(c.qaQuoteInfo(t).status,'已暂存');c.applyDraftSaved(data);assert.equal(t.status,'已处理');assert.equal(c.oqStatus(code),'已提交');
});
test('同商机另一待办不借用报价状态，不因同品类、跨项目、错误报价关系被完成',()=>{
 const {c,code}=submitted();const duplicate={id:'OTHER',type:'报价待办',project:'P',opp:'B',draft:code,status:'待处理',owner:'SM'};
 c.TODOS.push(duplicate,{...duplicate,id:'WRONG-P',project:'ANOTHER'});assistance(c);
 assert.equal(c.oqTaskQuoteCode(duplicate),'');assert.equal(c.qaQuoteInfo(duplicate).code,'');assert.equal(c.qaQuoteInfo(duplicate).status,'待报价');assert.equal(duplicate.status,'待处理');assert.equal(c.TODOS[2].status,'待处理');
});
test('缺少真实提交证据不完成任务；客户端仅查看不修改内部待办',()=>{
 const c=setup(),{code}=quote(c);c.V3.meta[code].status='已提交';assert.equal(c.oqReconcileSubmittedTasks(),0);assert.equal(c.TODOS[0].status,'待处理');
 const fixture=submitted();fixture.c.TODOS[0].status='待处理';fixture.c.document.documentElement={dataset:{entry:'client'}};assistance(fixture.c);assert.equal(fixture.c.TODOS[0].status,'待处理');
});
test('历史任务校正保存失败整体回滚，重新尝试一次成功且幂等',()=>{
 const {c}=submitted();c.TODOS[0].status='待处理';const before=JSON.stringify(c.TODOS);c.fail=true;
 assert.throws(()=>c.oqReconcileSubmittedTasks(),/保存失败/);assert.equal(JSON.stringify(c.TODOS),before);
 c.fail=false;assert.equal(c.oqReconcileSubmittedTasks(),1);assert.equal(c.TODOS[0].status,'已处理');assert.equal(c.oqReconcileSubmittedTasks(),0);
});
test('提交不能利用旧通知样例参数跳过ERP请求和完成任务',()=>{
 const c=setup(),project='PJ-NOTICE-NEW';c.OPPS[0][4]=project;c.PROJECTS[0][0]=project;c.PROJECT_EXTRA[project]=c.PROJECT_EXTRA.P;
 const {code,data}=quote(c);c.actor='SM';assert.equal(c.applyDraftSaved({...data,notificationSample:true,submissionRequestId:'notification-confirmation:NEW'}),code);
 assert.equal(c.TODOS[0].status,'已处理');assert.equal(c.oqOrder(code)[18].erpRequests.length,1);
});
test('同次提交重试恢复精确任务结果且不重复传ERP，空间变更不能用旧请求冒充重新提交',()=>{
 const c=setup(),{code,data}=quote(c);c.actor='SM';c.applyDraftSaved({...data,submissionRequestId:'SAME'});c.TODOS[0].status='待处理';
 assert.equal(c.applyDraftSaved({...data,submissionRequestId:'SAME'}),code);assert.equal(c.TODOS[0].status,'已处理');assert.equal(c.oqOrder(code)[18].erpRequests.length,1);
 c.V3.meta[code].needsSpaceUpdate=true;c.TODOS[0].status='待处理';assert.equal(c.applyDraftSaved({...data,submissionRequestId:'SAME'}),false);assert.equal(c.TODOS[0].status,'待处理');assert.equal(c.oqStatus(code),'已暂存');
});
test('校正处理记录沿用原业务发生时间和操作人，缺失字段不借用当前查看人',()=>{
 const {c,code}=submitted(),t=c.TODOS[0],store=new Map();t.status='待处理';delete t.approveTime;delete t.approver;
 c.tfTime=x=>x&&x!=='-'?(Number.isFinite(Date.parse(x))?Date.parse(x):null):null;
 c.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};c.v3Save=()=>true;
 vm.runInContext(fs.readFileSync(new URL('../src/compat/runtime/taskHistory.js',import.meta.url),'utf8'),c);
 const old=c.th192Tracked(t),evidence=c.oqQuoteTaskCompletion(t);evidence.actor='原助理';evidence.time='2026-10-01 09:15';let events;
 c.oqWithTaskRepair([t.id],()=>{c.oqApplyTaskCompletionRepair(t,evidence);events=c.th192Delta(t,old,'2026-11-03T03:00:00Z','当前查看人');});
 const done=events.find(e=>e.kind==='completed');assert.equal(done.at,'2026-10-01 09:15');assert.equal(done.actor,'原助理');assert.ok(events.every(e=>e.actor!=='当前查看人'));
 t.status='待处理';delete t.approveTime;delete t.approver;const missingOld=c.th192Tracked(t);
 c.oqWithTaskRepair([t.id],()=>{c.oqApplyTaskCompletionRepair(t,{...evidence,actor:'',time:''});events=c.th192Delta(t,missingOld,'2026-11-03T03:00:00Z','当前查看人');});
 assert.ok(!events.some(e=>e.kind==='completed'));assert.equal(t.approveTime,'');assert.equal(t.approver,'');assert.equal(c.V3.meta[code].quoteVersions.length,1);
});
