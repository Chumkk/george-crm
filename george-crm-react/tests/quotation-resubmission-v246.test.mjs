import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {setup,quote} from './helpers/quotation-runtime.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
function published(){const c=setup(),q=quote(c);c.actor='SM';c.applyDraftSaved({...q.data,submissionRequestId:'FIRST'});return {c,...q};}
test('编辑页仅在暂存持久化成功后收到已暂存需重提的状态，失败或其他消息来源不改显示',()=>{
 const {c,data}=published();Object.assign(c,{V21:{view:'team'},V68_SMS:[],mgOpportunityState:()=> '报价中',v21Rows:()=>c.TODOS,v21FlowAllowed:()=>false,visibleTodos:()=>c.TODOS,bindPimsFrame(){},mgTaskBusinessInfo:()=>({}),v21AllowedOwners:()=>[c.actor],window:{addEventListener(){}},tfStoredTasks:()=>[],v3CloseDialog(){}});
 vm.runInContext(fs.readFileSync(new URL('../src/compat/runtime/quoteAssistance.js',import.meta.url),'utf8'),c);
 const messages=[],source={postMessage:m=>messages.push(m)},strip={textContent:'报价 · 已提交',insertAdjacentHTML(){}},listeners=[],parent={},frame={parent,window:{addEventListener:(name,fn)=>listeners.push(fn)},document:{querySelector:()=>strip},ed238Roles:()=>''};
 const script=fs.readFileSync(new URL('../../work/editor-v246.js',import.meta.url),'utf8');new vm.Script(script);vm.createContext(frame);vm.runInContext(script.slice(0,script.indexOf('/* Reuse committed')),frame);
 c.fail=true;c.v3QuickSave(data,source);listeners[0]({source:parent,data:messages.at(-1)});assert.equal(strip.textContent,'报价 · 已提交');assert.equal(c.TODOS[0].status,'已处理');
 c.fail=false;c.v3QuickSave(data,source);const ack=messages.at(-1);assert.equal(ack.quotationWorkflow.status,'已暂存');assert.equal(c.TODOS[0].status,'待处理');listeners[0]({source:{},data:ack});assert.equal(strip.textContent,'报价 · 已提交');
 listeners[0]({source:parent,data:ack});assert.match(strip.textContent,/报价 · 已暂存 · 需重新提交/);assert.doesNotMatch(strip.textContent,/报价 · 已提交/);
});
test('已完成期间PM交接后，暂存重新激活沿用当前PM的发起及催办归属',()=>{
 const {c,data}=published(),source=fs.readFileSync(new URL('../src/compat/runtime/taskFollowup.js',import.meta.url),'utf8');
 vm.runInContext(source.slice(source.indexOf('function tfQuotationInitiator('),source.indexOf('function tfRefreshQuotationInitiators(')),c);
 c.PROJECTS[0][9]='新PM';c.TODOS[0].initiator='旧PM';c.v3QuickSave(data);assert.equal(c.TODOS[0].initiator,'新PM');assert.equal(c.TODOS[0].status,'待处理');assert.equal(c.TODOS[0].owner,'SM');
});
test('已确认报价暂存后激活同一待办，上次客户确认、对客报价、ERP内容及金额保持原版',()=>{
 const {c,code,data}=published(),m=c.V3.meta[code],task=c.TODOS[0];m.confirmedCats=['家具'];
 const before=JSON.stringify({submitted:m.submitted,versions:m.quoteVersions,quotes:c.PROJECT_QUOTES,order:c.oqOrder(code)}),id=task.id;
 c.v3QuickSave({...data,spaces:[{name:'客厅',products:[{cat:'家具',name:'新椅子',qty:2,price:100,amt:200}]}]});
 assert.equal(task.id,id);assert.equal(c.TODOS.length,1);assert.equal(task.status,'待处理');assert.equal(c.oqStatus(code),'已暂存');assert.equal(task.quoteResubmitPending,true);
 assert.deepEqual(Array.from(m.confirmedCats),['家具']);assert.equal(JSON.stringify({submitted:m.submitted,versions:m.quoteVersions,quotes:c.PROJECT_QUOTES,order:c.oqOrder(code)}),before);
 c.applyDraftSaved({...c.DRAFT_DATA[code],submissionRequestId:'SECOND'});assert.equal(task.status,'已处理');assert.equal(task.quoteResubmitPending,false);assert.equal(c.oqStatus(code),'已提交');assert.equal(m.confirmedCats.length,0);assert.equal(c.oqOrder(code)[18].erpRequests.length,2);assert.equal(c.TODOS.length,1);
});
test('相同内容也按用户规则直接激活，后续重复暂存不重复激活或重置到达时间',()=>{
 const {c,code,data}=published(),task=c.TODOS[0],original=copy(task);c.v3Stamp=()=> '2026-11-03 10:00';c.v3QuickSave(data);
 assert.equal(task.status,'待处理');assert.equal(task.v21ArrivedAt,'2026-11-03 10:00');assert.equal(task.quoteReactivations246.length,1);assert.equal(task.quoteReactivations246[0].previous.approveTime,original.approveTime);
 c.v3Stamp=()=> '2026-11-03 10:30';c.v3QuickSave(data);assert.equal(task.v21ArrivedAt,'2026-11-03 10:00');assert.equal(task.quoteReactivations246.length,1);assert.equal(c.oqReconcileSubmittedTasks(),0);
 assert.equal(c.applyDraftSaved({...data,submissionRequestId:'FIRST'}),false);assert.equal(task.status,'待处理');assert.equal(c.oqOrder(code)[18].erpRequests.length,1);
});
test('暂存保存失败整体回滚，重试才激活且不生成新待办或请求',()=>{
 const {c,code,data}=published(),before=JSON.stringify({tasks:c.TODOS,meta:c.V3.meta,data:c.DRAFT_DATA,orders:c.ORDERS});c.fail=true;c.v3QuickSave(data);
 assert.equal(JSON.stringify({tasks:c.TODOS,meta:c.V3.meta,data:c.DRAFT_DATA,orders:c.ORDERS}),before);
 c.fail=false;c.v3QuickSave(data);assert.equal(c.TODOS[0].status,'待处理');assert.equal(c.TODOS[0].quoteReactivations246.length,1);assert.equal(c.oqOrder(code)[18].erpRequests.length,1);
});
test('历史未提交工作稿对齐为待处理，保留实际暂存时间，缺失操作人不冒用查看人',()=>{
 const {c,code}=published(),task=c.TODOS[0];c.V3.meta[code].workingSaved=true;c.DRAFT_DATA[code].savedAt='2026-10-20 12:00';c.actor='当前PM';const order=JSON.stringify(c.oqOrder(code));
 assert.equal(c.oqReconcileSubmittedTasks(),1);assert.equal(task.status,'待处理');assert.equal(task.v21ArrivedAt,'2026-10-20 12:00');assert.equal(task.quoteReactivations246[0].by,'');assert.equal(c.oqReconcileSubmittedTasks(),0);assert.equal(JSON.stringify(c.oqOrder(code)),order);
});
test('历史已归档、备货和其他商机记录不被重新激活，首次暂存保留原待处理任务',()=>{
 const {c,code}=published(),task=c.TODOS[0];c.V3.meta[code].workingSaved=true;c.oqOrder(code)[18].legacyQuoteArchive=true;
 assert.equal(c.oqReconcileSubmittedTasks(),0);assert.equal(task.status,'已处理');c.oqOrder(code)[18].legacyQuoteArchive=false;c.oqOrder(code)[18].stockStartedAt='2026-10-20';assert.equal(c.oqReconcileSubmittedTasks(),0);
 const n=setup(),q=quote(n);n.actor='SM';n.v3QuickSave(q.data);assert.equal(n.TODOS[0].status,'待处理');assert.equal(n.TODOS[0].quoteReactivations246,undefined);assert.equal(n.TODOS.length,1);
});
test('设计报价暂存也激活原报价待办，重新提交后完成；不改原设计费用订单',()=>{
 const c=setup();c.dw132CreateOpportunities('P',['设计甲']);const id=c.v68CreateOpportunity(c.TODOS[0]);c.actor='设计甲';const order=c.dw132FeeOrder(id,500,{gdsRemark:'旧备注'}),code=order[18].quoteCode;c.oqPublishDesign(code);
 const task=c.TODOS.find(t=>t.opp===id&&t.type==='报价待办'),count=c.TODOS.length;c.dw132FeeOrder(id,600,{gdsRemark:'新备注'});assert.equal(task.status,'待处理');assert.equal(order[10],'¥500');assert.equal(order[18].erpRequests.length,1);assert.equal(c.TODOS.length,count);
 c.oqPublishDesign(code);assert.equal(task.status,'已处理');assert.equal(order[10],'¥600');assert.equal(order[18].erpRequests.length,2);assert.equal(c.TODOS.length,count);
});
