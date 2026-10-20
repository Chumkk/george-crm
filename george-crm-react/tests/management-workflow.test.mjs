import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/compat/runtime/managementWorkflow.js',import.meta.url),'utf8'),copy=x=>JSON.parse(JSON.stringify(x));
function setup(){
 const noop=()=>'',opp=['B','家具商机','进行中','家具','P','','客户','SM'];
 const c={PROJECTS:[['P','项目','','','','','北美','客户','','PM']],PROJECT_EXTRA:{P:{formData:{spaceCats:[{id:'S',name:'客厅',cats:['家具']}]}}},PROJECT_FILES:{},OPPS:[opp],ORDERS:[],TODOS:[],DRAFT_DATA:{},TODO_TYPES:[],V18_TODO_NAMES:{},wizardState:{},document:{createElement:()=>({}),head:{appendChild(){}},addEventListener(){}},v3Copy:copy,esc:String,v17Owner:()=>c.actor||'PM',todoStamp:()=> '2026-10-09 12:00',orderOppOf:o=>o[17],v21CanOperate:t=>!c.actor||c.actor===t.owner,bs131CanMaintain:()=>!c.actor||c.actor==='PM',oqOpp:id=>c.OPPS.find(o=>o[0]===id),oqCanQuote:o=>!!o&&(!c.actor||c.actor===o[7]),oqDesignType:v=>v||'暂无',findProject:id=>c.PROJECTS.find(p=>p[0]===id),todoActs:noop,handleAct:noop,openPlannedTodoForm:noop,updateWizardHint:noop};
 Object.assign(c,{CHAIN_STEPS:['项目待办','设计待办'],pageOppDetail:noop,RENDER:{},todoSubject:noop});
 c.addChainTodo=d=>{const t={id:'T'+(c.TODOS.length+1),status:'待处理',...copy(d)};c.TODOS.unshift(t);return t;};
 c.dw132HandoffErrors=d=>!d.projectType||!d.spaceCats?.length||!d.attachments?.length?['设计资料']:[];
 c.v125ProjectSpaces=p=>copy(c.PROJECT_EXTRA[p].formData.spaceCats);
 c.oqDesignSpaces=(p,spaces)=>spaces.map(s=>({...s,cats:c.v125ProjectSpaces(p).find(old=>old.id===s.id)?.cats||[]}));
 c.v125ApplySpaceImpact=()=>{};
 c.bs131Atomic=fn=>{const before=copy({PROJECT_EXTRA:c.PROJECT_EXTRA,PROJECT_FILES:c.PROJECT_FILES,TODOS:c.TODOS,OPPS:c.OPPS});try{const r=fn();if(c.fail)throw Error('保存失败');return r;}catch(e){Object.assign(c,before);throw e;}};
 vm.createContext(c);vm.runInContext(source,c);return c;
}
function order(c,status='未备货'){const o=Array(19).fill('');o[2]='报价单';o[3]=status;o[15]='P';o[17]='B';o[18]={quoteCode:'Q',stockStatus:status};c.ORDERS.push(o);return o;}
function design(c){c.PROJECT_EXTRA.P.formData.designType='采购方案设计';const t={id:'DES',type:'设计待办',project:'P',status:'待处理',owner:'设计师',needInfo:{designType:'采购方案设计',attachments:[{name:'cad.dwg'}]}};c.TODOS.push(t);return t;}
const data={projectType:'住宅',projectArea:'100㎡',spaceCats:[{id:'S',name:'新客厅'}],attachments:[{name:'design.pdf'}]};
test('商机推进依据报价、确认报价和真实备货/正常交付，创建ERP请求不等于成交',()=>{const c=setup(),o=c.OPPS[0];assert.equal(c.mgOpportunityState(o),'洽谈中');const quote=order(c);assert.equal(c.mgOpportunityState(o),'报价中');quote[18].erpRequestedRevision=1;assert.equal(c.mgOpportunityState(o),'待下定');assert.equal(c.mgProjectState('P'),'待成交');quote[18].stockStatus='备货中';assert.equal(c.mgOpportunityState(o),'交付中');assert.equal(c.mgProjectState('P'),'全部成交');quote[18].stockStatus='已完成';assert.equal(c.mgOpportunityState(o),'已完成');assert.equal(c.mgProjectState('P'),'全部成交');});
test('未接受/拒绝仅显示来源任务，没有写入正常商机，接受后不重复显示',()=>{const c=setup();c.TODOS.push({id:'A',type:'确认商机',project:'P',status:'待处理',owner:'新SM',cat:'地板'},{id:'R',type:'确认商机',project:'P',status:'已驳回',owner:'设计师',cat:'设计服务',designOpportunity:true});assert.deepEqual([...c.mgOppRows().map(o=>c.mgOpportunityState(o))],['待接受','已拒绝','洽谈中']);assert.equal(c.OPPS.length,1);c.TODOS[0].createdOppId='B';assert.equal(c.mgOppRows().length,2);});
test('项目聚合包含完成商机，输单与项目状态独立且不可逆',()=>{const c=setup(),o=order(c,'备货中');o[18].erpRequestedRevision=1;c.OPPS.push(['C','另一商机','进行中','地板','P','','客户','SM']);assert.equal(c.mgProjectState('P'),'部分成交');assert.throws(()=>c.mgLose('project','P','取消'),/待成交/);c.mgLose('opp','C','客户未采购');assert.equal(c.mgProjectState('P'),'部分成交');assert.throws(()=>c.mgLose('opp','C','重新输单'),/不能/);o[18].stockStatus='已完成';assert.throws(()=>c.mgLose('opp','B','结束'),/不能/);assert.equal(c.oqCanQuote(c.OPPS[1]),false);});
test('项目输单不修改关联商机和订单，保存失败回滚',()=>{const c=setup();c.fail=true;assert.throws(()=>c.mgLose('project','P','取消'),/保存失败/);assert.equal(c.mgProjectState('P'),'待成交');c.fail=false;c.mgLose('project','P','取消');assert.equal(c.mgProjectState('P'),'已输单');assert.equal(c.mgOpportunityState(c.OPPS[0]),'洽谈中');assert.throws(()=>c.mgLose('project','P','再输单'),/待成交/);});
test('设计师提交仅发PM确认待办，保存提交快照，不覆盖项目档案',()=>{const c=setup(),t=design(c);assert.equal(c.mgDesignState('P'),'设计中');const original=JSON.stringify(c.PROJECT_EXTRA.P);c.actor='设计师';const review=c.dw132CompleteDesign(t,data);assert.equal(review.owner,'PM');assert.equal(review.type,'设计确认待办');assert.equal(t.status,'已处理');assert.equal(c.mgDesignState('P'),'已设计');assert.equal(JSON.stringify(c.PROJECT_EXTRA.P),original);assert.equal(c.PROJECT_FILES.P,undefined);assert.throws(()=>c.dw132CompleteDesign(t,data),/不可办理/);assert.equal(c.TODOS.filter(t=>t.type==='设计确认待办').length,1);});
test('PM同步成功更新档案并完成任务，不允许重复办理',()=>{const c=setup(),t=design(c),review=c.dw132CompleteDesign(t,data),submitted=JSON.stringify(review.submittedSnapshot);c.actor='OTHER';assert.throws(()=>c.mgSyncDesign(review,data),/不可同步/);c.actor='PM';c.mgSyncDesign(review,data);assert.equal(review.status,'已处理');assert.equal(review.confirmedSnapshot.projectArea,'100㎡');assert.equal(c.PROJECT_EXTRA.P.formData.spaceCats[0].name,'新客厅');assert.deepEqual([...c.PROJECT_EXTRA.P.formData.spaceCats[0].cats],['家具']);assert.equal(c.PROJECT_FILES.P.designFile[0].name,'design.pdf');assert.throws(()=>c.mgSyncDesign(review,data),/不可同步/);assert.equal(JSON.stringify(review.submittedSnapshot),submitted);});
test('PM驳回回原设计师重提，新的确认待办关联新版本并保留旧驳回记录',()=>{const c=setup(),t=design(c),r=c.dw132CompleteDesign(t,data);c.mgRejectDesign(r,'空间需要修改');assert.equal(r.status,'已驳回');assert.equal(t.status,'待处理');assert.equal(c.mgDesignState('P'),'设计中');const newer=c.dw132CompleteDesign(t,{...data,projectArea:'200㎡'});assert.equal(newer.id,r.id);assert.equal(newer.designSubmission,2);assert.equal(t.designSubmissions.length,2);assert.equal(r.editHistory[0].before.submittedSnapshot.projectArea,'100㎡');assert.equal(r.rejectionHistory[0].reason,'空间需要修改');});
test('设计提交或同步保存失败不完成来源任务、不遗留下一任务/档案更改',()=>{const c=setup(),t=design(c);c.fail=true;assert.throws(()=>c.dw132CompleteDesign(t,data),/保存失败/);assert.equal(c.TODOS.length,1);assert.equal(c.TODOS[0].status,'待处理');c.fail=false;const r=c.dw132CompleteDesign(c.TODOS[0],data);const before=JSON.stringify(c.PROJECT_EXTRA.P);c.fail=true;assert.throws(()=>c.mgSyncDesign(r,data),/保存失败/);assert.equal(JSON.stringify(c.PROJECT_EXTRA.P),before);assert.equal(c.PROJECT_FILES.P,undefined);assert.equal(c.TODOS.find(t=>t.type==='设计确认待办').status,'待处理');});


