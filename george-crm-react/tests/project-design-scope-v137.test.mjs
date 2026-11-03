import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const management=fs.readFileSync(new URL('../src/compat/runtime/managementWorkflow.js',import.meta.url),'utf8');
const revisions=fs.readFileSync(new URL('../src/compat/runtime/quoteRevision.js',import.meta.url),'utf8');
const progress=fs.readFileSync(new URL('../src/compat/runtime/projectFormProgress.js',import.meta.url),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
function setup(type='暂无'){
 const noop=()=>'',context={actor:'PM',PROJECTS:[['P','住宅项目','','','','','北美','客户','','PM']],PROJECT_EXTRA:{P:{formData:{designType:type,purchaseCategory:['家具'],spaceCats:[{id:'S',name:'原客厅',cats:['家具']}]},pendingDesign:{designType:'采购方案设计'}}},PROJECT_FILES:{},PROJECT_QUOTES:{P:[]},PROJECT_TYPES:[{items:[['住宅']]}],CATS:['家具','灯饰'],OPPS:[],ORDERS:[],TODOS:[],DRAFT_DATA:{},TODO_TYPES:[],V18_TODO_NAMES:{},CHAIN_STEPS:['项目待办','设计待办'],wizardState:{project:{designType:'暂无'}},wizardEdit:'',step:'project',archiveProject:'P',document:{createElement:()=>({}),head:{appendChild(){}},addEventListener(){}},v3Copy:copy,esc:String,v17Owner:()=>context.actor,todoStamp:()=> '2026-10-10 12:00',orderOppOf:o=>o[17],v21CanOperate:t=>t.owner===context.actor,bs131CanMaintain:()=>context.actor==='PM',oqOpp:id=>context.OPPS.find(o=>o[0]===id),oqCanQuote:()=>true,oqDesignType:v=>({'设计服务+采购产品':'采购方案设计','设计服务':'独立设计服务'})[v]||v||'暂无',findProject:id=>context.PROJECTS.find(p=>p[0]===id),todoActs:noop,handleAct:noop,openPlannedTodoForm:noop,updateWizardHint:noop,pageOppDetail:noop,RENDER:{},todoSubject:noop,dw132HandoffErrors:noop,writeProjectExtra:(p,d)=>{context.PROJECT_EXTRA[p].formData=copy(d);return p;},v68StoreProject:()=>{context.creates=(context.creates||0)+1;context.TODOS.push({id:'NEW-T',type:'项目待办',project:'NEW',owner:'PM',status:'待处理'});return 'NEW';},projectMissingList:()=>[],oqInitiateDesign:()=>{context.requests=(context.requests||0)+1;},v125ApplySpaceImpact:()=>{context.impacts=(context.impacts||0)+1;}};
 context.addChainTodo=d=>{const t={id:'T'+(context.TODOS.length+1),status:'待处理',...copy(d)};context.TODOS.unshift(t);return t;};
 context.v125ProjectSpaces=p=>copy(context.PROJECT_EXTRA[p]?.formData?.spaceCats||[]);
 context.oqDesignSpaces=(p,spaces)=>spaces.map(s=>({...s,cats:copy(Array.isArray(s.cats)?s.cats:context.v125ProjectSpaces(p).find(old=>old.id===s.id)?.cats||[])}));
 context.bs131Atomic=fn=>{const before=copy({PROJECT_EXTRA:context.PROJECT_EXTRA,PROJECT_FILES:context.PROJECT_FILES,TODOS:context.TODOS,OPPS:context.OPPS});try{const r=fn();if(context.fail)throw Error('保存失败');return r;}catch(error){Object.assign(context,before);throw error;}};
 vm.createContext(context);vm.runInContext(management,context);return context;
}
function design(c,type='采购方案设计'){
 const task={id:'DES',type:'设计待办',project:'P',status:'待处理',owner:'设计师',needInfo:{designType:type,attachments:[{name:'customer.dwg'}]}};c.TODOS.push(task);c.actor='设计师';return task;
}
const data={projectType:'住宅',projectArea:'100㎡',spaceCats:[{id:'S',name:'新客厅',cats:['家具']}],purchaseCategory:['家具'],attachments:[{name:'design.pdf'}]};

test('两类设计项目通过保存并发起入口保存，普通保存只允许暂无',()=>{
 const c=setup();assert.equal(c.v68StoreProject(null,{designType:'暂无'}),'NEW');
 for(const designType of ['独立设计服务','采购方案设计'])assert.throws(()=>c.v68StoreProject(null,{designType}),/保存并发起设计待办/);
 assert.equal(c.creates,1);c.wizardState.project.designType='采购方案设计';assert.equal(c.projectMissingList().length,0);
});
test('采购设计提交要求空间和每个空间品类；独立设计免填空间和品类且保留旧范围',()=>{
 const c=setup(),task=design(c);
 assert.throws(()=>c.dw132CompleteDesign(task,{...data,spaceCats:[]}),/空间名称/);
 assert.throws(()=>c.dw132CompleteDesign(task,{...data,spaceCats:[{name:'客厅',cats:[]}]}),/空间选择品类|采购品类/);
 assert.throws(()=>c.dw132CompleteDesign(task,{...data,spaceCats:[{name:'客厅',cats:['家具']},{name:'客厅',cats:['灯饰']}]}),/不能重复/);
 const standalone=setup('独立设计服务'),independent=design(standalone,'独立设计服务');
 const review=standalone.dw132CompleteDesign(independent,{...data,spaceCats:[]});assert.equal(review.handoff.spaceCats.length,0);assert.deepEqual([...review.handoff.purchaseCategory],['家具']);
 const fresh=setup('独立设计服务');fresh.PROJECT_EXTRA.P.formData.purchaseCategory=[];const freshTask=design(fresh,'独立设计服务');
 const freshReview=fresh.dw132CompleteDesign(freshTask,{...data,spaceCats:[],purchaseCategory:[]});assert.equal(freshReview.handoff.purchaseCategory.length,0);fresh.actor='PM';fresh.mgSyncDesign(freshReview,{...data,spaceCats:[],purchaseCategory:[]});assert.equal(fresh.PROJECT_EXTRA.P.formData.purchaseCategory.length,0);
});
test('旧采购设计提交仍由PM同步档案，锁定后的实际存储与重复发起入口阻止类型变化',()=>{
 const c=setup(),task=design(c),review=c.dw132CompleteDesign(task,data);
 assert.equal(c.PROJECT_EXTRA.P.formData.designType,'暂无');assert.equal(c.mgProjectDesignLocked('P'),'');assert.equal(c.PROJECT_FILES.P,undefined);
 c.actor='PM';c.mgSyncDesign(review,data);assert.equal(c.PROJECT_EXTRA.P.formData.designType,'采购方案设计');assert.equal(c.mgProjectDesignLocked('P'),'采购方案设计');assert.equal(c.PROJECT_EXTRA.P.pendingDesign,undefined);
 assert.throws(()=>c.writeProjectExtra('P',{...c.PROJECT_EXTRA.P.formData,designType:'暂无'}),/不能更改/);
 assert.throws(()=>c.oqInitiateDesign('P',{designType:'独立设计服务'}),/仅设计类型为暂无/);
 c.actor='SM';assert.throws(()=>c.oqInitiateDesign('P',{designType:'采购方案设计'}),/项目经理/);
});
test('独立设计同步保留旧空间身份和报价记录，不执行空间变更，类型也锁定',()=>{
 const c=setup('独立设计服务'),old=JSON.stringify(c.PROJECT_EXTRA.P.formData.spaceCats),task=design(c,'独立设计服务'),review=c.dw132CompleteDesign(task,{...data,spaceCats:[]});
 c.PROJECT_QUOTES.P=[{space:'原客厅',products:[['旧产品']]}];const quotes=JSON.stringify(c.PROJECT_QUOTES.P);
 c.actor='PM';c.mgSyncDesign(review,{...data,spaceCats:[]});assert.equal(JSON.stringify(c.PROJECT_EXTRA.P.formData.spaceCats),old);assert.equal(JSON.stringify(c.PROJECT_QUOTES.P),quotes);assert.equal(c.impacts,undefined);assert.equal(c.mgProjectDesignLocked('P'),'独立设计服务');
 assert.throws(()=>c.writeProjectExtra('P',{...c.PROJECT_EXTRA.P.formData,designType:'暂无'}),/不能更改/);
});
test('同步存储失败不会改变项目类型、锁定、文件、待办或原始提交快照',()=>{
 const c=setup(),task=design(c),review=c.dw132CompleteDesign(task,data),before=JSON.stringify(c.PROJECT_EXTRA.P),snapshot=JSON.stringify(review.submittedSnapshot);
 c.actor='PM';c.fail=true;assert.throws(()=>c.mgSyncDesign(review,data),/保存失败/);assert.equal(JSON.stringify(c.PROJECT_EXTRA.P),before);assert.equal(c.mgProjectDesignLocked('P'),'');assert.equal(c.PROJECT_FILES.P,undefined);assert.equal(c.TODOS.find(t=>t.id===review.id).status,'待处理');assert.equal(JSON.stringify(c.TODOS.find(t=>t.id===review.id).submittedSnapshot),snapshot);
});
test('待接受与已拒绝显示正式商机命名规则，不显示通知或待办标题',()=>{
 const c=setup();c.TODOS.push({id:'A',type:'确认商机',project:'P',cat:'家具',owner:'SM',title:'请确认家具商机',status:'待处理'},{id:'D',type:'确认商机',project:'P',cat:'设计服务',owner:'设计师',designOpportunity:true,title:'请接收设计待办',status:'已驳回'});
 assert.deepEqual([...c.mgOppRows().map(row=>row[1])],['住宅项目-家具','住宅项目 · 设计服务 · 设计师']);
});
test('只有采购方案设计报价校验项目空间，暂无和独立设计包括加单都不按空间校验',()=>{
 const c=setup();c.v3Cats=()=>['家具'];vm.runInContext(revisions.slice(0,revisions.indexOf('function v125DraftLocked(')),c);
 const quote={project:'P',tpl:'家具',isAddon:true,selectedSpaces:[],spaces:[{name:'任意名称',products:[]}]};
 assert.equal(c.v125SpaceValidation(quote),'');c.PROJECT_EXTRA.P.formData.designType='独立设计服务';assert.equal(c.v125SpaceValidation(quote),'');
 c.PROJECT_EXTRA.P.formData.designType='采购方案设计';assert.match(c.v125SpaceValidation(quote),/加单尚未指定/);quote.isAddon=false;assert.match(c.v125SpaceValidation(quote),/空间与项目不符/);
 quote.spaces=[{name:'原客厅',products:[]}];assert.equal(c.v125SpaceValidation(quote),'');
});
test('创建进度不要求初始范围，已同步洗图项目编辑继续要求空间品类',()=>{
 const c=setup();vm.runInContext(progress.slice(0,progress.indexOf('function pfpRender(')),c);for(const type of ['暂无','采购方案设计','独立设计服务'])assert.equal(c.pfpRequirements({designType:type}).some(f=>f.selector==='#projCatBox'),false);
 c.wizardEdit='project';assert.equal(c.pfpRequirements({designType:'采购方案设计'}).find(f=>f.selector==='#projCatBox').name,'空间与采购品类');
});

test('创建项目独立设计无需采购品类，切回暂无恢复品类校验',()=>{
 const c=setup();c.wizardFlow='project';c.wizardState.project={customerPick:'客户',projectName:'项目',projectLocation:'美国',deliveryManager:'交付',projectType:'住宅',designType:'独立设计服务',designer:'设计师',projectProgress:'装修中',logisticsMethod:'FOB',commissionRate:'0',purchaseCategory:[]};
 const crm=fs.readFileSync(new URL('../src/compat/runtime/crm.js',import.meta.url),'utf8');
 vm.runInContext(crm.slice(crm.indexOf('function val('),crm.indexOf('function customerMissingList('))+crm.slice(crm.indexOf('function projectMissingList('),crm.indexOf('function projectTypeScore(')),c);
 assert.equal(c.projectMissingList().includes('采购品类'),false);c.wizardState.project.designType='暂无';assert.equal(c.projectMissingList().includes('采购品类'),false);
 assert.doesNotMatch(c.mgDesignScopeHtml('独立设计服务'),/mgDesignCategory|空间与采购品类/);
});
test('非空间项目的品类变更仅更新受影响报价，保留历史与备货订单',()=>{
 const c=setup(),start=revisions.indexOf('function v137ProjectCategories('),end=revisions.indexOf('function v125Backup(',start);
 c.V3={meta:{Q:{project:'P',active:true,status:'已确认',categories:['家具'],confirmedCats:['家具'],submitted:{name:'原报价'},quoteVersions:[{id:'H1',products:['原产品']}]},L:{project:'P',active:true,categories:['灯饰'],confirmedCats:['灯饰']},S:{project:'P',active:true,categories:['电器'],confirmedCats:['电器'],stocked:true}}};
 c.v125DraftLocked=meta=>!!meta.stocked;c.v3Stamp=()=> '2026-10-10 12:00';c.v3Meta=code=>c.V3.meta[code];c.v125EnsureBaseline=()=>{};c.qNum=value=>Number(value)||0;c.QUOTE_UI={clientSelected:{}};
 c.TODOS=[{id:'TQ',type:'报价待办',project:'P',cat:'家具',status:'待处理',draft:'Q'},{id:'TL',type:'报价待办',project:'P',cat:'灯饰',status:'待处理',draft:'L'},{id:'TS',type:'报价待办',project:'P',cat:'电器',status:'已处理',draft:'S'}];
 c.PROJECT_QUOTES.P=[{space:'旧分组',confirmedCats:['家具','灯饰','电器'],products:[['家具产品','家具',100,'','','',{draftCode:'Q'}],['灯饰产品','灯饰',200,'','','',{draftCode:'L'}],['备货电器','电器',300,'','','',{draftCode:'S'}]]}];
 c.ORDERS=[['已备货订单']];const history=JSON.stringify(c.V3.meta.Q.quoteVersions),orders=JSON.stringify(c.ORDERS),oldSpaces=JSON.stringify(c.PROJECT_EXTRA.P.formData.spaceCats);
 vm.runInContext(revisions.slice(start,end),c);
 const impact=c.v137ApplyCategoryImpact('P',['家具','灯饰','电器'],['灯饰']);
 assert.deepEqual([...impact.editable],['Q']);assert.deepEqual([...impact.protected],['S']);assert.equal(c.V3.meta.Q.status,'已暂存');assert.equal(c.V3.meta.Q.active,false);assert.equal(c.TODOS[0].status,'已取消');assert.equal(c.TODOS[1].status,'待处理');assert.equal(c.TODOS[2].status,'已处理');
 assert.deepEqual([...c.PROJECT_QUOTES.P[0].products.map(product=>product[0])],['灯饰产品','备货电器']);assert.equal(c.V3.meta.L.active,true);assert.equal(c.V3.meta.S.active,true);assert.equal(JSON.stringify(c.V3.meta.Q.quoteVersions),history);assert.equal(JSON.stringify(c.ORDERS),orders);assert.equal(JSON.stringify(c.PROJECT_EXTRA.P.formData.spaceCats),oldSpaces);
 const same=c.v137CategoryImpact('P',['灯饰','家具'],['家具','灯饰']);assert.equal(same.affected.length,0);
});

