import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {fixture as oldFixture} from './helpers/procurement173.mjs';
import {read,slice,copy} from './helpers/design171.mjs';
function fixture(){
 const c=oldFixture();Object.assign(c,{PFP_SECTIONS:['基础信息','项目信息','设计与图纸','物流方式','其他补充信息'],mmProjectMatches:()=>true,archiveDesignFields:()=>'',v81EditValues:()=>({}),v81NormaliseEdit:()=>({}),v81SubmitTodoEdit:()=>({}),MODALS:{confirmTodo:{html:()=>'<p>确认接受商机</p>'}},todoPending:null,COLS:{projects:['设计类型','设计状态']},v81OpenTodoEdit:()=>'',dqAllocateBase:c.dw132CreateOpportunities});
 c.window.addEventListener=(type, listener)=>{if(type==='click')c.allocationOutsideClick=listener;};
 c.v68AllocationConflict=()=>'';c.visibleTodos=()=>c.TODOS;c.V68_OFFICE='总经办';c.v3Stamp=c.todoStamp;c.dw132Designers=()=>c.DESIGNERS;c.crypto={randomUUID:()=> 'TOKEN'};
 // Real acceptance implementation creates the design opportunity and quote task.
 vm.runInContext(slice(read('opportunityQuotes.js'),'const oqCreateOppBase','dw132FeeOrder=function').replaceAll('oqCreateOppBase','uaTestCreateBase'),c);
 vm.runInContext(slice(read('allocationBatch.js'),'function allocationBatchInputs','function allocationBatchRefresh'),c);
 vm.runInContext(read('unifiedAllocation.js'),c);return c;
}
test('分配人员下拉点击外部后收起并保留选择，点击遮罩先收起下拉',()=>{
 const c=fixture(),inside={},outside={},mask={id:'mask'},selected={checked:true};
 const menu={hidden:true},trigger={setAttribute(name,value){this[name]=value;},focus(){this.focused=true;}},search={focus(){}};
 const classes=new Set(),root={
  classList:{contains:name=>classes.has(name),toggle:(name,open)=>open?classes.add(name):classes.delete(name)},
  contains:target=>target===inside,
  querySelector:selector=>({'[data-ua-menu]':menu,'[data-act="ua176Toggle"]':trigger,'[data-ua-search]':search,'[data-ua-person]':selected})[selector],
 };
 c.document.getElementById=id=>id==='ua176People'?root:null;
 c.document.querySelector=()=>classes.has('is-open')?root:null;
 for(const mode of ['normal','cross','design'])assert.doesNotMatch(c.ua176PickerHtml('P',mode),/完成选择/);
 c.handleAct({dataset:{act:'ua176Toggle'}});
 c.allocationOutsideClick({target:inside});
 assert.equal(menu.hidden,false);
 c.allocationOutsideClick({target:outside});
 assert.equal(menu.hidden,true);
 assert.equal(trigger['aria-expanded'],'false');
 assert.equal(selected.checked,true);
 c.handleAct({dataset:{act:'ua176Toggle'}});
 let stopped=false;
 c.allocationOutsideClick({target:mask,stopImmediatePropagation(){stopped=true;}});
 assert.equal(menu.hidden,true);
 assert.equal(stopped,true);
 assert.equal(trigger.focused,true);
});
test('不选择设计类型且不填空间也能创建，只生成一项 PM 项目待办',()=>{
 const c=fixture(),id=c.v68StoreProject(null,{projectName:'统一项目',projectManager:'PM',customerPick:'客户',projectLocation:'美国',spaceCats:[]},{total:80,level:'B'});
 assert.equal(c.PROJECT_EXTRA[id].formData.designType,undefined);assert.equal(c.TODOS.filter(t=>t.project===id).length,1);assert.equal(c.TODOS[0].type,'项目待办');assert.equal(c.TODOS[0].status,'待处理');
});
test('区域内和跨区域分配校验空间，设计分配无需空间且仅允许主管',()=>{
 const c=fixture();c.PROJECT_EXTRA.P.procurementSpaces173=[];
 assert.match(c.v68ValidateAllocation({project:'P',mode:'normal',sm:'家具SM',cat:'家具'}),/补充.*空间/);
 assert.match(c.v68ValidateAllocation({project:'P',mode:'cross',sm:'跨区SM',cat:'家具'}),/补充.*空间/);
 assert.equal(c.v68ValidateAllocation({project:'P',mode:'design',sm:c.ua176Supervisors()[0]}),'');
 assert.match(c.v68ValidateAllocation({project:'P',mode:'design',sm:'设计甲'}),/主管/);
});
test('转介绍为区域内附加字段，填写转介绍人则原因和截图均必填',()=>{
 const c=fixture(),base={project:'P',mode:'normal',sm:'家具SM',cat:'家具'};
 assert.equal(c.v68ValidateAllocation(base),'');assert.match(c.v68ValidateAllocation({...base,referrer:'PM'}),/原因/);
 assert.match(c.v68ValidateAllocation({...base,referrer:'PM',reason:'客户推荐'}),/截图/);
 assert.equal(c.v68ValidateAllocation({...base,referrer:'PM',reason:'客户推荐',evidence:{leader:{name:'同意.png',url:'data:image/png;base64,a'}}}),'');
});
test('跨区域只显示区域外 SM，必须申请原因，附件可空',()=>{
 const c=fixture();c.V68_SMS.push({name:'跨区SM',cat:'家具',regions:['中东']});
 assert.deepEqual(copy(c.v68Candidates('P','家具','normal')).map(s=>s.name),['家具SM']);assert.deepEqual(copy(c.v68Candidates('P','家具','cross')).map(s=>s.name),['跨区SM']);
 assert.match(c.v68ValidateAllocation({project:'P',mode:'cross',sm:'跨区SM',cat:'家具'}),/申请原因/);assert.equal(c.v68ValidateAllocation({project:'P',mode:'cross',sm:'跨区SM',cat:'家具',reason:'客户需求',attachments:[]}),'');
});
test('任何项目可分配设计主管；承接同时生成设计和报价，重复承接不重复生成',()=>{
 const c=fixture(),name=c.ua176Supervisors()[0];c.TODOS.push({id:'PT',type:'项目待办',project:'P',owner:'PM',status:'待处理'});
 const [invite]=c.dw132CreateOpportunities('P',[name],'PT','REQ',{expectedCompletionAt:'2026-10-20'});assert.equal(c.TODOS.find(t=>t.id==='PT').status,'已处理');assert.equal(c.TODOS.filter(t=>t.type==='设计待办').length,0);
 const id=c.v68CreateOpportunity(invite);assert.equal(c.oqOpp(id)[20].kind,'design');
 const tasks=c.TODOS.filter(t=>t.opp===id);assert.deepEqual(tasks.map(t=>t.type).sort(),['报价待办','设计待办'].sort());assert.ok(tasks.every(t=>t.owner===name));assert.equal(tasks.find(t=>t.type==='报价待办').initiator,'PM');
 assert.equal(c.v68CreateOpportunity(invite),id);assert.equal(c.TODOS.filter(t=>t.opp===id).length,2);
});
test('设计状态需完成设计与对应 PM 确认；不受旧项目类型影响',()=>{
 const c=fixture();assert.equal(c.mgDesignState('P'),'');c.TODOS.push({id:'D',type:'设计待办',project:'P',status:'待处理'});assert.equal(c.mgDesignState('P'),'设计中');c.TODOS[0].status='已处理';assert.equal(c.mgDesignState('P'),'设计中');c.TODOS.push({id:'R',type:'设计确认待办',project:'P',sourceTodoId:'D',status:'待处理'});assert.equal(c.mgDesignState('P'),'设计中');c.TODOS[1].status='已处理';assert.equal(c.mgDesignState('P'),'已设计');c.TODOS[1].status='已驳回';assert.equal(c.mgDesignState('P'),'设计中');
});
test('保存失败回滚项目与源待办；设计承接失败不留下半条设计或报价待办',()=>{
 const c=fixture(),before=copy({projects:c.PROJECTS,todos:c.TODOS,extra:c.PROJECT_EXTRA});c.failSave=true;
 assert.throws(()=>c.v68StoreProject(null,{projectName:'失败',projectManager:'PM',spaceCats:[]},{total:0,level:'D'}),/未保存/);assert.deepEqual(copy({projects:c.PROJECTS,todos:c.TODOS,extra:c.PROJECT_EXTRA}),before);
 c.failSave=false;const [invite]=c.dw132CreateOpportunities('P',[c.ua176Supervisors()[0]],'','X',{expectedCompletionAt:'2026-10-20'}),snapshot=copy({opps:c.OPPS,todos:c.TODOS});c.failSave=true;assert.throws(()=>c.v68CreateOpportunity(invite),/未保存/);assert.deepEqual(copy({opps:c.OPPS,todos:c.TODOS}),snapshot);
});
test('分配只使用已保存项目空间，拒绝旧表单改空间；过期及失败提交不改变业务',()=>{
 const c=fixture(),spaces=copy(c.pw173ProjectSpaces('P')),state={project:'P',mode:'normal',sourceTodoId:'',spaceSignature:JSON.stringify(spaces)},fields={reason:'',referrer:'',attachments:[]},before=copy(c.PROJECT_EXTRA);
 assert.throws(()=>c.ua176CommitAllocation(state,['家具SM'],fields,[{id:'S',name:'新客厅'}]),/不能修改项目空间/);assert.deepEqual(copy(c.PROJECT_EXTRA),before);assert.equal(c.TODOS.length,0);
 c.ua176CommitAllocation(state,['家具SM'],fields,spaces);assert.deepEqual(copy(c.PROJECT_EXTRA),before);assert.equal(c.TODOS.length,1);
 assert.throws(()=>c.ua176CommitAllocation({...state,spaceSignature:'旧版本'},['家具SM'],fields,spaces),/空间已更新/);
 const snapshot=copy({extra:c.PROJECT_EXTRA,todos:c.TODOS});c.failSave=true;assert.throws(()=>c.ua176CommitAllocation(state,['家具SM'],fields,spaces),/未保存/);assert.deepEqual(copy({extra:c.PROJECT_EXTRA,todos:c.TODOS}),snapshot);
});

