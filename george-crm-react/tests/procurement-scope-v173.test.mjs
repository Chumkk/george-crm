import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {setup,pending,read,copy,slice} from './helpers/design171.mjs';
const source=read('procurementWorkflow.js');
function fixture(){
 const c=setup();Object.assign(c,{projectFormHtml:()=>'',v125SpaceValidation:()=>'',V68_APPROVALS:['跨区域商机审批待办','转介绍商机审批待办'],pageProjects:()=>'',pageTodos:()=>'',pageDetail:()=>'',mmProjectCards:()=>'',pfpRequirements:()=>[],clientQuoteOpen:()=>false,crmTodoEnabled:()=>true});
 c.v125BatchAffected=()=>true;c.projectRecordToWizard=p=>copy(c.PROJECT_EXTRA[p[0]].formData);c.QUOTE_UI={clientSelected:{}};c.qNum=Number;c.v3Meta=code=>c.V3.meta[code];c.v125EnsureBaseline=()=>{};
 vm.runInContext(slice(read('quoteRevision.js'),'function v125SpaceSet(','function v125DraftBatch(')+slice(read('quoteRevision.js'),'function v125DraftLocked(','function v129SavedMedia(')+slice(read('quoteRevision.js'),'function v125ApplySpaceImpact(','// Category-only projects'),c);
 c.window=c;c.document.createElement=()=>({querySelector:()=>null,querySelectorAll:()=>[],innerHTML:''});
 c.projectSelectedCats=()=>['家具'];c.v68Candidates=()=>[{name:'家具SM',cat:'家具',regions:['北美']}];c.V68_SMS=[{name:'家具SM',cat:'家具',regions:['北美']}];
 c.v68ValidateAllocation=d=>c.projectSelectedCats(d.project).includes(d.cat)?'':'品类不允许';
 c.v68SubmitAllocationData=d=>{const error=c.v68ValidateAllocation(d);if(error)throw Error(error);return c.addChainTodo({project:d.project,type:'确认商机',owner:d.sm,allocation:copy(d)});};
 c.v68CreateOpportunity=t=>{const id='BU'+(c.OPPS.length+1);const row=[id,'商机','洽谈中',t.allocation.cat,t.project,'北美','客户',t.owner];row[20]={approvalTodo:t.id};c.OPPS.push(row);t.createdOppId=id;return id;};
 c.v125DraftBatch=d=>({oppId:d.oppId});c.bs131CreateAddon=()=>{};c.bs131OpenAddon=()=>{};
 vm.runInContext(source,c);return c;
}
test('旧暂无与洗图合并，类型锁定，历史设计待办保留记录但退出当前待办',()=>{
 const c=fixture();assert.equal(c.mgDesignLabel('暂无'),'采购产品类');assert.equal(c.mgDesignLabel('洗图报价'),'采购产品类');assert.equal(c.mgDesignLabel('设计服务类'),'设计服务类');
 assert.equal(c.PROJECT_EXTRA.P.formData.designType,'采购方案设计');assert.match(c.mgProjectDesignError('P',{designType:'独立设计服务'}),/不可修改/);
 assert.equal(c.mgProjectStartingDesign({designType:'采购方案设计'},''),false);assert.equal(c.mgProjectStartingDesign({designType:'独立设计服务'},''),true);
});
const names=(c)=>copy(c.pw173ProjectSpaces('P')).map(s=>s.name);
function change(c,spaces){return c.pw173CommitScope('P',spaces,JSON.stringify(c.pw173ProjectSpaces('P')));}
test('项目空间只填名称，空名称和重名拒绝；拉商机忽略传入的独立空间',()=>{
 const c=fixture();assert.throws(()=>change(c,[]),/填写/);assert.throws(()=>change(c,[{id:'1',name:'客厅'},{id:'2',name:'客厅'}]),/重复/);
 const task=c.v68SubmitAllocationData({project:'P',cat:'家具',sm:'家具SM',spaceSnapshot173:[{name:'自行输入'}]});assert.deepEqual(copy(task.allocation.spaceSnapshot173).map(s=>s.name),['原客厅']);
});
test('项目信息更新统一空间，旧新商机均按最新标准校验；邀请快照保留',()=>{
 const c=fixture(),first=c.v68SubmitAllocationData({project:'P',cat:'家具',sm:'家具SM'}),id1=c.v68CreateOpportunity(first);
 change(c,[{id:'S',name:'客厅'},{id:'S2',name:'卧室'}]);const second=c.v68SubmitAllocationData({project:'P',cat:'家具',sm:'家具SM'}),id2=c.v68CreateOpportunity(second);
 assert.deepEqual(copy(c.pw173QuoteSpaces(c.oqOpp(id1))),['客厅','卧室']);assert.deepEqual(copy(c.pw173QuoteSpaces(c.oqOpp(id2))),['客厅','卧室']);assert.equal(first.allocation.spaceSnapshot173[0].name,'原客厅');
});
test('提交校验完整项目空间，空空间无需产品，换序不影响；缺失和额外空间不允许',()=>{
 const c=fixture();change(c,[{id:'S',name:'客厅'},{id:'S2',name:'卧室'}]);const task=c.v68SubmitAllocationData({project:'P',cat:'家具',sm:'家具SM'}),id=c.v68CreateOpportunity(task);
 const data={project:'P',oppId:id,spaces:[{name:'卧室',products:[]},{name:'客厅',products:[{cat:'家具'}]}]};assert.equal(c.v125SpaceValidation(data),'');assert.match(c.v125SpaceValidation({...data,spaces:data.spaces.slice(1)}),/缺少空间：卧室/);assert.match(c.v125SpaceValidation({...data,spaces:[...data.spaces,{name:'庭院'}]}),/不符/);
});
test('空间调整使可编辑报价重提，保留产品、提交历史和已备货报价',()=>{
 const c=fixture(),task=c.v68SubmitAllocationData({project:'P',cat:'家具',sm:'家具SM'}),id=c.v68CreateOpportunity(task);
 c.DRAFT_DATA.Q={project:'P',oppId:id,spaces:[{name:'原客厅',products:[{name:'沙发'}]}]};c.V3.meta.Q={project:'P',categories:['家具'],active:true,status:'已确认',confirmedCats:['家具'],bindings:{},submitted:copy(c.DRAFT_DATA.Q),quoteVersions:[{id:'V1',spaces:copy(c.DRAFT_DATA.Q.spaces)}]};
 c.DRAFT_DATA.L=copy(c.DRAFT_DATA.Q);c.V3.meta.L={...copy(c.V3.meta.Q),bindings:{ERP:'STOCKED'}};const locked=copy(c.V3.meta.L),history=copy(c.V3.meta.Q.quoteVersions);c.TODOS.push({id:'QT',type:'报价待办',project:'P',cat:'家具',draft:'Q',status:'已处理'});
 const impact=change(c,[{id:'S',name:'起居室'},{id:'S2',name:'卧室'}]);assert.deepEqual(copy(impact.editable),['Q']);assert.deepEqual(copy(impact.protected),['L']);assert.equal(c.V3.meta.Q.status,'已暂存');assert.equal(c.V3.meta.Q.confirmedCats.length,0);assert.equal(c.TODOS.find(t=>t.id==='QT').status,'待处理');assert.equal(c.DRAFT_DATA.Q.spaces[0].name,'起居室');assert.equal(c.DRAFT_DATA.Q.spaces[0].products[0].name,'沙发');assert.deepEqual(copy(c.V3.meta.Q.quoteVersions),history);assert.deepEqual(copy(c.V3.meta.L),locked);
});
test('保存失败恢复统一空间、产品和任务状态；顺序变化不使报价失效',()=>{
 const c=fixture(),before=names(c);c.failSave=true;assert.throws(()=>change(c,[{id:'S',name:'起居室'}]),/未保存/);assert.deepEqual(names(c),before);c.failSave=false;change(c,[{id:'S',name:'客厅'},{id:'S2',name:'卧室'}]);c.OPPS.push(['BU1','商机','报价中','家具','P']);c.V3.meta.Q={project:'P',categories:['家具'],active:true,bindings:{},status:'已提交'};change(c,[{id:'S2',name:'卧室'},{id:'S',name:'客厅'}]);assert.equal(c.V3.meta.Q.status,'已提交');
});