test('设计确认报价后，ERP收款不替代GDS确认；精确GDS完成任务结束商机',()=>{
 const c=setup(),opp=c.OPPS[0];opp[20]={kind:'design'};const d=order(c);d[0]='XF1';d[2]='设计单';d[10]='¥100';d[13]='¥100';d[18]={kind:'design',quoteCode:'D',erpRequestedRevision:1};
 assert.equal(c.mgOpportunityState(opp),'待下单');assert.equal(c.mgProjectState('P'),'全部成交');
 const t={id:'DES',type:'设计待办',project:'P',opp:'B',order:'XF1',drawingWorkflow185:true,status:'待处理',gdsCompleted:false};c.TODOS.push(t);
 t.gdsPaymentConfirmed={eventId:'PAY',order:'OTHER',opportunity:'B'};assert.equal(c.mgOpportunityState(opp),'待下单');
 t.gdsPaymentConfirmed.order='XF1';assert.equal(c.mgOpportunityState(opp),'交付中');
 c.TODOS.push({type:'设计确认待办',project:'P',opp:'B',order:'XF1',status:'已处理'});assert.equal(c.mgOpportunityState(opp),'交付中');
 t.status='已处理';assert.equal(c.mgOpportunityState(opp),'交付中');t.gdsCompleted=true;assert.equal(c.mgOpportunityState(opp),'已完成');
 t.order='XF2';assert.equal(c.mgOpportunityState(opp),'待下单');
});