test('补充项目空间在原抽屉打开精确项目编辑，取消返回保留分配草稿',()=>{
 const c=fixture();c.V68.allocation={project:'P',mode:'cross',spaceSignature:'OLD'};c.v69UploadsBusy=()=>false;c.ua176CaptureAllocation=()=>vm.runInContext("UA176.drafts={signature:'OLD',cross:{names:['跨区SM'],reason:'客户要求',attachments:[{name:'附件'}]}}",c);
 const back={},save={},nodes={mBody:{scrollTop:123,insertAdjacentHTML(){}},mTitle:{textContent:''},mFoot:{querySelector:selector=>selector.includes('closeModal')?back:save}};c.document.getElementById=id=>nodes[id]||{classList:{remove(){}}};c.openEditProject=()=>{c.wizardEdit='project';c.editorProject=c.archiveProject;};
 const routes=[];c.openPage=p=>routes.push(p);c.handleAct({dataset:{act:'ua206ProjectSpaces',proj:'P'}});assert.equal(c.archiveProject,'P');assert.equal(c.editorProject,'P');assert.deepEqual(routes,[]);assert.equal(nodes.mTitle.textContent,'编辑项目信息');
 save.textContent='保存';c.ua207EditorActions();assert.equal(save.textContent,'保存并返回');assert.equal(back.textContent,'返回分配商机');
 c.PROJECT_EXTRA.P.procurementSpaces173=[{id:'S',name:'已补充空间'}];let reopened;c.v68Allocation=(project,mode,keep)=>{reopened={project,mode,keep,drafts:copy(vm.runInContext('UA176.drafts',c)),spaces:copy(c.pw173ProjectSpaces(project))};};
 c.handleAct({dataset:{act:'closeModal'}});assert.equal(reopened.project,'P');assert.equal(reopened.mode,'cross');assert.equal(reopened.keep,true);assert.deepEqual(reopened.drafts.cross,{names:['跨区SM'],reason:'客户要求',attachments:[{name:'附件'}]});assert.equal(reopened.drafts.signature,undefined);assert.equal(reopened.spaces[0].name,'已补充空间');assert.equal(c.TODOS.length,0);assert.deepEqual(routes,[]);assert.equal(nodes.mBody.scrollTop,123);
});