test('空间排序保存影响当前总览和新报价预设，不改工作稿、历史、确认及已完成任务',()=>{
 const c=fixture();change(c,[{id:'S',name:'客厅'},{id:'S2',name:'卧室'}]);
 const task=c.v68SubmitAllocationData({project:'P',cat:'家具',sm:'家具SM'}),id=c.v68CreateOpportunity(task);
 c.DRAFT_DATA.Q={project:'P',oppId:id,spaces:[{name:'客厅',products:[]},{name:'卧室',products:[]}]};
 c.V3.meta.Q={project:'P',categories:['家具'],active:true,bindings:{},status:'已确认',confirmedCats:['家具'],submitted:copy(c.DRAFT_DATA.Q),quoteVersions:[{id:'V1',spaces:copy(c.DRAFT_DATA.Q.spaces)}]};
 c.TODOS.push({id:'QT222',type:'报价待办',project:'P',cat:'家具',draft:'Q',status:'已处理'});
 const original=copy({draft:c.DRAFT_DATA.Q,meta:c.V3.meta.Q,tasks:c.TODOS});
 change(c,[{id:'S2',name:'卧室'},{id:'S',name:'客厅'}]);
 assert.deepEqual(copy(c.pw173QuoteSpaces(c.oqOpp(id))),['卧室','客厅']);
 const rows=[{space:'客厅',amount:1},{space:'历史空间',amount:3},{space:'卧室',amount:2}],before=copy(rows);
 assert.deepEqual(copy(c.pw222OrderedRows('P',rows)).map(r=>r.space),['卧室','客厅','历史空间']);
 assert.deepEqual(rows,before);assert.deepEqual(copy({draft:c.DRAFT_DATA.Q,meta:c.V3.meta.Q,tasks:c.TODOS}),original);
 const next=c.v68SubmitAllocationData({project:'P',cat:'家具',sm:'家具SM'});assert.deepEqual(copy(next.allocation.spaceSnapshot173).map(s=>s.name),['卧室','客厅']);
});
test('创建采购产品项目只生成项目待办；设计服务保留原来的三项任务',()=>{
 const c=fixture(),data={projectName:'采购新项目',designType:'采购方案设计',spaceCats:[{id:'NEW',name:'客厅'}],projectManager:'PM',customerPick:'客户',projectLocation:'美国'};
 const id=c.v68StoreProject(null,data,{total:80,level:'B'});assert.equal(c.TODOS.filter(t=>t.project===id).length,1);assert.equal(c.TODOS.find(t=>t.project===id).type,'项目待办');assert.equal(c.mgProjectDesignLocked(id),'采购方案设计');
 assert.throws(()=>c.oqInitiateDesign(id,{designType:'独立设计服务'},'NO'),/类型已固定/);
 const service=fixture(),request=pending(service,'独立设计服务');const result=service.mgCommitProjectDesign(request,'设计甲','2026-10-20');assert.deepEqual(service.TODOS.filter(t=>t.project===result.project).map(t=>t.type).sort(),['确认商机','设计待办','项目待办'].sort());assert.equal(service.TODOS.find(t=>t.project===result.project&&t.type==='项目待办').status,'待处理');
});

test('新建项目必须手动选择类型，未选择不要求隐藏空间，也不能直接保存',()=>{
 const c=fixture();c.wizardState.project={projectName:'未选择类型',designType:''};assert.ok(c.projectMissingList().includes('设计类型'));assert.equal(c.projectMissingList().includes('请填写每个空间的名称'),false);const before=copy({projects:c.PROJECTS,todos:c.TODOS});assert.throws(()=>c.v68StoreProject(null,c.wizardState.project,{total:0,level:'D'}),/请选择设计类型/);assert.deepEqual(copy({projects:c.PROJECTS,todos:c.TODOS}),before);
 c.wizardState.project.designType='采购方案设计';assert.ok(c.projectMissingList().includes('请填写每个空间的名称'));c.wizardState.project.designType='独立设计服务';assert.equal(c.projectMissingList().includes('请填写每个空间的名称'),false);
});
