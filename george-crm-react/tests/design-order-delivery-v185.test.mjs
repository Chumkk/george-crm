import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {setup,read,slice,copy} from './helpers/design171.mjs';
function fixture(){
 const c=setup();const noop=()=>{};
 c.ua176CaptureAllocation=noop;c.tfFormat=v=>v;
 Object.assign(c,{ua176EnsureDesign:noop,ua181InvitationDeadline:noop,v81OpenTodoEdit:noop,MODALS:{confirmTodo:{html:()=>''}},v68Allocation:noop,dqAllocateBase:(p,names)=>names.map(owner=>c.addChainTodo({type:'确认商机',project:p,owner})),ua176Supervisors:()=>['设计甲'],v72NotificationEvents:()=>[],gds171Queue:noop,gds171Receive:noop,projectPmOf:()=> 'PM',GDS171:{receipt:null},dqFiles:copy,v69AttachmentList:()=>'',v69UploadHtml:()=>'',handleAct:noop,v69UploadsBusy:()=>false,oqStatus:()=> '已报价',oqLockReason:()=>'',oqQuoteOpp:()=>c.OPPS[0],oqOrder:()=>c.ORDERS[0],oqEnsureTodo:()=>c.TODOS.find(t=>t.type==='报价待办')});
 c.OPPS.push(['BU1','设计商机','报价中','设计服务','P','北美','客户','设计甲']);c.OPPS[0][20]={kind:'design'};
 c.ORDERS.push(['XF00000001','设计甲','设计单','未传输','设计服务','','设计报价','','','','¥1000','','','','','P','','BU1',{kind:'design',quoteCode:'Q'}]);
 c.V3.meta.Q={revision:1,currentQuoteVersion:'V1',submitted:{designFields:{attachments:[{id:'REF',name:'参考作品.pdf'}],gdsRemark:'全屋设计'}}};
 c.TODOS.push({id:'QT',type:'报价待办',opp:'BU1',project:'P',draft:'Q',status:'待处理',owner:'设计甲',initiator:'PM'});
 vm.runInContext(slice(read('opportunityQuotes.js'),'function oqQueueERP(','function oqNormalizeExecutionStates(')+slice(read('opportunityQuotes.js'),'function oqConfirmQuote(','function oqReviewConfirm('),c);
 vm.runInContext(read('designOrderDelivery.js'),c);return c;
}
function deliver(c){c.actor='设计甲';c.oqConfirmQuote('Q',1);const t=c.TODOS.find(t=>t.type==='设计待办');return c.dr185Submit(t,{drawings:[{id:'A',type:'平面设计图',file:{name:'平面.pdf'}},{id:'B',type:'全屋3D图',file:{name:'三维.jpg'}}]});}
test('GDS精确收款确认推进交付，ERP全款和定稿同步不完成设计商机，GDS完成才结束',()=>{
 const c=fixture();c.actor='设计甲';c.oqConfirmQuote('Q',1);let t=c.TODOS.find(t=>t.type==='设计待办'),o=c.OPPS[0];c.ORDERS[0][13]='¥1000';
 assert.equal(c.mgOpportunityState(o),'待下单');
 const receipt={system:'GDS',eventId:'PAY1',task:t.id,actor:'设计甲',revision:t.gds.revision,action:'payment-confirmed',project:'P',order:t.order,opportunity:o[0]};
 assert.throws(()=>c.gds171Receive({...receipt,order:'OTHER'}),/关联/);assert.throws(()=>c.gds171Receive({...receipt,project:undefined}),/精确/);assert.throws(()=>c.gds171Receive({...receipt,actor:'别人'}),/处理人/);assert.equal(t.gdsPaymentConfirmed,undefined);
 c.failSave=true;assert.throws(()=>c.gds171Receive(receipt),/保存/);t=c.TODOS.find(t=>t.type==='设计待办');assert.equal(t.gdsPaymentConfirmed,undefined);c.failSave=false;
 c.gds171Receive(receipt);t=c.TODOS.find(t=>t.type==='设计待办');o=c.OPPS[0];assert.equal(c.mgOpportunityState(o),'交付中');const count=t.gds.receipts.length;c.gds171Receive(receipt);assert.equal(t.gds.receipts.length,count);
 const r=c.dr185Submit(t,{drawings:[{id:'A',type:'平面设计图',file:{name:'图纸.pdf'}}]});c.actor='PM';c.dr185Review(r,'A','confirm',1);c.dr187Sync(r,r.editRevision);assert.equal(c.mgOpportunityState(o),'交付中');assert.equal(t.status,'待处理');
 c.gds171Receive({...receipt,eventId:'DONE',revision:t.gds.revision,action:'complete'});assert.equal(c.mgOpportunityState(o),'已完成');assert.equal(t.gdsCompleted,true);
});
test('确认商机不生成设计任务；确认设计报价生成一次，携带单号费用而不带名称版本',()=>{
 const c=fixture();assert.equal(c.ua176EnsureDesign(c.OPPS[0]),null);assert.equal(c.TODOS.length,1);c.actor='设计甲';c.oqConfirmQuote('Q',1);
 const task=c.TODOS.find(t=>t.type==='设计待办');assert.equal(c.TODOS.find(t=>t.id==='QT').status,'已处理');assert.equal(task.order,'XF00000001');assert.equal(task.needInfo.designOrder.amount,'¥1000');assert.equal(task.needInfo.designOrder.note,'全屋设计');assert.equal(task.expectedCompletionAt,'');assert.equal(task.needInfo.designOrder.quoteRevision,undefined);assert.equal(task.needInfo.designOrder.name,undefined);assert.equal(task.needInfo.projectType,undefined);
 assert.equal(task.gds.requests[0].payload.order,'XF00000001');assert.equal(task.gds.requests[0].payload.expectedCompletionAt,'');
 c.v68Modal=(title,html)=>{c.form=html;};c.dr185Open(task);assert.match(c.form,/设计单信息/);assert.doesNotMatch(c.form,/data-dr-row|项目类型|项目规模|报价版本|设计单名称|type="file"/);
 c.oqConfirmQuote('Q',1);assert.equal(c.TODOS.filter(t=>t.type==='设计待办').length,1);
});
test('确认报价保存失败同时回滚 ERP 请求、报价任务及设计待办',()=>{
 const c=fixture();c.actor='设计甲';const before=copy({orders:c.ORDERS,todos:c.TODOS});c.failSave=true;assert.throws(()=>c.oqConfirmQuote('Q',1),/未保存/);assert.deepEqual(copy({orders:c.ORDERS,todos:c.TODOS}),before);
});
test('图纸逐张驳回和重提，已确认图纸不变；全确认后须手动同步完成审核',()=>{
 const c=fixture(),review=deliver(c);c.actor='PM';c.dr185Review(review,'A','confirm',1);assert.equal(review.status,'待处理');c.dr185Review(review,'B','reject',1,'尺寸需调整');assert.equal(review.status,'待处理');
 const accepted=copy(review.drawings[0]);c.actor='设计甲';c.dr185Resubmit(review,{drawings:[{id:'B',type:'全屋3D图',file:{name:'三维修订.jpg'}}]},review.editRevision);
 assert.deepEqual(copy(review.drawings[0]),accepted);assert.equal(review.drawings[1].revision,2);assert.equal(review.drawings[1].status,'待确认');assert.equal(review.drawings[1].reason,'');assert.ok(review.drawings[1].history.some(h=>h.reason==='尺寸需调整'));
 c.actor='PM';assert.throws(()=>c.dr185Review(review,'B','confirm',1),/已更新/);c.dr185Review(review,'B','confirm',2);assert.equal(review.status,'待处理');c.dr187Sync(review,review.editRevision);assert.equal(review.status,'已处理');assert.equal(c.TODOS.find(t=>t.type==='设计待办').status,'待处理');assert.equal(c.PROJECT_FILES.P.designFile.length,2);assert.equal(c.PROJECT_FILES.P.designFile[1].designDrawingType,'全屋3D图');
});
test('不允许越权、无原因驳回、覆盖已确认图纸及越过整批确认',()=>{
 const c=fixture(),r=deliver(c);c.actor='其他人';assert.throws(()=>c.dr185Review(r,'A','confirm',1),/不可办理/);c.actor='PM';assert.throws(()=>c.dr185Review(r,'A','reject',1,''),/原因/);c.dr185Review(r,'A','confirm',1);c.actor='设计甲';assert.throws(()=>c.dr185Resubmit(r,{drawings:[{id:'A',type:'平面设计图',file:{name:'替换.pdf'}}]},r.editRevision),/只能重提/);
});
test('逐图保存失败不留下半条确认、归档或 GDS 请求',()=>{
 const c=fixture(),r=deliver(c);c.actor='PM';const before=copy({todos:c.TODOS,files:c.PROJECT_FILES});c.failSave=true;assert.throws(()=>c.dr185Review(r,'A','confirm',1),/未保存/);assert.deepEqual(copy({todos:c.TODOS,files:c.PROJECT_FILES}),before);
});
test('GDS 回执去重，拒绝陈旧版本和不匹配订单，重提通知只对应原任务',()=>{
 const c=fixture();c.actor='设计甲';c.oqConfirmQuote('Q',1);const task=c.TODOS.find(t=>t.type==='设计待办'),receipt={system:'GDS',task:task.id,eventId:'EVENT1',actor:'设计甲',revision:task.gds.revision,action:'submit',contents:{drawings:[{id:'A',type:'其他图',file:{name:'说明.pdf'}}]}};
 const result=c.gds171Receive(receipt);assert.deepEqual(copy(c.gds171Receive(receipt)),copy(result));const review=c.TODOS.find(t=>t.id===result.nextTask);assert.equal(c.TODOS.filter(t=>t.type==='设计确认待办').length,1);
 assert.throws(()=>c.gds171Receive({...receipt,eventId:'EVENT2'}),/过期/);c.actor='PM';const before={todos:{[review.id]:copy(review)}};c.dr185Review(review,'A','reject',1,'重新出图');const after={todos:{[review.id]:copy(review)}},events=c.v72NotificationEvents(before,after);assert.equal(events.length,1);assert.equal(events[0].recipient,'设计甲');assert.equal(events[0].task,review.id);
});
test('设计分配要求期望时间及协调员安排，单号保持 XF 规范',()=>{
 const c=fixture();assert.equal(c.dw132CreateOpportunities('P',['设计甲'],'','',{expectedCompletionAt:'2026-10-25',coordination:{mode:'self'}}).length,1);vm.runInContext(slice(read('crm.js'),'function nextOrderNo(','function confirmCreateOrder(').split('\nfunction ')[0],c);
 assert.equal(c.nextOrderNo('P','design'),'XF00000002');assert.equal(c.nextOrderNo('P','fee'),'XF00000002');assert.match(c.nextOrderNo('P'),/^P-/);
});
test('重新打开时旧产品空间迁移保留新设计单的交付与审核任务',()=>{
 const c=fixture(),review=deliver(c);Object.assign(c,{pw173Product:()=>true,pw173ProjectSpaces:()=>[],V68_APPROVALS:[],pw173Spaces:copy});
 vm.runInContext(slice(read('procurementWorkflow.js'),'function pw173Migrate()','const pw173ProjectSaveBase='),c);c.pw173Migrate();
 assert.equal(review.archivedProductDesign173,undefined);assert.equal(c.TODOS.find(t=>t.type==='设计待办').archivedProductDesign173,undefined);assert.equal(review.status,'待处理');
});
test('已有设计待办适配新界面，保持原 ID、状态和设计单关联以及原始资料快照',()=>{
 const c=fixture(),legacy={id:'OLD-D',type:'设计待办',project:'P',opp:'BU1',owner:'设计甲',initiator:'PM',status:'待处理',needInfo:{projectType:'住宅',projectArea:'100㎡',note:'原始需求'},expectedCompletionAt:'2026-10-20'};c.TODOS.push(legacy);
 assert.equal(c.dr186UpgradeTask(legacy),true);assert.equal(legacy.id,'OLD-D');assert.equal(legacy.status,'待处理');assert.equal(legacy.order,'XF00000001');assert.equal(legacy.needInfo.projectType,undefined);assert.equal(legacy.legacyDesignSnapshot186.needInfo.projectType,'住宅');assert.equal(c.dr186UpgradeTask(legacy),false);
 c.v68Modal=(title,html)=>{c.form=html;};c.dr185Open(legacy);assert.doesNotMatch(c.form,/项目类型|项目规模|data-dr-row/);
});
test('旧驳回审核按原图逐张重提，全部确认后归档到四类附件并保留旧文件',()=>{
 const c=fixture(),review={id:'OLD-R',type:'设计确认待办',project:'P',opp:'BU1',owner:'PM',initiator:'设计甲',status:'已驳回',rejectReason:'需更正',handoff:{attachments:[{id:'F1',name:'平面.pdf',designDrawingType:'平面设计图'},{id:'F2',name:'旧效果.jpg'}]},gds:{revision:1,requests:[],receipts:[]}};c.TODOS.push(review);c.PROJECT_FILES.P.planDesignFiles=[{id:'MANUAL',name:'手动维护平面.pdf'}];
 c.dr186UpgradeTask(review);assert.equal(review.status,'待处理');assert.equal(review.legacyDesignSnapshot186.status,'已驳回');assert.equal(review.drawings[1].type,'其他图');c.actor='设计甲';c.dr185Resubmit(review,{drawings:review.drawings.map(d=>({id:d.id,type:d.type,file:d.file}))},0);
 c.actor='PM';c.dr185Review(review,review.drawings[0].id,'confirm',2);c.dr185Review(review,review.drawings[1].id,'confirm',2);c.dr187Sync(review,review.editRevision);
 assert.equal(review.status,'已处理');assert.deepEqual(copy(c.PROJECT_FILES.P.planDesignFiles).map(f=>f.id),['MANUAL','F1']);assert.equal(c.PROJECT_FILES.P.otherDesignFiles[0].id,'F2');assert.equal(c.PROJECT_FILES.P.intent3DFiles.length,0);assert.equal(c.PROJECT_FILES.P.wholeHouse3DFiles.length,0);
});
test('旧附件归入其他图并保留原文件，重复迁移不重复；四类附件可复制重开且评分不叠加',()=>{
 const c=fixture(),bag={designFile:[{id:'A',name:'旧图纸.pdf'},{id:'B',name:'带类型.jpg',designDrawingType:'全屋3D图'}]};assert.equal(c.dr186GroupLegacy(bag),true);assert.equal(bag.otherDesignFiles[0].id,'A');assert.equal(bag.wholeHouse3DFiles[0].id,'B');assert.equal(c.dr186GroupLegacy(bag),false);assert.equal(bag.designFile.length,2);
 vm.runInContext(slice(read('crm.js'),'function cloneFiles(','function fileNamesOf('),c);const reopened=c.cloneFiles(bag);assert.equal(reopened.otherDesignFiles[0].id,'A');assert.equal(reopened.wholeHouse3DFiles[0].id,'B');
 c.projectDesignDocumentScore=()=>0;vm.runInContext("projectDesignDocumentScore=function(data,files){const ready=key=>Array.isArray(files?.[key])&&files[key].some(f=>f?.name&&(f.id||f.url||f.dataUrl||f.src));return (ready('drawingAttachment')?10:0)+(Object.values(DR186_GROUPS).some(ready)?20:0);};",c);assert.equal(c.projectDesignDocumentScore({},bag),20);
});