test('抽屉项目保存失败停留编辑，确认保存成功返回原分配并刷新空间版本',()=>{
 const c=fixture(),button={},nodes={mBody:{scrollTop:12,insertAdjacentHTML(){}},mTitle:{},mFoot:{querySelector:()=>({})},pw173ImpactConfirm:button,mask:{classList:{remove(){}}}};
 c.document.getElementById=id=>nodes[id];c.openEditProject=()=>{c.wizardEdit='project';c.wizardState.project={projectName:'原采购项目',projectManager:'PM',spaceCats:copy(c.pw173ProjectSpaces('P'))};};c.v69UploadsBusy=()=>false;c.ua176CaptureAllocation=()=>vm.runInContext("UA176.drafts={cross:{names:['跨区SM'],reason:'保留原因',attachments:[]}}",c);c.V68.allocation={project:'P',mode:'cross'};c.handleAct({dataset:{act:'ua206ProjectSpaces',proj:'P'}});
 c.validateProject=()=>true;c.v125SpaceChangeHtml=()=>'';c.v3Dialog=()=>{};c.v3CloseDialog=()=>{};c.toast=m=>c.lastToast=m;c.wizardState.project.spaceCats[0].name='新客厅';const routes=[];c.openPage=p=>routes.push(p);let reopened;c.v68Allocation=(project,mode,keep)=>{reopened={project,mode,keep,spaces:copy(c.pw173ProjectSpaces(project)),drafts:copy(vm.runInContext('UA176.drafts',c))};};
 c.applyProjectSave();c.failSave=true;button.onclick();assert.equal(reopened,undefined);assert.equal(c.wizardEdit,'project');assert.equal(c.pw173ProjectSpaces('P')[0].name,'原客厅');assert.deepEqual(routes,[]);
 c.failSave=false;button.onclick();assert.equal(reopened.project,'P');assert.equal(reopened.mode,'cross');assert.equal(reopened.spaces[0].name,'新客厅');assert.equal(reopened.drafts.cross.reason,'保留原因');assert.equal(c.TODOS.length,0);assert.deepEqual(routes,[]);
});
test('同项目可以同时存在产品与设计报价，统一空间变更不使设计报价失效',()=>{
 const c=fixture();c.OPPS.push(['BD','设计商机','报价中','设计服务','P','','','设计甲']);c.OPPS[0][20]={kind:'design'};
 assert.equal(c.v125SpaceValidation({project:'P',oppId:'BD',kind:'design',spaces:[]}), '');assert.equal(c.v125BatchAffected({project:'P',oppId:'BD'},[],[],['设计服务']),false);
});

