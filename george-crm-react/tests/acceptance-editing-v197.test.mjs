import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL('../src/compat/runtime/'+name,import.meta.url),'utf8');
const cut=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
const copy=x=>JSON.parse(JSON.stringify(x));
function boot(tasks=[]){
 const c={TODOS:copy(tasks),OPPS:[],PROJECTS:[['P','项目','','','','美国','北美','客户','','PM']],PROJECT_EXTRA:{P:{}},V68:{},V68_APPROVALS:['跨区域商机审批待办','转介绍商机审批待办'],V68_OFFICE:'总经办',PMS:['PM','介绍人'],actor:'PM',admin:false,saves:0,fail:false,DESIGNERS:['主管A','主管B'],V68_SMS:[{name:'家具甲',cat:'家具',regions:['北美']},{name:'家具乙',cat:'家具',regions:['北美']},{name:'灯饰甲',cat:'灯饰',regions:['北美']},{name:'跨区甲',cat:'家具',regions:['中东']},{name:'跨区乙',cat:'家具',regions:['欧洲']}],v3Copy:copy,document:{addEventListener(){}},v17Owner:()=>c.actor,v21SuperAdmin:()=>c.admin,v72Person:x=>x||'',v81EditValues:t=>({summary:t.title||'',note:t.note||'',attachments:copy(t.attachments||[])}),v81NormaliseEdit:()=>{},v81SubmitTodoEdit:()=>{},v81OpenTodoEdit:()=>{},handleAct:()=>{},v68SubmitAllocationData:d=>c.addChainTodo({type:'确认商机',project:d.project,owner:d.sm,allocation:copy(d)}),ua176ShowReferral:()=>{},findProject:p=>c.PROJECTS.find(row=>row[0]===p),v68Region:()=> '北美',ua176Supervisors:()=>['主管A','主管B'],pw173ProjectSpaces:()=>c.spaces,pw173SpaceError:s=>s?.length?'':'空间未填写',spaces:[{id:'S',name:'客厅'}],assertProjectAllocationActor:()=>{if(c.actor!=='PM'&&!c.admin)throw Error('无权分配');},todoStamp:()=> '2026-10-19 19:00',dqFiles:files=>{if(!Array.isArray(files)||files.length>10||files.some(f=>!f||typeof f.name!=='string'))throw Error('附件格式无效');return copy(files);},DR187_COORDINATOR_MODES:{designer:'是，由设计师安排',pm:'是，我安排人员',self:'否，我自己确认'},dr187People:()=>['PM','协调员'],v82TodoRejectionReason:t=>t.rejectReason||'',esc:String};
 c.dr187Coordination=v=>{if(!['designer','pm','self'].includes(v?.mode)||v.mode==='pm'&&!c.dr187People().includes(v.person))throw Error('请选择有效的协调员');return {mode:v.mode,person:v.mode==='pm'?v.person:''};};
 c.addChainTodo=d=>{const t={id:'N'+c.TODOS.length,status:'待处理',...copy(d)};c.TODOS.push(t);return t;};
 c.v68CreateOpportunity=()=>{c.createCalled=true;return 'EXISTING';};
 c.bs131Atomic=change=>{const before=copy({todos:c.TODOS,opps:c.OPPS});try{const value=change();if(c.fail)throw Error('修改未保存');c.saves++;return value;}catch(e){c.TODOS.splice(0,c.TODOS.length,...before.todos);c.OPPS.splice(0,c.OPPS.length,...before.opps);throw e;}};
 vm.createContext(c);
 vm.runInContext(cut(read('workflows.js'),'function v81TodoSupportsRejection(','function v81SubmitCustomerNeed(')+cut(read('workflows.js'),'function v68AllocationConflict(','function v68SourceDesign(')+cut(read('taskFollowup.js'),'function tfDate(','function tfTime(')+cut(read('unifiedAllocation.js'),'function ua176AllocationError(','const ua176SubmitDataBase='),c);
 vm.runInContext(read('acceptanceEditing.js'),c);return c;
}
const product=(extra={})=>({id:'T',type:'确认商机',project:'P',title:'项目-家具',owner:'家具甲',initiator:'PM',cat:'家具',status:'待处理',time:'2026-10-18 08:00',allocation:{project:'P',mode:'normal',cat:'家具',sm:'家具甲'},...extra});
const design=()=>product({owner:'主管A',cat:'设计服务',designOpportunity:true,expectedCompletionAt:'2026-10-20T23:59:59.999+08:00',coordination:{mode:'self',person:''},allocation:{project:'P',mode:'design',sm:'主管A',cat:'设计服务'}});
const image={name:'同意截图.png',url:'data:image/png;base64,a'};
test('采购编辑按原区域及品类选人，保存同步负责人和分配资料，后续承接使用新 SM',()=>{
 const c=boot([product()]);assert.deepEqual(copy(c.ae197Candidates(c.TODOS[0])).map(p=>p.name),['家具甲','家具乙']);
 const r=c.v81SubmitTodoEdit('T',{allocation:{sm:'家具乙'}},0);assert.equal(r.task.id,'T');assert.equal(r.task.owner,'家具乙');assert.equal(r.task.allocation.sm,'家具乙');assert.equal(r.task.sm,'家具乙');assert.equal(r.task.cat,'家具');assert.equal(r.task.time,'2026-10-18 08:00');assert.equal(r.task.ownerHistory[0].actor,'PM');assert.equal(c.TODOS.length,1);assert.equal(c.OPPS.length,0);
 assert.throws(()=>c.v81SubmitTodoEdit('T',{allocation:{sm:'跨区甲'}},1),/区域及品类/);assert.throws(()=>c.v81SubmitTodoEdit('T',{allocation:{sm:'灯饰甲'}},1),/区域及品类/);
 vm.runInContext(cut(read('workflows.js'),'function v68CreateOpportunity(','function v68DecideApproval('),c);c.v68CreateOpportunity(r.task);assert.equal(c.OPPS[0][7],'家具乙');assert.equal(c.TODOS.find(t=>t.type==='报价待办').owner,'家具乙');
});
test('设计接单仅可选择主管，同时保存期望日期与协调员，未生成下游任务',()=>{
 const c=boot([design()]);c.spaces=[];const t=c.v81SubmitTodoEdit('T',{allocation:{sm:'主管B'},expectedCompletionAt:'2026-10-25',coordination:{mode:'pm',person:'协调员'}},0).task;
 assert.equal(t.owner,'主管B');assert.equal(t.allocation.sm,'主管B');assert.equal(t.expectedCompletionAt,'2026-10-25T23:59:59.999+08:00');assert.deepEqual(copy(t.allocation.coordination),{mode:'pm',person:'协调员'});assert.equal(c.TODOS.length,1);
 assert.throws(()=>c.v81SubmitTodoEdit('T',{allocation:{sm:'家具甲'}},1),/主管/);assert.throws(()=>c.v81SubmitTodoEdit('T',{expectedCompletionAt:''},1),/期望完成/);assert.throws(()=>c.v81SubmitTodoEdit('T',{coordination:{mode:'pm',person:''}},1),/协调员/);
});
test('跨区审批按区域外同品类选 SM，编辑不改变审批人或直接生成商机',()=>{
 const t=product({type:'跨区域商机审批待办',owner:'总经办',allocation:{project:'P',mode:'cross',cat:'家具',sm:'跨区甲',reason:'客户需求'}}),c=boot([t]);
 assert.deepEqual(copy(c.ae197Candidates(c.TODOS[0])).map(p=>p.name),['跨区甲','跨区乙']);
 const result=c.v81SubmitTodoEdit('T',{allocation:{sm:'跨区乙',reason:'补充原因'}},0).task;assert.equal(result.owner,'总经办');assert.equal(result.allocation.sm,'跨区乙');assert.equal(result.status,'待处理');assert.equal(c.OPPS.length,0);
 assert.throws(()=>c.v81SubmitTodoEdit('T',{allocation:{sm:'家具甲'}},1),/区域及品类/);assert.throws(()=>c.v81SubmitTodoEdit('T',{allocation:{reason:''}},1),/申请原因/);
});
test('区域分配有转介绍人生成审批；采购接单增加转介绍时原待办转审批并保留履历',()=>{
 const c=boot(),data={project:'P',mode:'normal',cat:'家具',sm:'家具甲',referrer:'介绍人',reason:'客户推荐',attachments:[image],evidence:{leader:image}};
 const created=c.v68SubmitAllocationData(data);assert.equal(created.type,c.V68_APPROVALS[1]);assert.equal(created.owner,'总经办');assert.equal(created.allocation.mode,'referral');assert.equal(c.OPPS.length,0);
 c.v21CanOperate=t=>t.owner===c.actor;c.actor='总经办';vm.runInContext(cut(read('workflows.js'),'function v68CreateOpportunity(','function v68Review('),c);c.v68DecideApproval(created.id,true);assert.equal(created.status,'已处理');assert.equal(c.OPPS.length,1);assert.equal(c.TODOS.find(t=>t.type==='报价待办').owner,'家具甲');
 const b=boot([product()]);const task=b.v81SubmitTodoEdit('T',{allocation:{sm:'家具乙',referrer:'介绍人',reason:'客户推荐'},attachments:[image]},0).task;
 assert.equal(task.id,'T');assert.equal(task.type,b.V68_APPROVALS[1]);assert.equal(task.owner,'总经办');assert.equal(task.allocation.sm,'家具乙');assert.equal(task.allocation.evidence.leader.name,image.name);assert.equal(task.editHistory.length,1);assert.equal(b.TODOS.length,1);
});
test('转介绍审批编辑需保留转介绍人、原因和主管截图，负责人是审批岗',()=>{
 const t=product({type:'转介绍商机审批待办',owner:'总经办',allocation:{project:'P',mode:'referral',cat:'家具',sm:'家具甲',referrer:'介绍人',reason:'客户推荐',attachments:[image],evidence:{leader:image}}}),c=boot([t]);
 const result=c.v81SubmitTodoEdit('T',{allocation:{sm:'家具乙'}},0).task;assert.equal(result.owner,'总经办');assert.equal(result.allocation.sm,'家具乙');
 assert.throws(()=>c.v81SubmitTodoEdit('T',{allocation:{referrer:''}},1),/转介绍人/);assert.throws(()=>c.v81SubmitTodoEdit('T',{allocation:{reason:''}},1),/转介绍原因/);assert.throws(()=>c.v81SubmitTodoEdit('T',{attachments:[]},1),/截图/);assert.throws(()=>c.v81SubmitTodoEdit('T',{allocation:{referrer:'家具乙'}},1),/不能相同/);
});
test('驳回后在原待办修改重提清除驳回，保留原决定及历史；失败、冲突、越权不改变业务',()=>{
 const c=boot([product({status:'已驳回',approver:'家具甲',approveTime:'2026-10-18 09:00',rejectReason:'资料不全',reminders:[{at:'2026-10-18',by:'PM'}]})]);
 const next=c.v81SubmitTodoEdit('T',{allocation:{sm:'家具乙'}},0).task;assert.equal(next.status,'待处理');assert.equal(next.rejectReason,'');assert.equal(next.v21ArrivedAt,'2026-10-19 19:00');assert.equal(next.editHistory[0].decision.reason,'资料不全');assert.equal(next.reminders.length,1);
 const before=copy(c.TODOS);c.fail=true;assert.throws(()=>c.v81SubmitTodoEdit('T',{note:'失败'},1),/未保存/);assert.deepEqual(copy(c.TODOS),before);c.fail=false;
 c.actor='家具乙';assert.throws(()=>c.v81SubmitTodoEdit('T',{note:'越权'},1),/无权/);c.actor='PM';assert.throws(()=>c.v81SubmitTodoEdit('T',{note:'旧版本'},0),/已更新/);
 c.TODOS.push(product({id:'OTHER'}));assert.throws(()=>c.v81SubmitTodoEdit('T',{allocation:{sm:'家具甲'}},1),/待处理申请/);
});
test('重复保存不新增履历，遗留未带 allocation 的接单也同步新负责人',()=>{
 const c=boot([product({allocation:undefined})]);c.v81SubmitTodoEdit('T',{allocation:{sm:'家具乙'}},0);const n=c.TODOS[0].editRevision;const result=c.v81SubmitTodoEdit('T',c.v81EditValues(c.TODOS[0]),n);assert.equal(result.changed,false);assert.equal(c.TODOS[0].editHistory.length,1);
});
test('设计重复承接与品类重复申请均被阻止；已承接不能编辑',()=>{
 const c=boot([design()]),o=['BU','设计','洽谈中','设计服务','P','','','主管B'];o[20]={kind:'design'};c.OPPS.push(o);assert.throws(()=>c.v81SubmitTodoEdit('T',{allocation:{sm:'主管B'}},0),/已有本项目/);
 c.TODOS[0].status='已处理';assert.throws(()=>c.v81SubmitTodoEdit('T',{note:'完成后修改'},0),/无权/);
});
test('旧版转介绍接单不可直接承接绕过审批，既有已承接历史保持可读',()=>{
 const c=boot([product({allocation:{project:'P',mode:'normal',cat:'家具',sm:'家具甲',referrer:'介绍人',reason:'客户推荐'}})]);
 assert.throws(()=>c.v68CreateOpportunity(c.TODOS[0]),/总经办审批/);assert.equal(c.createCalled,undefined);assert.equal(c.OPPS.length,0);
 c.TODOS[0].createdOppId='EXISTING';assert.equal(c.v68CreateOpportunity(c.TODOS[0]),'EXISTING');
});