test('采购20%边界按精确报价订单实收；费用和其他商机收款不抵扣',()=>{
 const c=setup(),opp=c.OPPS[0],q=order(c);q[10]='¥1000.05';q[18].erpRequestedRevision=1;
 const fee=order(c);fee[2]='费用订单';fee[10]='¥10';fee[13]='¥100000';fee[18]={kind:'fee',erpRequestedRevision:1};
 const other=order(c);other[17]='OTHER';other[10]='¥10';other[13]='¥100000';other[18].erpRequestedRevision=1;
 for(const paid of ['¥0','¥200.00','-','错误','-1','Infinity']){q[13]=paid;assert.equal(c.mgOpportunityState(opp),'待下定');assert.equal(c.mgProjectState('P'),'待成交');}
 q[13]='¥200.01';assert.equal(c.mgOpportunityState(opp),'待下单');assert.equal(c.mgProjectState('P'),'全部成交');
 q[13]='¥1000.05';assert.equal(c.mgOpportunityState(opp),'待下单');
 q[10]='0';assert.equal(c.mgOpportunityState(opp),'待下定');q[10]='非法';assert.equal(c.mgOpportunityState(opp),'待下定');
 q[18].stockStartedAt='2026-10-20';assert.equal(c.mgOpportunityState(opp),'交付中');q[18].normalDeliveryCompletedAt='2026-10-20';assert.equal(c.mgOpportunityState(opp),'已完成');
});