test('设计服务分配不提交产品分配草稿中的空间，不被过期产品空间版本阻断',()=>{
 const c=fixture(),before=copy(c.PROJECT_EXTRA.P),name=c.ua176Supervisors()[0];
 const tasks=c.ua176CommitAllocation({project:'P',mode:'design',sourceTodoId:'',token:'DESIGN',spaceSignature:'旧空间版本'},[name],{expectedCompletionAt:'2026-10-20'},[{id:'S',name:'未提交的产品空间修改'}]);
 assert.equal(tasks.length,1);assert.equal(tasks[0].designOpportunity,true);assert.deepEqual(copy(c.PROJECT_EXTRA.P),before);
});

test('设计服务界面没有空间控件时，切换类型仍保留产品空间草稿',()=>{
 const c=fixture();c.V68.allocation={project:'P',mode:'design',spaceSignature:'SCOPE'};
 vm.runInContext("UA176.drafts.spaces=[{id:'S',name:'保留的客厅'}]",c);
 c.document.getElementById=id=>id==='ua176Form'?{}:null;c.document.querySelectorAll=()=>[];c.v69UploadValues=()=>[];
 c.ua176CaptureAllocation();assert.deepEqual(copy(vm.runInContext('UA176.drafts.spaces',c)),[{id:'S',name:'保留的客厅'}]);
});


