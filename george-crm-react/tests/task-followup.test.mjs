import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=name=>fs.readFileSync(new URL('../src/compat/runtime/'+name+'.js',import.meta.url),'utf8');
const followup=read('taskFollowup'),management=read('managementWorkflow'),quotation=read('opportunityQuotes');
const cut=(source,start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const copy=value=>JSON.parse(JSON.stringify(value));
function boot(){
 const noop=()=>'',storage=new Map();
 const c={OQ_DESIGN_TYPES:['采购方案设计','独立设计服务'],actor:'PM',PROJECTS:[['P','采购项目','','','','','北美','客户','','PM']],PROJECT_EXTRA:{P:{formData:{spaceCats:[{id:'S',name:'客厅',cats:['家具']}]}}},PROJECT_FILES:{},OPPS:[],ORDERS:[],TODOS:[],DRAFT_DATA:{},TODO_TYPES:[],V18_TODO_NAMES:{},wizardState:{},CHAIN_STEPS:['项目待办','设计待办'],RENDER:{},document:{createElement:()=>({}),head:{appendChild(){}},addEventListener(){}},v3Copy:copy,esc:String,v17Owner:()=>c.actor,todoStamp:()=> '2026-10-10 12:00',orderOppOf:o=>o[17],v21CanOperate:t=>c.actor===t.owner,bs131CanMaintain:()=>c.actor==='PM',oqOpp:id=>c.OPPS.find(o=>o[0]===id),oqCanQuote:()=>true,oqDesignType:v=>v||'暂无',todoActs:()=>[{t:'查看流程图',act:'viewDealFlow'}],handleAct:noop,openPlannedTodoForm:noop,updateWizardHint:noop,pageOppDetail:noop,todoSubject:noop,toast:noop,markPagesDirty:noop,openPage:noop,crmTodoEnabled:()=>true,V72:{messages:[],sequence:0,baseline:{},storageOk:true,scrollTop:null},V72_TYPES:{'报价待办':'sm','设计待办':'designer','设计确认待办':'pm'}};
 c.v21SuperAdmin=()=>!!c.admin;
 c.findProject=id=>c.PROJECTS.find(p=>p[0]===id);
 c.addChainTodo=data=>{const task={id:'T'+(c.TODOS.length+1),status:'待处理',...copy(data)};c.TODOS.unshift(task);return task;};
 c.v125ProjectSpaces=p=>copy(c.PROJECT_EXTRA[p].formData.spaceCats);
 c.oqDesignSpaces=(p,spaces)=>spaces.map(s=>({...s,cats:c.v125ProjectSpaces(p).find(old=>old.id===s.id)?.cats||s.cats||[]}));
 c.v125ApplySpaceImpact=noop;
 c.bs131MovePM=(project,oldOwner,newOwner)=>{c.PROJECTS.find(p=>p[0]===project)[9]=newOwner;};
 c.PROJECT_TYPES=[{items:[['住宅']]}];
 c.localStorage={getItem:key=>storage.get(key)||null};c.setStoredTasks=rows=>storage.set('crm-flow-v3',JSON.stringify({todos:rows}));c.readStored=()=>JSON.parse(storage.get('crm-flow-v3')||'{}');
 c.v3Save=()=>{if(c.failOrdinarySave)return false;c.setStoredTasks(c.TODOS);return true;};
 c.v72SaveMessages=()=>{c.V72.storageOk=!c.failNotification;if(c.V72.storageOk)storage.set('notifications',JSON.stringify(c.V72.messages));};
 c.bs131Atomic=change=>{const before=copy({PROJECT_EXTRA:c.PROJECT_EXTRA,PROJECT_FILES:c.PROJECT_FILES,TODOS:c.TODOS,OPPS:c.OPPS,PROJECTS:c.PROJECTS}),stored=new Map(storage);try{const result=change();if(c.failSave||!c.v3Save())throw Error('保存失败');return result;}catch(error){Object.assign(c,before);storage.clear();for(const [k,v] of stored)storage.set(k,v);throw error;}};
 c.dw132RequestErrors=d=>!d.designer?['设计师']:[];c.v81CanEditTodo=t=>['待处理','已驳回'].includes(t.status);c.v3Stamp=c.todoStamp;
 vm.createContext(c);vm.runInContext(management,c);
 vm.runInContext(cut(quotation,'function oqEnsureTodo(', 'function oqNewOrder(')+cut(quotation,'function oqInitiateDesign(', 'dw132CompleteDesign=function('),c);
 vm.runInContext(followup,c);return c;
}
function task(c,extra={}){return c.addChainTodo({type:'报价待办',project:'P',owner:'SM',initiator:'PM',...extra});}
const day=Date.parse('2026-10-10T12:00:00+08:00');
test('期望完成日期为北京时间当日结束；缺失历史不伪造，完成任务不报未处理逾期',()=>{
 const c=boot();assert.equal(c.tfExpected('2026-10-10'),'2026-10-10T23:59:59.999+08:00');
 for(const bad of ['', '2026-02-30','2026-13-01','bad'])assert.throws(()=>c.tfExpected(bad),/有效/);
 const deadline={type:'设计待办',status:'待处理',expectedCompletionAt:c.tfExpected('2026-10-10')};
 assert.equal(c.tfDeadline(deadline,Date.parse('2026-10-10T23:59:59.999+08:00')).overdue,false);
 assert.equal(c.tfDeadline(deadline,Date.parse('2026-10-11T00:00:00+08:00')).overdue,true);
 assert.equal(c.tfDeadline({...deadline,status:'已处理'},day+86400000).overdue,false);
 assert.equal(c.tfDeadline({status:'待处理'},day).label,'期望完成 · 未设置');
});
test('设计发起日期必填、持久化、原需求编辑保留旧日期和独立请求',()=>{
 const c=boot(),input={designType:'采购方案设计',designer:'设计师',attachments:[],note:'CAD'};
 assert.throws(()=>c.oqInitiateDesign('P',input,'R'),/期望完成时间/);assert.equal(c.TODOS.length,0);
 const t=c.oqInitiateDesign('P',{...input,expectedCompletionAt:'2026-10-11'},'R');assert.equal(t.expectedCompletionAt,'2026-10-11T23:59:59.999+08:00');
 c.oqInitiateDesign('P',{...input,expectedCompletionAt:'2026-10-12'},'R',t.id);
 assert.equal(t.expectedCompletionAt,'2026-10-12T23:59:59.999+08:00');assert.equal(t.editHistory[0].before.expectedCompletionAt,'2026-10-11T23:59:59.999+08:00');
 c.failSave=true;assert.throws(()=>c.oqInitiateDesign('P',{...input,expectedCompletionAt:'2026-10-13'},'R',t.id),/保存失败/);assert.equal(c.TODOS[0].expectedCompletionAt,'2026-10-12T23:59:59.999+08:00');
});
test('设计师为下一PM待办指定独立期限，驳回重提不覆写历史和原设计截止',()=>{
 const c=boot(),d=c.oqInitiateDesign('P',{designType:'采购方案设计',designer:'设计师',expectedCompletionAt:'2026-10-11'},'R');
 c.actor='设计师';const data={projectType:'住宅',projectArea:'100㎡',spaceCats:[{id:'S',name:'客厅'}],attachments:[{name:'plan.pdf'}]};
 assert.throws(()=>c.dw132CompleteDesign(d,data),/期望完成时间/);assert.equal(d.status,'待处理');
 const r=c.dw132CompleteDesign(d,{...data,reviewExpectedCompletionAt:'2026-10-12'});assert.equal(r.expectedCompletionAt,'2026-10-12T23:59:59.999+08:00');assert.equal(d.expectedCompletionAt,'2026-10-11T23:59:59.999+08:00');
 c.actor='PM';c.mgRejectDesign(r,'重新设计');assert.equal(d.handoff.reviewExpectedCompletionAt,'2026-10-12T23:59:59.999+08:00');
 c.actor='设计师';const next=c.dw132CompleteDesign(d,{...data,reviewExpectedCompletionAt:'2026-10-14'});assert.equal(next.id,r.id);assert.equal(next.expectedCompletionAt,'2026-10-14T23:59:59.999+08:00');assert.equal(r.editHistory[0].before.expectedCompletionAt,'2026-10-12T23:59:59.999+08:00');assert.equal(d.expectedCompletionAt,'2026-10-11T23:59:59.999+08:00');
});
test('仅发起人对其他负责人的当前未处理任务能催，项目任务和结束/驳回任务不可催',()=>{
 const c=boot(),t=task(c);assert.equal(c.tfReminder(t,day).allowed,true);assert.equal(c.todoActs(t).at(-1).act,'tfRemind');
 c.actor='SM';assert.equal(c.tfReminder(t,day).visible,false);assert.throws(()=>c.tfRemind(t.id,day),/仅发起人/);
 c.actor='主管';assert.equal(c.tfReminder(t,day).visible,false);
 c.actor='PM';for(const extra of [{owner:'PM'},{type:'项目待办',owner:'OTHER'},{status:'已处理'},{status:'已驳回'},{status:'已取消'}])assert.equal(c.tfReminder({...t,...extra},day).visible,false);
});
test('成功催办只通知精确接收人；跨入口和负责人调整仍共用24小时限制',()=>{
 const c=boot(),t=task(c),other=task(c,{owner:'OTHER'});const record=c.tfRemind(t.id,day);
 assert.equal(record.to,'SM');assert.equal(c.V72.messages.length,1);assert.equal(c.V72.messages[0].task,t.id);assert.equal(c.V72.messages[0].recipient,'SM');assert.equal(c.V72.messages[0].localOnly,true);assert.equal(other.reminders,undefined);
 assert.throws(()=>c.tfRemind(t.id,day+1),/此待办已催办/);t.owner='SM B';assert.equal(c.tfReminder(t,day+3600000).allowed,false);
 assert.match(c.tfReminder(t,day+3600000).nextLabel,/2026-10-11 12:00/);assert.equal(c.tfReminder(t,day+24*3600000).allowed,true);
 c.tfRemind(t.id,day+24*3600000);assert.equal(t.reminders.length,2);assert.equal(c.V72.messages[0].recipient,'SM B');
});
test('通知或业务保存失败均回滚提醒记录和通知，不占用频率且可重试',()=>{
 const c=boot(),t=task(c);c.failNotification=true;assert.throws(()=>c.tfRemind(t.id,day),/通知记录未保存/);assert.equal(c.TODOS[0].reminders,undefined);assert.equal(c.V72.messages.length,0);assert.equal(c.V72.sequence,0);
 c.failNotification=false;c.failSave=true;assert.throws(()=>c.tfRemind(t.id,day),/保存失败/);assert.equal(c.TODOS[0].reminders,undefined);assert.equal(c.V72.messages.length,0);assert.equal(c.V72.sequence,0);
 c.failSave=false;c.tfRemind(c.TODOS[0].id,day);assert.equal(c.TODOS[0].reminders.length,1);
});
test('重新打开或另一个浏览器标签读取最新任务催办时间，旧页面不能绕过冷却',()=>{
 const c=boot(),t=task(c),at=new Date(day).toISOString();
 c.setStoredTasks([{...copy(t),reminders:[{at,by:'PM',to:'SM',messageId:'stored'}]}]);
 assert.equal(t.reminders,undefined);assert.equal(c.tfReminder(t,day+1).allowed,false);assert.throws(()=>c.tfRemind(t.id,day+1),/此待办已催办/);
 c.tfRemind(t.id,day+86400000);assert.equal(t.reminders.length,2);assert.equal(t.reminders[0].messageId,'stored');
 const action=c.todoActs(t).find(a=>a.act==='tfRemind');assert.equal(typeof action.disabled,'boolean');assert.ok(action.title);
});
test('旧标签的普通保存合并最新催办历史，仅合并精确任务，保留本页业务改动',()=>{
 const c=boot(),t=task(c),other=task(c),record={at:new Date(day).toISOString(),by:'PM',to:'SM',messageId:'newer-tab'};
 c.setStoredTasks([{...copy(t),title:'其他标签旧业务值',reminders:[record]},{...copy(other),project:'ANOTHER',reminders:[record]}]);
 t.title='本页报价改动';assert.equal(t.reminders,undefined);assert.equal(c.v3Save(),true);
 assert.equal(t.reminders[0].messageId,'newer-tab');assert.equal(c.readStored().todos.find(row=>row.id===t.id).title,'本页报价改动');assert.equal(other.reminders,undefined);
 assert.throws(()=>c.tfRemind(t.id,day+1),/此待办已催办/);
});
test('普通保存失败不遗留合并字段，不删除其他标签已保存的催办时间',()=>{
 const c=boot(),t=task(c);c.setStoredTasks([{...copy(t),reminders:[{at:new Date(day).toISOString(),by:'PM',messageId:'saved'}]}]);
 c.failOrdinarySave=true;assert.equal(c.v3Save(),false);assert.equal(t.reminders,undefined);assert.equal(c.readStored().todos[0].reminders[0].messageId,'saved');
 assert.throws(()=>c.tfRemind(t.id,day+1),/此待办已催办/);
});
test('关联商机输单或完成后，旧未处理报价待办保留历史但不可催办',()=>{
 const c=boot(),opp=['B','商机','洽谈中','家具','P','','客户','SM'],t=task(c,{opp:'B'});c.OPPS.push(opp);
 assert.equal(c.tfReminder(t,day).allowed,true);opp[20]={lostAt:'2026-10-10'};assert.equal(c.tfReminder(t,day).visible,false);assert.throws(()=>c.tfRemind(t.id,day),/商机已输单或已完成/);
 delete opp[20].lostAt;opp[2]='已完成';assert.equal(c.tfReminder(t,day).allowed,false);assert.equal(t.status,'待处理');
});
test('SM承接商机生成的报价待办发起人为项目PM；PM交接只迁移未完成任务',()=>{
 const c=boot();c.actor='SM';const opp=['B','商机','','家具','P','','客户','SM'];const t=c.oqEnsureTodo(opp);assert.equal(t.initiator,'PM');
 const done=task(c,{status:'已处理',initiator:'旧PM'});c.actor='PM';c.bs131MovePM('P','PM','新PM');assert.equal(t.initiator,'新PM');assert.equal(t.initiatorHistory[0].from,'PM');assert.equal(done.initiator,'旧PM');
 c.actor='新PM';assert.equal(c.tfReminder(t,day).allowed,true);c.actor='PM';assert.equal(c.tfReminder(t,day).visible,false);
});
test('设计确认待办由发起设计师催办PM，PM只办理；同样限制24小时一次',()=>{
 const c=boot(),t=task(c,{type:'设计确认待办',owner:'PM',initiator:'设计师',expectedCompletionAt:'2026-10-09'});
 assert.equal(c.tfReminder(t,day).visible,false);assert.match(c.tfTaskMeta(t,day).reminderHint,/你是处理人/);assert.throws(()=>c.tfRemind(t.id,day),/仅发起人/);
 c.actor='设计师';assert.equal(c.tfReminder(t,day).allowed,true);assert.equal(c.tfTaskMeta(t,day).reminderHint,'');assert.equal(c.todoActs(t).find(a=>a.act==='tfRemind').t,'催办');
 c.tfRemind(t.id,day);assert.equal(c.V72.messages[0].recipient,'PM');assert.equal(c.V72.messages[0].role,'pm');assert.equal(c.tfReminder(t,day+1).allowed,false);assert.throws(()=>c.tfRemind(t.id,day+1),/此待办已催办/);assert.equal(c.tfReminder(t,day+86400000).allowed,true);
});
test('管理员可催办未处理设计确认，包括自己负责的任务，但不冒用发起人或绕过冷却',()=>{
 const c=boot(),review=task(c,{type:'设计确认待办',owner:'PM',initiator:'设计师'});c.admin=true;
 assert.equal(c.tfReminder(review,day).visible,true);assert.equal(c.tfTaskMeta(review,day).reminderHint,'');assert.equal(c.todoActs(review).find(a=>a.act==='tfRemind').disabled,false);
 c.tfRemind(review.id,day);assert.equal(review.reminders[0].by,'PM');assert.equal(review.reminders[0].to,'PM');assert.equal(review.initiator,'设计师');assert.equal(c.V72.messages[0].initiator,'PM');assert.equal(c.V72.messages[0].recipient,'PM');
 c.actor='另一管理员';assert.equal(c.tfReminder(review,day+1).allowed,false);assert.throws(()=>c.tfRemind(review.id,day+1),/此待办已催办/);assert.equal(c.tfReminder(review,day+86400000).allowed,true);
 for(const extra of [{type:'项目待办',owner:'PM'},{status:'已处理'},{status:'已驳回'},{owner:'-'}])assert.equal(c.tfReminder({...review,...extra},day).visible,false);
 c.crmTodoEnabled=t=>t.type!=='订单待办';assert.equal(c.tfReminder({...review,type:'订单待办'},day).visible,false);
 c.admin=false;c.actor='旁观者';assert.equal(c.tfReminder(review,day+86400000).visible,false);c.actor='PM';assert.equal(c.tfReminder(review,day+86400000).visible,false);c.actor='设计师';assert.equal(c.tfReminder(review,day+86400000).allowed,true);
});


test('设计单收全款后，未完成的设计交付和 PM 核对仍独立保留催办',()=>{
 const c=boot(),opp=['BD','设计商机','待下单','设计服务','P','','客户','设计师'];opp[20]={kind:'design'};c.OPPS.push(opp);
 const order=Array(19).fill('');Object.assign(order,{2:'设计单',10:'¥500',13:'¥500',15:'P',17:'BD',18:{kind:'design',quoteCode:'D',erpRequestedRevision:1}});c.ORDERS.push(order);
 const d=task(c,{type:'设计待办',opp:'BD',owner:'设计师',initiator:'PM'}),r=task(c,{type:'设计确认待办',opp:'BD',owner:'PM',initiator:'设计师'});
 assert.equal(c.mgOpportunityState(opp),'待下单');assert.equal(c.tfReminder(d,day).allowed,true);c.actor='设计师';assert.equal(c.tfReminder(r,day).allowed,true);
 assert.equal(d.status,'待处理');assert.equal(r.status,'待处理');
});