test('待下单计入项目成交，待下定和前置邀请不计入；部分及全部按正常商机聚合',()=>{
 const c=setup(),q=order(c);q[10]='¥100';q[13]='¥20';q[18].erpRequestedRevision=1;
 c.OPPS.push(['C','另一商机','洽谈中','地板','P']);assert.equal(c.mgProjectState('P'),'部分成交');
 const q2=order(c);q2[17]='C';q2[10]='¥100';q2[13]='¥19.99';q2[18].erpRequestedRevision=1;assert.equal(c.mgProjectState('P'),'部分成交');
 q2[13]='¥20';assert.equal(c.mgProjectState('P'),'全部成交');c.TODOS.push({type:'确认商机',project:'P',status:'待处理'});assert.equal(c.mgProjectState('P'),'全部成交');
 q[13]='¥0';q2[13]='¥0';assert.equal(c.mgProjectState('P'),'待成交');
});

test('费用订单、付款请求、其他商机收款及设计完成/备货标记不替代设计单实收',()=>{
 const c=setup(),opp=c.OPPS[0];opp[20]={kind:'design'};const d=order(c);d[2]='设计单';d[10]='¥100';d[13]='-';d[18]={kind:'design',quoteCode:'D',erpRequestedRevision:1,stockStatus:'已完成',paymentRequests:[{amount:100}]};
 const fee=order(c);fee[2]='费用订单';fee[10]='¥1000';fee[13]='¥1000';fee[18]={kind:'fee',erpRequestedRevision:1};
 const other=order(c);other[2]='设计单';other[17]='OTHER';other[10]='¥100';other[13]='¥100';other[18]={kind:'design',quoteCode:'OTHER',erpRequestedRevision:1};
 c.TODOS.push({type:'设计待办',status:'已处理',opp:'B'},{type:'设计确认待办',status:'已处理',opp:'B'});
 assert.equal(c.mgOpportunityState(opp),'待下单');for(const invalid of ['非法','-1','Infinity']){d[13]=invalid;assert.equal(c.mgOpportunityState(opp),'待下单');}
 d[13]='¥100';delete d[18].erpRequestedRevision;assert.equal(c.mgOpportunityState(opp),'报价中');delete d[18].quoteCode;assert.equal(c.mgOpportunityState(opp),'洽谈中');
 opp[20].lostAt='2026-10-15';assert.equal(c.mgOpportunityState(opp),'已输单');
});

test('费用订单的传输、备货、交付及收款状态不推动产品或设计商机，也不影响项目状态',()=>{
 for(const design of [false,true]){const c=setup(),opp=c.OPPS[0];opp[20]=design?{kind:'design'}:{};opp[2]='洽谈中';const f=order(c);f[2]='费用订单';f[10]='¥500';f[13]='¥500';f[18]={kind:'fee',erpRequestedRevision:1,quoteCode:'FEE',stockStartedAt:'2026-10-16',normalDeliveryCompletedAt:'2026-10-16'};f[3]='已完成';assert.equal(c.mgOpportunityState(opp),'洽谈中');assert.equal(c.mgProjectState('P'),'待成交');
 const quote=order(c);quote[0]='REAL';quote[2]=design?'设计单':'报价单';quote[10]='¥100';quote[13]='¥0';quote[18]={kind:design?'design':'product',quoteCode:'Q',erpRequestedRevision:1};quote[3]='未执行';assert.equal(c.mgOpportunityState(opp),design?'待下单':'待下定');assert.equal(c.mgProjectState('P'),design?'全部成交':'待成交');}
});