test('PM 的设计期限对每位主管保存，确认页只读展示，承接与 GDS 请求继承同一截止值',()=>{
 const c=fixture(),names=c.ua176Supervisors().slice(0,2);c.TODOS.push({id:'PT',type:'项目待办',project:'P',owner:'PM',status:'待处理'});
 const invites=c.ua176CommitAllocation({project:'P',mode:'design',sourceTodoId:'PT',token:'DUE'},names,{expectedCompletionAt:'2026-10-20'},[]);
 assert.equal(invites.length,2);assert.ok(invites.every(t=>t.expectedCompletionAt==='2026-10-20T23:59:59.999+08:00'&&t.allocation.expectedCompletionAt===t.expectedCompletionAt));
 c.todoPending={id:invites[0].id,action:'accept'};assert.match(c.MODALS.confirmTodo.html(),/设计期望完成时间.*2026-10-20 23:59/);
 // Use the real GDS queue decorator to verify the generated design task payload.
 vm.runInContext(slice(read('designGds.js'),'function gds171Queue(','function gds171Requests(')+slice(read('designGds.js'),'const gds171AddBase=','const gds171StartBase='),c);
 const id=c.v68CreateOpportunity(invites[0]),task=c.TODOS.find(t=>t.type==='设计待办'&&t.opp===id);
 assert.equal(task.expectedCompletionAt,invites[0].expectedCompletionAt);assert.equal(task.gds.requests[0].payload.expectedCompletionAt,invites[0].expectedCompletionAt);
 assert.equal(c.TODOS.find(t=>t.type==='报价待办'&&t.opp===id).expectedCompletionAt,undefined);
 const count=c.TODOS.length;c.v68CreateOpportunity(invites[0]);assert.equal(c.TODOS.length,count);
});

test('缺失或无效设计期限不能分配；未授权、保存失败与重复提交均不破坏原任务',()=>{
 const c=fixture(),name=c.ua176Supervisors()[0],state={project:'P',mode:'design',sourceTodoId:'',token:'DEADLINE'};
 for(const date of ['', '2026-02-30', '随便填'])assert.throws(()=>c.ua176CommitAllocation(state,[name],{expectedCompletionAt:date},[]),/期望完成/);
 assert.equal(c.TODOS.length,0);c.actor='其他人';assert.throws(()=>c.ua176CommitAllocation(state,[name],{expectedCompletionAt:'2026-10-20'},[]),/项目经理/);assert.equal(c.TODOS.length,0);
 c.actor='PM';c.failSave=true;assert.throws(()=>c.ua176CommitAllocation(state,[name],{expectedCompletionAt:'2026-10-20'},[]),/未保存/);assert.equal(c.TODOS.length,0);
 c.failSave=false;const [task]=c.ua176CommitAllocation(state,[name],{expectedCompletionAt:'2026-10-20'},[]),id=task.id;
 const [again]=c.ua176CommitAllocation(state,[name],{expectedCompletionAt:'2026-10-25'},[]);assert.equal(again.id,id);assert.equal(again.expectedCompletionAt,'2026-10-20T23:59:59.999+08:00');
 c.todoPending={id:'HISTORY'};c.TODOS.push({id:'HISTORY',type:'确认商机',designOpportunity:true});assert.match(c.MODALS.confirmTodo.html(),/未设置/);
});
