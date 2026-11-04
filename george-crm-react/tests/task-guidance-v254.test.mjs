import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/compat/runtime/taskGuidance.js',import.meta.url),'utf8');
const plain=v=>JSON.parse(JSON.stringify(v));
function fixture(){
 let actor='SM';const project=[];project[0]='PJ';project[9]='PM';const opp=[];opp[0]='O';opp[4]='PJ';opp[20]={};
 const task={id:'Q-TASK',type:'报价待办',project:'PJ',opp:'O',draft:'Q',owner:'SM',initiator:'PM',status:'待处理'};
 const c={PROJECTS:[project],PROJECT_EXTRA:{PJ:{}},OPPS:[opp],TODOS:[task],V3:{meta:{Q:{project:'PJ',revision:2,currentQuoteVersion:'Q:2',submitted:{},workingSaved:true,workingSavedAt:'2026-11-03 20:00',workingSavedBy:'Assistant'}}},v17Owner:()=>actor,oqTaskQuoteCode:t=>t.draft,oqQuoteOpp:code=>code==='Q'?opp:null,oqLockReason:()=>'',crmTodoEnabled:t=>!t.retired,v21FlowAllowed:()=>true,v21CanOperate:()=>false,qaAssistant:t=>actor==='Assistant'&&t.quoteAssistant==='Assistant'};
 vm.createContext(c);vm.runInContext(source,c);return {c,task,actor:name=>actor=name,guide:t=>plain(c.tg254TaskGuidance(t||task))};
}
test('quote reopening identifies actual saved actor and separates the SM, assistant, PM, customer and external handoffs without changing business',()=>{
 const {c,task,actor,guide}=fixture();task.quoteAssistant='Assistant';task.quoteReactivations246=[{versionId:'Q:2',at:'2026-11-03 19:59',by:'Assistant'}];const before=JSON.stringify([c.TODOS,c.V3,c.PROJECT_EXTRA]);
 let g=guide();assert.equal(g.current.relation,'由我办理');assert.equal(g.cause.actor,'Assistant');assert.equal(g.cause.at,'2026-11-03 19:59');assert.equal(g.cause.label,'重新激活原因');assert.equal(g.handoffs[0].owner,'SM');assert.equal(g.handoffs[0].relation,'由我办理');assert.equal(g.handoffs[1].relation,'客户办理');assert.match(g.handoffs[2].text,/本单实收≥20%/);
 actor('Assistant');assert.equal(guide().current.relation,'我可协助办理');actor('PM');g=guide();assert.equal(g.current.relation,'由他人办理');assert.equal(g.handoffs[0].relation,'由他人办理');assert.equal(JSON.stringify([c.TODOS,c.V3,c.PROJECT_EXTRA]),before);
});
test('first working save is not a reopened submission and unrelated quotation context supplies no cause',()=>{
 const {c,task,guide}=fixture();delete c.V3.meta.Q.submitted;assert.equal(guide().cause,null);c.V3.meta.Q.submitted={};c.V3.meta.Q.project='OTHER';assert.equal(guide().cause,null);c.V3.meta.Q.project='PJ';c.oqQuoteOpp=()=>['OTHER'];assert.equal(guide().cause,null);task.status='已处理';assert.equal(guide().cause,null);
});
test('space cause prefers exact recorded revision even in the same minute and preserves rename, added, deleted and reordered identities',()=>{
 const {c,task,guide}=fixture(),at='2026-11-03 20:00';const before=[{id:'1',name:'客厅'},{id:'2',name:'卧室'}],after=[{id:'3',name:'餐厅'},{id:'1',name:'起居室'}];
 Object.assign(c.V3.meta.Q,{needsSpaceUpdate:true,spaceChangeAt:at,pendingCause254:{kind:'space-change',at,actor:'PM',spaceRevision:8}});task.statusHistory=[{status:'已处理',time:at}];c.PROJECT_EXTRA.PJ.spaceChangeHistory=[{revision:7,time:at,before:[],after:[{id:'x',name:'不应混入'}],actor:'Other'},{revision:8,time:at,before,after,actor:'PM'}];
 const cause=guide().cause;assert.equal(cause.kind,'space-change');assert.equal(cause.actor,'PM');assert.equal(cause.label,'重新激活原因');assert.deepEqual(cause.changes,['空间改名：客厅 → 起居室','删除空间：卧室（已有产品需核对归置）','新增空间：餐厅']);assert.deepEqual(plain(c.tg254SpaceChanges(before,[before[1],before[0]])),[]);
 delete c.V3.meta.Q.pendingCause254;assert.deepEqual(guide().cause.changes,[]);assert.equal(guide().cause.actor,'');
});
test('pending acceptance distinguishes its conditional future quote and rejected work belongs to the initiator',()=>{
 const {task,guide}=fixture();Object.assign(task,{type:'确认商机',status:'待处理'});delete task.opp;delete task.draft;let g=guide();assert.equal(g.handoffs[0].condition,'接单成功后');assert.equal(g.handoffs[0].status,'');task.status='已驳回';g=guide();assert.equal(g.current.owner,'PM');assert.match(g.current.text,/修改原记录/);assert.equal(g.handoffs[0].owner,'SM');
});
test('exact successor status is honored; completed downstream work is not presented as a new personal action',()=>{
 const {c,task,guide}=fixture();task.status='已处理';task.type='确认商机';task.createdOppId='O';const successor={id:'NEXT',type:'报价待办',project:'PJ',opp:'O',owner:'SM',status:'已处理'};c.TODOS.push(successor);let g=guide();assert.equal(g.current.relation,'已处理');assert.equal(g.handoffs[0].relation,'已处理');assert.match(g.handoffs[0].text,/已完成/);successor.project='OTHER';g=guide();assert.equal(g.handoffs[0].status,'');
});
test('unviewable downstream records do not expose the assignee or status, or add handling permissions',()=>{
 const {c,task,guide}=fixture();Object.assign(task,{type:'确认商机',createdOppId:'O'});c.TODOS.push({id:'N',type:'报价待办',project:'PJ',opp:'O',owner:'PRIVATE-NAME',status:'待处理'});c.v21FlowAllowed=()=>false;const g=guide();assert.equal(g.handoffs[0].owner,'');assert.equal(g.handoffs[0].status,'');assert.doesNotMatch(JSON.stringify(g),/PRIVATE-NAME/);
});
test('rejected drawings identify the separate designer resubmission and do not finish the design or PM review task',()=>{
 const {c,task,guide}=fixture();Object.assign(task,{type:'设计确认待办',order:'XF1',sourceTodoId:'DESIGN',drawingWorkflow185:true,owner:'PM',initiator:'Designer',drawings:[{status:'已驳回'},{status:'已确认'}]});c.TODOS.push({id:'DESIGN',type:'设计待办',project:'PJ',opp:'O',order:'XF1',owner:'Designer',status:'待处理'});const before=JSON.stringify(c.TODOS),g=guide();assert.equal(g.current.relation,'待设计方反馈');assert.equal(g.handoffs[0].owner,'Designer');assert.match(g.handoffs[0].text,/仅修改并重提已驳回/);assert.match(g.handoffs[1].text,/独立推进/);assert.equal(JSON.stringify(c.TODOS),before);
});
test('fee request handoff is system processing, while cancelled tasks have no actionable successor',()=>{
 const {task,guide}=fixture();task.type='费用订单待办';let g=guide();assert.equal(g.handoffs[0].relation,'系统衔接');assert.match(g.handoffs[0].text,/以ERP回执为准/);task.status='已取消';task.cancelReason='原申请已取消';g=guide();assert.equal(g.current.text,'原申请已取消');assert.equal(g.handoffs.length,0);
});
test('confirmed and stocked quotes describe achieved results and delivery, while saved edits require the next publication confirmation',()=>{
 const {c,task,guide}=fixture();task.status='已处理';Object.assign(c.V3.meta.Q,{categories:['家具'],confirmedCats:['家具'],workingSaved:false});c.oqLockReason=()=> '订单已进入备货或后续环节，请通过商机加单新增采购';let g=guide();assert.equal(g.handoffs[1].status,'已确认');assert.match(g.handoffs[2].text,/跟进交付/);task.status='待处理';c.V3.meta.Q.workingSaved=true;g=guide();assert.equal(g.handoffs[1].status,'');assert.match(g.handoffs[1].text,/新发布/);
});
test('product hint separates submission/publication and ERP request from customer approval before stocking and working saves',()=>{
 const {c,guide,actor,task}=fixture();c.PROJECTS[0][9]='李明';c.OPPS[0][7]='林晓';const before=JSON.stringify([c.TODOS,c.V3]);let line=guide().nextStep;assert.match(line,/提交后.*更新至客户链接.*发起ERP传输/);assert.match(line,/备货前须由客户确认报价/);assert.match(line,/保存仅暂存，不发布、不传ERP/);assert.doesNotMatch(line,/PM|李明|WhatsApp|群|ERP已接收/);actor('Assistant');assert.equal(guide().nextStep,line);task.status='已处理';c.V3.meta.Q.workingSaved=false;assert.equal(guide().nextStep,'报价已提交；备货前须由客户确认报价');task.status='待处理';c.V3.meta.Q.workingSaved=true;assert.equal(JSON.stringify([c.TODOS,c.V3]),before);
});
test('compact handoff distinguishes future acceptance from actual completion and keeps rejected-drawing responsibility',()=>{
 const {c,task,guide}=fixture();task.type='确认商机';delete task.opp;delete task.draft;assert.equal(guide().nextStep,'接单后，报价负责人 SM办理报价');task.status='已处理';task.createdOppId='O';c.TODOS.push({id:'N',type:'报价待办',project:'PJ',opp:'O',owner:'SM',status:'已处理'});assert.equal(guide().nextStep,'');Object.assign(task,{type:'设计确认待办',status:'待处理',owner:'PM',initiator:'设计师王',drawingWorkflow185:true,drawings:[{status:'已驳回'}]});assert.equal(guide().nextStep,'设计方 设计师王重提被驳回图纸');
});