test('分配校验时间、协调员，承接后生成设计单时把两项传至 GDS',()=>{
 const c=fixture();assert.throws(()=>c.dw132CreateOpportunities('P',['设计甲']),/期望完成/);assert.throws(()=>c.dw132CreateOpportunities('P',['设计甲'],'','',{expectedCompletionAt:'2026-10-25'}),/协调员/);assert.throws(()=>c.dr187Coordination({mode:'pm',person:'不存在'}),/协调员/);
 c.OPPS[0][20].expectedCompletionAt=c.tfExpected('2026-10-25');c.OPPS[0][20].coordination={mode:'pm',person:'PM'};c.actor='设计甲';c.oqConfirmQuote('Q',1);const t=c.TODOS.find(t=>t.type==='设计待办');assert.equal(t.expectedCompletionAt,c.tfExpected('2026-10-25'));assert.equal(t.coordination.person,'PM');assert.equal(t.gds.requests[0].payload.coordination.person,'PM');
});
test('设计回传不结束设计待办，多次回传追加图纸；同步审核和 GDS 完成独立',()=>{
 const c=fixture(),r=deliver(c),d=c.TODOS.find(t=>t.type==='设计待办');assert.equal(d.status,'待处理');c.actor='设计甲';const again=c.dr185Submit(d,{drawings:[{id:'C',type:'3D意向图',file:{id:'FC',name:'意向.jpg'}}]});assert.equal(again.id,r.id);assert.equal(r.drawings.length,3);
 c.actor='PM';assert.throws(()=>c.dr187Sync(r,r.editRevision),/全部图纸/);for(const drawing of r.drawings)c.dr185Review(r,drawing.id,'confirm',drawing.revision);const before=copy({files:c.PROJECT_FILES,todos:c.TODOS});c.failSave=true;assert.throws(()=>c.dr187Sync(r,r.editRevision),/未保存/);assert.deepEqual(copy({files:c.PROJECT_FILES,todos:c.TODOS}),before);c.failSave=false;const current=c.TODOS.find(t=>t.id===r.id);c.dr187Sync(current,current.editRevision);assert.equal(current.status,'已处理');assert.equal(c.TODOS.find(t=>t.id===d.id).status,'待处理');
 const source=c.TODOS.find(t=>t.id===d.id);c.gds171Receive({system:'GDS',task:source.id,eventId:'COMPLETE',actor:'设计甲',revision:source.gds.revision,action:'complete'});assert.equal(source.status,'已处理');assert.equal(source.gdsCompleted,true);
});
test('PM 指定协调员可以办理审核，其他人无权；催办永远是次操作',()=>{
 const c=fixture(),r=deliver(c);r.coordination={mode:'pm',person:'设计乙'};c.actor='设计乙';assert.equal(c.v21CanOperate(r),true);c.dr185Review(r,'A','confirm',1);c.actor='其他人';assert.throws(()=>c.dr185Review(r,'B','confirm',1),/不可办理/);c.actor='PM';c.todoActs(r);const actions=c.todoActs(r);assert.equal(actions[0].primary,true);assert.equal(actions[0].act,'plannedTodoDo');
});
test('设计师安排协调员在 GDS 确认，PM 只需同步；GDS 完成不结束审核',()=>{
 const c=fixture();c.OPPS[0][20].coordination={mode:'designer'};c.actor='设计甲';c.oqConfirmQuote('Q',1);const t=c.TODOS.find(t=>t.type==='设计待办');const receipt={system:'GDS',task:t.id,eventId:'REMOTE',actor:'设计甲',revision:t.gds.revision,action:'submit',contents:{coordinator:'远端协调员',coordinatorConfirmed:true,drawings:[{id:'A',type:'平面设计图',file:{name:'平面.jpg'}}]}};const response=c.gds171Receive(receipt),r=c.TODOS.find(t=>t.id===response.nextTask);assert.equal(r.drawings[0].status,'已确认');assert.equal(r.coordination.gdsPerson,'远端协调员');assert.equal(r.status,'待处理');c.gds171Receive({system:'GDS',task:t.id,eventId:'DONE',actor:'设计甲',revision:t.gds.revision,action:'complete'});assert.equal(r.status,'待处理');c.actor='PM';c.dr187Sync(r,r.editRevision);assert.equal(r.status,'已处理');
});
test('前批同步后可创建下一审核批次，原审核结果与附件不变',()=>{
 const c=fixture(),r=deliver(c),d=c.TODOS.find(t=>t.type==='设计待办');c.actor='PM';for(const f of r.drawings)c.dr185Review(r,f.id,'confirm',1);c.dr187Sync(r,r.editRevision);const first=copy(r),files=copy(c.PROJECT_FILES.P);
 c.actor='设计甲';const next=c.dr185Submit(d,{drawings:[{id:'NEXT',type:'其他图',file:{id:'NEXTFILE',name:'补充图.jpg'}}]});assert.notEqual(next.id,r.id);assert.deepEqual(copy(r),first);assert.deepEqual(copy(c.PROJECT_FILES.P),files);assert.equal(d.status,'待处理');c.actor='PM';c.dr185Review(next,'NEXT','confirm',1);c.dr187Sync(next,next.editRevision);assert.equal(c.PROJECT_FILES.P.designFile.length,3);assert.deepEqual(copy(r),first);
});
test('设计催办模拟 GDS 回传，失败不消耗催办次数或留下半条审核',()=>{
 const c=fixture();c.actor='设计甲';c.oqConfirmQuote('Q',1);const id=c.TODOS.find(t=>t.type==='设计待办').id;
 c.V72={messages:[]};c.tfRemind=(taskId)=>{const t=c.TODOS.find(t=>t.id===taskId);if(t.reminders?.length)throw Error('24小时');t.reminders=[{at:'now'}];c.V72.messages.push({task:taskId});return t.reminders[0];};
 vm.runInContext(read('designScenario.js'),c);c.actor='PM';const before=copy({todos:c.TODOS,messages:c.V72.messages});c.failSave=true;assert.throws(()=>c.tfRemind(id),/未保存/);assert.deepEqual(copy({todos:c.TODOS,messages:c.V72.messages}),before);c.failSave=false;c.tfRemind(id);const task=c.TODOS.find(t=>t.id===id);assert.equal(task.status,'待处理');assert.equal(c.TODOS.filter(t=>t.type==='设计确认待办').length,1);assert.throws(()=>c.tfRemind(id),/24小时/);assert.equal(task.reminders.length,1);
});
