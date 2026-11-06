import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {setup,quote} from '../george-crm-react/tests/helpers/quotation-runtime.mjs';
import {isCurrentNotification} from '../george-crm-react/src/features/todos/model.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=n=>fs.readFileSync(path.join(root,'george-crm-react/src/compat/runtime/'+n+'.js'),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
const files=Object.fromEntries(['workflows','policy','opportunityQuotes','expenseWorkflow','managementMonitoring','procurementWorkflow','designOrderDelivery','quoteAssistance','quoteRevision'].map(n=>[n,read(n)]));
const section=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i);assert.ok(i>=0&&j>i,a);return s.slice(i,j);};
const line=(s,predicate)=>{const row=s.split(/\r?\n/).find(predicate);assert.ok(row,'Required source line');return row;};
function runtime(world){
 const c={TextEncoder,console,Date,Set,Map,actor:world.actor||'PM',v3Copy:copy,todoStamp:()=> '2026-11-04 21:20',todoCatKey:t=>t.cat||t.smDept||'',quoteSmOf:()=> 'SM',V68_APPROVALS:['跨区域商机审批待办','转介绍商机审批待办'],PMS:['PM'],dw132Designers:()=> ['Designer','设计甲','设计乙'],orderOppOf:o=>o[17],v125DraftBatch:d=>({oppId:d.oppId||d.opp||''}),markPagesDirty(){},v5SyncNav(){},v72SaveMessages(){return true;},esc:v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))};
 const bind=()=>{for(const key of ['PROJECTS','PROJECT_EXTRA','TODOS','V3','OPPS','ORDERS','DRAFT_DATA','PROJECT_QUOTES'])c[key]=world[key];c.actor=world.actor||'PM';};bind();c.v17Owner=()=>c.actor;vm.createContext(c);
 const run=code=>vm.runInContext(code,c);
 run(section(files.policy,'const CRM_PAUSED_TODO_TYPES','const CRM_ORDER_ONLY_FLOW'));
 run(section(files.policy,'function crmTaskCategory(','function crmTaskMatchesCategory('));c.v18Name=t=>c.crmTaskCategory(t);
 run(section(files.workflows,'const V72_TYPES=','/* Local notification demonstration;'));
 run(section(files.opportunityQuotes,'const OQ_RETIRED_TODO_TYPES','function oqRequiresSpaces('));
 run(line(files.opportunityQuotes,l=>l.startsWith('function oqOpp('))+'\n'+line(files.opportunityQuotes,l=>l.startsWith('function oqQuoteOpp(')));
 run(section(files.opportunityQuotes,'function oqIsCustomerConfirmation(','function oqPrepareConfirmedSample('));
 run(section(files.opportunityQuotes,"if(typeof V72_TYPES!=='undefined'){","if(typeof v73TextCard==='function')"));
 run("const EF_TYPE='费用订单待办';"+line(files.expenseWorkflow,l=>l.startsWith("if(typeof V72_TYPES")));
 run(line(files.expenseWorkflow,l=>l.startsWith("if(typeof v72NotificationEvents")));
 run(section(files.managementMonitoring,'function mmQuotationResultEvents(',"if(typeof v72Go==='function')"));
 run(line(files.procurementWorkflow,l=>l.startsWith('const pw173RetiredBase='))+'\n'+line(files.procurementWorkflow,l=>l.startsWith('crmTodoEnabled=function')));
 run(line(files.designOrderDelivery,l=>l.startsWith('function dr185Source(')));
 run(section(files.designOrderDelivery,"if(typeof v72NotificationEvents==='function'){","if(typeof window!=='undefined'&&window.CRMDesignIntegration)"));
 run(line(files.designOrderDelivery,l=>l.startsWith("if(typeof crmTodoEnabled==='function')")));
 run(line(files.designOrderDelivery,l=>l.startsWith("if(typeof v72NotificationEvents")&&l.includes('flatMap')));
 run(section(files.workflows,'function v72MessageInitiator(','const V72={'));
 run(section(files.workflows,'function v73Bytes(','function v72Card('));
 run(line(files.opportunityQuotes,l=>l.startsWith("if(typeof v73TextCard==='function')")));
 run(section(files.managementMonitoring,"if(typeof v73TextCard==='function')",'const mmStyle='));
 run("const V72={messages:[],sequence:0,baseline:v72Snapshot(),storageOk:true};");
 run(section(files.workflows,'function v72Collect(){','const v72BaseSave='));
 return {c,collect(){bind();c.v72Collect();return this.messages();},messages(){return copy(vm.runInContext('V72.messages',c)).filter(isCurrentNotification).map(m=>({...m,card:copy(c.v73TextCard(m))}));},clear(){run('V72.messages=[];');}};
}
function world(){const p=[];p[0]='P';p[1]='测试项目';p[7]='测试客户';p[9]='PM';const o=[];o[0]='OPP';o[4]='P';o[7]='SM';return {actor:'PM',PROJECTS:[p],PROJECT_EXTRA:{},TODOS:[],V3:{meta:{}},OPPS:[o],ORDERS:[],DRAFT_DATA:{Q:{oppId:'OPP'}},PROJECT_QUOTES:{}};}
const task=(type='报价待办',extra={})=>({id:'TASK',type,project:'P',opp:'OPP',customer:'测试客户',cat:'家具',owner:'SM',initiator:'PM',status:'待处理',draft:type==='报价待办'?'Q':'',editRevision:0,...extra});
const compact=messages=>messages.map(m=>({event:m.event,recipient:m.recipient,title:m.title,task:m.task||'',button:m.card.btntxt,body:m.body}));
const cases=[];
function scenario(name,before,after){const w=world();Object.assign(w,copy(before));const n=runtime(w);Object.assign(w,copy(after));const messages=n.collect();cases.push({name,messages:compact(messages)});return messages;}
// Actual quotation actions, followed by the complete current notification chain and collector.
const b=setup();b.actor='SM';const n=runtime(b),q=quote(b);n.collect();n.clear();
Object.assign(b,{V21:{view:'team'},V68_SMS:[],mgOpportunityState:()=> '报价中',v21Rows:()=>[],v21FlowAllowed:()=>false,visibleTodos:()=>b.TODOS,bindPimsFrame:()=>{},mgTaskBusinessInfo:()=>({}),v21AllowedOwners:()=>[b.actor],window:{addEventListener(){}},tfStoredTasks:()=>[],v3CloseDialog(){}});
vm.runInContext(files.quoteAssistance,b);
const t=b.TODOS[0],assignments=[];
for(const person of ['助理A','助理B','']){b.qaSetAssistant(t.id,person,t.quoteAssistRevision||0);assignments.push({person,events:compact(n.collect())});n.clear();}
b.qaSetAssistant(t.id,'助理A',t.quoteAssistRevision);n.collect();n.clear();
b.actor='助理A';b.applyDraftSaved({...q.data,submissionRequestId:'verify-publish'});const published=n.collect();n.clear();
assert.equal(published[0]?.initiator,'助理A');assert.equal(t.quoteRevision,1);
b.actor='SM';b.applyDraftSaved({...q.data,submissionRequestId:'verify-direct-resubmit'});const direct=n.collect();n.clear();
assert.equal(direct.length,1);assert.equal(direct[0].revision,2);assert.equal(direct[0].initiator,'SM');assert.equal(t.quoteRevision,1);
b.applyDraftSaved({...q.data,submissionRequestId:'verify-direct-resubmit'});const retry=n.collect();n.clear();assert.equal(retry.length,0);
b.v3QuickSave(q.data);const saved=n.collect();n.clear();b.v3QuickSave(q.data);const repeatedSave=n.collect();n.clear();
b.applyDraftSaved({...q.data,submissionRequestId:'verify-publish-again'});const resubmitted=n.collect();n.clear();
assert.equal(resubmitted.length,1);assert.equal(resubmitted[0].revision,3);assert.equal(b.V3.meta[q.code].quoteVersions.length,3);assert.equal(b.oqOrder(q.code)[18].erpRequests.length,3);
const shapeBefore=copy(b.PROJECT_EXTRA.P.formData.spaceCats),shapeAfter=copy(shapeBefore);shapeAfter[0].name='起居室';
b.qNum=Number;b.v125SpaceImpact=()=>({project:'P',affected:['家具'],removed:[],editable:[q.code],protected:[]});
vm.runInContext(section(files.quoteRevision,'function v125ApplySpaceImpact(','// Category-only projects'),b);
b.actor='PM';b.v125ApplySpaceImpact('P',shapeBefore,shapeAfter);b.PROJECT_EXTRA.P.formData.spaceCats=shapeAfter;const spaceChanged=n.collect();
assert.equal(t.status,'待处理');assert.equal(b.V3.meta[q.code].needsSpaceUpdate,true);
assert.ok(assignments.every(x=>x.events.length===0));assert.equal(saved.length,0);assert.equal(repeatedSave.length,0);assert.equal(spaceChanged.length,0);
assert.deepEqual(published.filter(m=>m.recipient==='PM').map(m=>m.event),['quote-erp-requested']);
for(const m of [...published,...direct,...resubmitted]){assert.equal(m.task,t.id);assert.equal(m.card.btntxt,'查看报价待办');assert.match(m.body,/报价已提交.*报价待办已完成.*ERP传输请求已记录/);}
const arrivals=['项目待办','确认商机','报价待办','设计待办','设计确认待办','跨区域商机审批待办','转介绍商机审批待办','费用订单待办'];
for(const type of arrivals){const owner=type==='项目待办'||type==='设计确认待办'?'PM':type.includes('审批')?'Office':type==='设计待办'?'Designer':type==='费用订单待办'?'FeeHandler':'SM';const extra=type==='设计待办'?{drawingWorkflow185:true}:type==='设计确认待办'?{owner,initiator:'Designer',drawingWorkflow185:true,coordination:{mode:'pm',person:'Coordinator'}}:{};scenario('到达：'+type,{TODOS:[]},{TODOS:[task(type,{...extra,owner})]});}
scenario('设计商机接单到达',{TODOS:[]},{TODOS:[task('确认商机',{owner:'Designer',designOpportunity:true})]});
scenario('设计报价到达',{TODOS:[]},{TODOS:[task('报价待办',{owner:'Designer',designOpportunity:true})]});
const pending=task('确认商机');
scenario('待办资料更新',{TODOS:[pending]},{TODOS:[{...pending,editRevision:1,lastEdit:{actor:'PM',fromStatus:'待处理'}}]});
scenario('驳回后编辑原待办重提',{TODOS:[{...pending,status:'已驳回'}]},{TODOS:[{...pending,editRevision:1,lastEdit:{actor:'PM',fromStatus:'已驳回'}}]});
scenario('待办移交',{TODOS:[pending]},{TODOS:[{...pending,owner:'NewSM'}]});
scenario('接单完成结果',{TODOS:[pending]},{TODOS:[{...pending,status:'已处理',approver:'SM'}]});
scenario('拒绝或驳回结果',{TODOS:[pending]},{TODOS:[{...pending,status:'已驳回',approver:'SM',rejectReason:'需补充资料'}]});
for(const type of ['跨区域商机审批待办','转介绍商机审批待办'])for(const status of ['已处理','已驳回']){const p=task(type,{owner:'Office'});scenario(type+'：'+status,{TODOS:[p]},{TODOS:[{...p,status,approver:'Office',rejectReason:status==='已驳回'?'需补充附件':''}]});}
for(const status of ['已处理','已驳回']){const p=task('费用订单待办',{owner:'FeeHandler',feeType:'安装费'});scenario('费用办理：'+status,{TODOS:[p]},{TODOS:[{...p,status,approver:'FeeHandler',rejectReason:status==='已驳回'?'金额需核对':''}]});}
const review=task('设计确认待办',{owner:'PM',initiator:'Designer',drawingWorkflow185:true,coordination:{mode:'pm',person:'Coordinator'},drawingEvents:[]});
for(const event of ['confirm','reject','resubmit']){const recipient=event==='resubmit'?'PM':'Designer';const msgs=scenario('单张图纸：'+event,{TODOS:[review]},{TODOS:[{...review,drawingEvents:[{id:'drawing:1:'+event,event,name:'客厅平面图',revision:2,recipient,by:event==='resubmit'?'Designer':'PM',reason:event==='reject'?'请补尺寸':''}]}]});if(event==='confirm')assert.equal(msgs.length,0);}
scenario('设计定稿同步完成',{TODOS:[review]},{TODOS:[{...review,status:'已处理',approver:'PM'}]});
const design=task('设计待办',{owner:'Designer',initiator:'PM',drawingWorkflow185:true});scenario('GDS完成设计中任务',{TODOS:[design]},{TODOS:[{...design,status:'已处理',approver:'Designer'}]});
const meta={project:'P',revision:1,categories:['家具'],confirmedCats:[],bindings:{},submitted:{oppId:'OPP'},submittedBy:'SM'};
scenario('客户确认报价',{TODOS:[task()],V3:{meta:{Q:meta}}},{TODOS:[task()],V3:{meta:{Q:{...meta,confirmedCats:['家具'],confirmedBy:'客户'}}}});
const retired=scenario('已退休订单待办到达',{TODOS:[]},{TODOS:[task('订单待办')]});assert.equal(retired.length,0);
assert.equal(cases.find(x=>x.name==='单张图纸：resubmit').messages.length,2);
const result={verification:'Actual product mutations + runtime-ordered current notification wrappers + real collector/card renderer and React visibility predicate; no browser or external messages',assistantAssignment:assignments,submittedQuoteMessages:compact(published),directResubmission:compact(direct),sameRequestRetry:compact(retry),resubmissionAfterSave:compact(resubmitted),savedReactivation:compact(saved),repeatSave:compact(repeatedSave),pmSpaceReactivation:compact(spaceChanged),cases,submissionAndErpHistoriesRetained:true,singleDrawingConfirmationNotice:false,applicationFilesModified:true};
fs.writeFileSync(path.join(root,'work/v264-current-notification-verification.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({pendingQuotePublicationPM:compact(published).map(x=>[x.event,x.button]),actualSubmitter:published[0].initiator,directResubmissionMessages:direct.length,repeatRequestMessages:retry.length,resubmissionAfterSaveMessages:resubmitted.length,historyVersions:b.V3.meta[q.code].quoteVersions.length,cases:cases.length,customerConfirmationRecipients:cases.find(x=>x.name==='客户确认报价').messages.map(m=>m.recipient),externalMessagesSent:0}));
