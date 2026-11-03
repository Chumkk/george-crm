import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/compat/runtime/opportunityQuotes.js',import.meta.url),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
function setup(){
 const noop=()=>'', c={console,crypto:{randomUUID:()=>String(Math.random())},PROJECTS:[['P','项目','','','','北美','客户','客户','','PM']],PROJECT_EXTRA:{P:{formData:{spaceCats:[{id:'S',name:'客厅',cats:['家具']}]}}},PROJECT_FILES:{},OPPS:[],TODOS:[],ORDERS:[],DRAFTS:[],DRAFT_DATA:{},PROJECT_QUOTES:{P:[]},V3:{meta:{}},QUOTE_UI:{fx:{ccy:'CNY',rate:1}},RENDER:{},TAB_NAME:{},V5_NAV:[],TODO_TYPES:[],V18_TODO_NAMES:{},DW132:{},V68:{},wizardState:{project:{},files:{}},DESIGNERS:['设计甲','设计乙'],PROJECT_TYPES:[{items:[['住宅']]}],PMS:['PM'],document:{getElementById:()=>null},v3Copy:copy,v17Owner:()=>c.actor||'PM',v3Stamp:()=> '2026-10-09 12:00',todoStamp:()=> '2026-10-09 12:00',v21CanOperate:t=>!c.actor||t.owner===c.actor,bs131CanMaintain:()=>true,dw132Designers:()=>['设计甲','设计乙'],qMoney:n=>'¥'+n,markPagesDirty:noop,toast:noop,esc:String};
 for(const name of ['todoBlockedReason','todoActs','orderRowsHtml','pageOppDetail','pageDetail','v68CreateOpportunity','confirmCreateFee','openPlannedTodoForm','v81OpenTodoEdit','projectFormHtml','v68StoreProject','pageProjects','openPage','handleAct','bs131CreateAddon','dw132OldActs','dw132OldFlow','pageOpps','v16QuoteWaiting','todoSubject'])c[name]=noop;
 c.projectMissingList=()=>['采购品类','请为每个空间选择品类','项目名称'];
 c.findProject=id=>c.PROJECTS.find(p=>p[0]===id);c.nextOrderNo=()=> 'O'+(c.ORDERS.length+1);c.v3NewCode=()=> 'Q'+(c.DRAFTS.length+1);
 c.v3Cats=d=>[...new Set((d.spaces||[]).flatMap(s=>(s.products||[]).map(p=>p.cat)))];
 c.v3Meta=code=>c.V3.meta[code]||=( {project:c.DRAFT_DATA[code]?.project,categories:[],revision:0,confirmedCats:[],bindings:{}} );
 c.v3Normalize=copy;c.v3DraftAmount=d=>(d.spaces||[]).flatMap(s=>s.products||[]).reduce((s,p)=>s+p.amt,0);
 c.upsertDraftFromPims=d=>{const code=d.draftCode||c.v3NewCode();c.DRAFT_DATA[code]={...copy(d),draftCode:code};if(!c.DRAFTS.some(r=>r[0]===code))c.DRAFTS.push([code,d.name,'PM']);c.v3Meta(code);return code;};
 c.addChainTodo=d=>{const t={id:'T'+(c.TODOS.length+1),status:'待处理',...copy(d)};c.TODOS.push(t);return t;};
 c.v125ProjectSpaces=p=>copy(c.PROJECT_EXTRA[p].formData.spaceCats);c.v125DraftBatch=d=>({oppId:d.oppId||'',selectedSpaces:d.selectedSpaces||[],addon:!!d.isAddon});
 c.v125SpaceValidation=d=>{const wanted=d.selectedSpaces||['客厅'];return JSON.stringify(d.spaces.map(s=>s.name).sort())===JSON.stringify([...wanted].sort())?'':'空间不符';};
 c.v126DraftLockReason=()=>'';c.v125EnsureBaseline=()=>{};
 c.v125Snapshot=(code,m)=>({id:code+':'+m.revision,requestId:m.submissionRequestId,revision:m.revision,spaces:copy(m.submitted.spaces),submittedBy:m.submittedBy});
 c.v3RebuildDraftQuotes=code=>{c.PROJECT_QUOTES.P=[{code,products:copy(c.V3.meta[code].submitted.spaces),confirmedCats:[]}];};
 c.orderOppOf=o=>o[17];c.assertProjectAllocationActor=()=>{};c.completeProjectAllocation=()=>{};c.v81CanEditTodo=t=>t.status!=='已处理';
 c.v125ApplySpaceImpact=()=>{};
 c.bs131Atomic=fn=>{const before=copy({OPPS:c.OPPS,TODOS:c.TODOS,ORDERS:c.ORDERS,DRAFTS:c.DRAFTS,DRAFT_DATA:c.DRAFT_DATA,V3:c.V3,PROJECT_QUOTES:c.PROJECT_QUOTES,PROJECT_EXTRA:c.PROJECT_EXTRA,PROJECT_FILES:c.PROJECT_FILES});try{const value=fn();if(c.fail)throw Error('保存失败');return value;}catch(e){Object.assign(c,before);throw e;}};
 vm.createContext(c);vm.runInContext(source,c);
 c.OPPS.push(['B','家具商机','进行中','家具','P','北美','客户','SM']);return c;
}
function quote(c,amount=100){const code=c.oqCreateQuote('B');return {code,data:{...copy(c.DRAFT_DATA[code]),spaces:[{name:'客厅',products:[{name:'椅子',cat:'家具',sku:'CH',qty:1,price:amount,amt:amount}]}]}};}

test('待办中心编辑提交留在原待办列表，失败不切页，其他商机和独立入口不借用返回上下文',()=>{
 const c=setup(),{code,data}=quote(c),pages=[];c.openPage=p=>{pages.push(p);c.page=p;};c.page='todos';c.oqRememberTask(code,'B');c.page='draftEditor';c.fail=true;assert.equal(c.applyDraftSaved(data),false);assert.equal(pages.length,0);c.fail=false;c.applyDraftSaved(data);assert.deepEqual(pages,['todos']);assert.equal(c.TODOS[0].status,'已处理');
 c.page='oppDetail';c.oqRememberTask(code,'B');c.applyDraftSaved({...data,submissionRequestId:'other-entry'});assert.equal(pages.at(-1),'oppDetail');
 c.page='todos';c.oqRememberTask(code,'OTHER');c.applyDraftSaved({...data,submissionRequestId:'wrong-task'});assert.equal(pages.at(-1),'oppDetail');
});
test('报价待办的创建和编辑携带精确入口，不依赖教程或页面瞬时状态',()=>{
 const c=setup(),pages=[];c.pageEl=()=>null;c.openPage=p=>{pages.push(p);c.page=p;};
 const task=c.oqEnsureTodo(c.oqOpp('B'));c.page='oppDetail';
 c.handleAct({dataset:{act:'oqEdit',id:task.id,opp:'B'}});
 const code=task.draft,data={...copy(c.DRAFT_DATA[code]),spaces:[{name:'客厅',products:[{name:'椅子',cat:'家具',qty:1,price:100,amt:100}]}]};
 assert.equal(pages.at(-1),'draftEditor');c.applyDraftSaved(data);assert.equal(pages.at(-1),'todos');assert.equal(task.status,'已处理');
 c.page='oppDetail';c.handleAct({dataset:{act:'oqEdit',id:task.id,opp:'B',code}});c.applyDraftSaved({...data,submissionRequestId:'edit-from-task'});assert.equal(pages.at(-1),'todos');
 assert.equal(c.todoActs(task).some(a=>a.act==='oqReview'),false);
});
test('不同报价编辑页切换不丢失各自的待办返回入口',()=>{
 const c=setup(),first=quote(c),pages=[];c.openPage=p=>{pages.push(p);c.page=p;};
 c.page='todos';c.oqRememberTask(first.code,'B');
 c.OPPS.push(['B2','另一商机','进行中','家具','P','北美','客户','SM']);const second=c.oqCreateQuote('B2');c.page='todos';c.oqRememberTask(second,'B2');
 c.page='draftEditor';c.applyDraftSaved(first.data);assert.equal(pages.at(-1),'todos');assert.equal(c.TODOS[0].status,'已处理');
 c.page='oppDetail';c.oqRememberTask(first.code,'B');c.applyDraftSaved({...first.data,submissionRequestId:'independent'});assert.equal(pages.at(-1),'oppDetail');
});
function customerView(c, batch='original'){
 c.archiveProject='P';c.BS131_BATCH={P:batch};c.ensureClientCat=()=> '家具';
 c.projectQuoteRows=p=>c.PROJECT_QUOTES[p]||[];c.openClientQuoteView=()=>{};
 c.bs131BatchSelect=()=>batch==='original'?'':'批次选择';c.v3Status=()=> '已确认';
 c.bs131BatchRecords=(project,cat,selected=c.BS131_BATCH[project])=>Object.entries(c.V3.meta).filter(([,m])=>m.project===project&&m.submitted&&!m.needsSpaceUpdate&&m.active!==false&&m.categories.includes(cat)&&(selected==='all'||(m.submitted.isAddon?m.submitted.oppId:'original')===selected));
}
test('客户持链接直接确认：保留版本和时间，不重复已完成待办或新增ERP请求',()=>{
 const c=setup(),{code,data}=quote(c);c.applyDraftSaved(data);customerView(c);
 c.v3ConfirmCategory();const m=c.V3.meta[code],version=m.quoteVersions.find(v=>v.id===m.currentQuoteVersion);
 assert.equal(m.confirmedAt,'2026-10-09 12:00');assert.deepEqual([...version.confirmedCats],['家具']);assert.equal(version.confirmations.length,1);assert.equal(version.confirmations[0].time,m.confirmedAt);
 assert.equal(c.PROJECT_QUOTES.P[0].confirmedCats[0],'家具');assert.equal(c.TODOS[0].status,'已处理');assert.equal(c.ORDERS[0][18].erpRequests.length,1);
 c.v3Stamp=()=> '2026-10-09 13:00';c.v3ConfirmCategory();assert.equal(version.confirmations.length,1);assert.equal(m.confirmedAt,'2026-10-09 12:00');
 c.applyDraftSaved({...data,submissionRequestId:'NEXT'});assert.equal(c.V3.meta[code].confirmedCats.length,0);assert.equal(c.V3.meta[code].quoteVersions[0].confirmations.length,1);
});
test('客户确认保存失败回滚；空间变更待更新的旧发布报价不能确认',()=>{
 const c=setup(),{code,data}=quote(c);c.applyDraftSaved(data);customerView(c);c.fail=true;c.v3ConfirmCategory();
 assert.equal(c.V3.meta[code].confirmedCats.length,0);assert.equal(c.V3.meta[code].quoteVersions[0].confirmations,undefined);assert.equal(c.TODOS[0].status,'已处理');
 c.fail=false;c.V3.meta[code].needsSpaceUpdate=true;c.v3ConfirmCategory();assert.equal(c.V3.meta[code].confirmedCats.length,0);
});
test('报价创建即归属商机，保存不更新订单发布内容和总览',()=>{const c=setup(),{code,data}=quote(c);assert.equal(c.ORDERS[0][2],'报价单');assert.equal(c.oqStatus(code),'待报价');c.v3QuickSave(data);assert.equal(c.oqStatus(code),'已暂存');assert.equal(c.ORDERS[0][10],'¥0');assert.equal(c.PROJECT_QUOTES.P.length,0);assert.equal(c.TODOS[0].status,'待处理');assert.equal(c.oqSavedAmount(c.ORDERS[0]),100);assert.equal(c.ORDERS[0][18].erpRequests,undefined);});
test('同一商机在所有报价及备货状态下都不能重复创建报价单',()=>{const c=setup(),{code,data}=quote(c);assert.throws(()=>c.oqCreateQuote('B'),/不允许重复创建/);c.v3QuickSave(data);assert.throws(()=>c.oqCreateQuote('B'),/不允许重复创建/);c.applyDraftSaved(data);c.oqConfirmQuote(code,1);c.ORDERS[0][3]='备货中';assert.throws(()=>c.oqCreateQuote('B'),/不允许重复创建/);assert.equal(c.ORDERS.length,1);assert.equal(c.DRAFTS.length,1);});
test('提交立即记录一次ERP请求并完成精确关联待办，重复请求不重复传输',()=>{const c=setup(),{code,data}=quote(c);c.applyDraftSaved({...data,submissionRequestId:'R1'});assert.equal(c.oqStatus(code),'已提交');assert.equal(c.ORDERS[0][18].erpRequests.length,1);c.TODOS.push({id:'OTHER',type:'报价待办',opp:'OTHER',status:'待处理',draft:code});c.oqConfirmQuote(code,1);c.oqConfirmQuote(code,1);assert.equal(c.ORDERS[0][18].erpRequests.length,1);assert.equal(c.TODOS[0].status,'已处理');assert.equal(c.TODOS[1].status,'待处理');});
test('传输后的保存不改已发布报价；再次提交更新相同订单并保留旧版本',()=>{const c=setup(),{code,data}=quote(c);c.applyDraftSaved(data);c.oqConfirmQuote(code,1);const no=c.ORDERS[0][0],history=JSON.stringify(c.V3.meta[code].quoteVersions[0]);const edited={...data,spaces:[{name:'客厅',products:[{name:'椅子',cat:'家具',sku:'CH',qty:2,price:100,amt:200}]}]};c.v3QuickSave(edited);assert.equal(c.ORDERS[0][10],'¥100');assert.equal(c.PROJECT_QUOTES.P[0].products[0].products[0].amt,100);assert.throws(()=>c.oqConfirmQuote(code,1),/提交最新报价/);c.applyDraftSaved(edited);assert.equal(c.ORDERS[0][0],no);assert.equal(c.ORDERS[0][10],'¥200');assert.equal(c.ORDERS[0][18].erpRequests.length,2);assert.equal(JSON.stringify(c.V3.meta[code].quoteVersions[0]),history);assert.equal(c.V3.meta[code].quoteVersions.length,2);});
test('空间校验失败和权限变化不发布；备货后的报价禁止保存、提交和确认',()=>{const c=setup(),{code,data}=quote(c);assert.equal(c.applyDraftSaved({...data,spaces:[{...data.spaces[0],name:'厨房'}]}),false);assert.equal(c.V3.meta[code].revision,0);c.actor='OTHER';assert.equal(c.applyDraftSaved(data),false);c.actor='SM';c.applyDraftSaved(data);c.ORDERS[0][18].stockStatus='备货中';assert.equal(c.applyDraftSaved(data),false);assert.throws(()=>c.oqConfirmQuote(code,1),/备货/);});
test('提交保存失败回滚报价、总览、ERP请求和待办，旧版本不能再次办理',()=>{
 const c=setup(),{code,data}=quote(c);c.fail=true;assert.equal(c.applyDraftSaved(data),false);
 assert.equal(c.V3.meta[code].submitted,undefined);assert.equal(c.ORDERS[0][18].erpRequests,undefined);assert.equal(c.TODOS[0].status,'待处理');assert.equal(c.PROJECT_QUOTES.P.length,0);
 c.fail=false;c.applyDraftSaved(data);assert.throws(()=>c.oqConfirmQuote(code,0),/报价已更新/);
});
test('设计多人分配只发确认待办，接受后才创建商机和报价待办',()=>{const c=setup();c.dw132CreateOpportunities('P',['设计甲','设计乙'],'','TOKEN');assert.equal(c.OPPS.length,1);assert.equal(c.TODOS.filter(t=>t.type==='确认商机').length,2);c.dw132CreateOpportunities('P',['设计甲','设计乙'],'','TOKEN');assert.equal(c.TODOS.length,2);const task=c.TODOS[0];const id=c.v68CreateOpportunity(task);assert.equal(c.OPPS.length,2);assert.equal(c.oqOpp(id)[20].kind,'design');assert.equal(c.TODOS.filter(t=>t.type==='报价待办').length,1);assert.throws(()=>c.dw132CreateOpportunities('P',['设计甲'],'','OTHER'),/已有/);});
test('设计费用保存不完成待办；成功提交即完成',()=>{const c=setup();c.dw132CreateOpportunities('P',['设计甲']);const id=c.v68CreateOpportunity(c.TODOS[0]);const row=c.dw132FeeOrder(id,500,{gdsRemark:'设计'}),code=row[18].quoteCode;assert.equal(c.oqStatus(code),'已暂存');assert.equal(c.TODOS.find(t=>t.opp===id).status,'待处理');c.oqPublishDesign(code);assert.equal(c.oqStatus(code),'已提交');c.oqConfirmQuote(code,1);assert.equal(c.TODOS.find(t=>t.opp===id).status,'已处理');assert.equal(c.TODOS.some(t=>['设计单','订单待办'].includes(t.type)),false);});
test('项目设计发起与确认沉淀资料，保留空间品类，不再创建项目待办',()=>{const c=setup();const t=c.oqInitiateDesign('P',{designType:'设计服务+采购产品',designer:'设计甲',note:'CAD',attachments:[{name:'a.dwg'}]},'REQUEST');assert.equal(t.needInfo.designType,'采购方案设计');c.dw132CompleteDesign(t,{projectType:'住宅',projectArea:'100㎡',spaceCats:[{id:'S',name:'客厅'}],attachments:[{name:'d.pdf'}]});assert.equal(c.PROJECT_EXTRA.P.formData.spaceCats[0].cats[0],'家具');assert.equal(c.PROJECT_FILES.P.designFile[0].name,'d.pdf');assert.equal(c.TODOS.some(t=>t.type==='创建项目待办'),false);assert.equal(t.status,'已处理');});

test('设计待办底层支持两个设计类型，暂无不能作为设计需求提交',()=>{
 const c=setup(),input={designType:'独立设计服务',designer:'设计甲',attachments:[{name:'原图.dwg'}],note:'新需求'};
 assert.throws(()=>c.oqInitiateDesign('P',{...input,designType:'暂无'},'NONE'),/有效的设计类型/);
 const task=c.oqInitiateDesign('P',input,'NEW');assert.equal(task.needInfo.designType,'独立设计服务');assert.equal(task.type,'设计待办');
});

test('已保存独立设计待办可按原类型编辑重提，保留原附件和历史且不新增任务',()=>{
 const c=setup(),original={designType:'设计服务',designer:'设计甲',attachments:[{id:'FILE',name:'原图.dwg'}],note:'原需求'};
 c.TODOS.push({id:'OLD',type:'设计待办',project:'P',requestId:'OLD-REQUEST',status:'已驳回',rejectReason:'请补充',needInfo:copy(original)});
 assert.throws(()=>c.oqInitiateDesign('P',{...original,designType:'采购方案设计'},'OLD-REQUEST','OLD'),/设计类型不能更改/);
 const task=c.oqInitiateDesign('P',{...original,designType:'独立设计服务',note:'已补充'},'OLD-REQUEST','OLD');
 assert.equal(c.TODOS.length,1);assert.equal(task.id,'OLD');assert.equal(task.status,'待处理');assert.equal(task.needInfo.designType,'独立设计服务');assert.equal(task.needInfo.attachments[0].id,'FILE');
 assert.deepEqual(copy(task.editHistory[0].before),original);assert.equal(task.editHistory[0].rejectReason,'请补充');assert.equal(c.PROJECT_EXTRA.P.pendingDesign.taskId,'OLD');
});

test('所有设计类型均保留品类校验，报价流程不再豁免独立设计服务的品类',()=>{const c=setup();for(const type of ['暂无','独立设计服务','采购方案设计']){c.wizardState.project.designType=type;assert.equal(c.projectMissingList().includes('采购品类'),true,type);}});

 test('提交回执在切页前只通知保存成功的精确报价，失败和仅保存不通知',()=>{
 const c=setup(),events=[];c.CustomEvent=class{constructor(type,{detail}){this.type=type;this.detail=detail;}};c.window={dispatchEvent:e=>events.push(e)};const {code,data}=quote(c);
 c.v3QuickSave(data);assert.equal(events.length,0);
 c.fail=true;assert.equal(c.applyDraftSaved({...data,submissionRequestId:'failed'}),false);assert.equal(events.length,0);
 c.fail=false;assert.equal(c.applyDraftSaved({...data,submissionRequestId:'saved'}),code);assert.equal(events.length,1);assert.equal(events[0].type,'george:quotation-published');assert.deepEqual(copy(events[0].detail),{draftCode:code,opp:'B',project:'P',submissionRequestId:'saved',durable:true});
 });

 test('提交后使用未执行业务状态并保留独立请求；旧本地标记不再当ERP状态',()=>{
 const c=setup(),{code,data}=quote(c);c.applyDraftSaved(data);c.oqConfirmQuote(code,1);const row=c.oqOrder(code);assert.equal(row[3],'未执行');assert.equal(row[18].erpState,'等待ERP回执');assert.equal(row[18].erpRequests[0].state,'等待ERP对接');
 row[3]='等待ERP回执';const executing=[...copy(row)],fee=[...copy(row)],unsent=[...copy(row)];executing[3]='执行中';fee[18]={kind:'fee'};unsent[18].erpRequestedRevision=0;c.ORDERS.push(executing,fee,unsent);const requests=JSON.stringify(row[18].erpRequests);c.oqNormalizeExecutionStates();c.oqNormalizeExecutionStates();assert.equal(row[3],'未执行');assert.equal(executing[3],'执行中');assert.equal(fee[3],'等待ERP回执');assert.equal(unsent[3],'未执行');assert.equal(JSON.stringify(row[18].erpRequests),requests);
 });

test('保存金额跟随工作稿，订单/ERP/客户金额只在成功提交时更新',()=>{
 const c=setup(),{code,data}=quote(c);assert.equal(c.oqSavedAmount(c.ORDERS[0]),null);
 c.v3QuickSave(data);assert.equal(c.oqSavedAmount(c.ORDERS[0]),100);assert.equal(c.ORDERS[0][10],'¥0');
 c.applyDraftSaved({...data,submissionRequestId:'ONE'});assert.equal(c.TODOS[0].completionReason,'已提交报价');
 const changed={...data,spaces:[{name:'客厅',products:[{name:'椅子',cat:'家具',qty:2,price:100,amt:200}]}]};
 c.v3QuickSave(changed);assert.equal(c.oqSavedAmount(c.ORDERS[0]),200);assert.equal(c.ORDERS[0][10],'¥100');assert.equal(c.ORDERS[0][18].erpRequests[0].contents.spaces[0].products[0].amt,100);
 c.fail=true;c.applyDraftSaved({...changed,submissionRequestId:'FAIL'});assert.equal(c.oqSavedAmount(c.ORDERS[0]),200);assert.equal(c.ORDERS[0][10],'¥100');assert.equal(c.ORDERS[0][18].erpRequests.length,1);
 c.fail=false;c.applyDraftSaved({...changed,submissionRequestId:'TWO'});assert.equal(c.ORDERS[0][10],'¥200');assert.equal(c.ORDERS[0][18].erpRequests.length,2);
 c.applyDraftSaved({...changed,submissionRequestId:'TWO'});assert.equal(c.V3.meta[code].quoteVersions.length,2);assert.equal(c.ORDERS[0][18].erpRequests.length,2);
});
test('提交仅完成同项目同商机同报价待办，保留其他与历史数据',()=>{
 const c=setup(),{code,data}=quote(c);c.TODOS.push({id:'WRONG-P',type:'报价待办',project:'OTHER',opp:'B',draft:code,status:'待处理'},{id:'WRONG-Q',type:'报价待办',project:'P',opp:'B',draft:'OTHER',status:'待处理'});
 c.applyDraftSaved(data);assert.equal(c.TODOS[0].status,'已处理');assert.equal(c.TODOS[1].status,'待处理');assert.equal(c.TODOS[2].status,'待处理');assert.equal(c.TODOS[0].approver,'PM');
 c.ORDERS[0][18].legacyQuoteArchive=true;assert.equal(c.oqSavedAmount(c.ORDERS[0]),null);
});

test('保存不回退商机阶段，重新提交以新订单金额重算20%，实际履行结果优先',()=>{
 const c=setup(),{code,data}=quote(c,100000),mg=fs.readFileSync(new URL('../src/compat/runtime/managementWorkflow.js',import.meta.url),'utf8');
 vm.runInContext(mg.slice(mg.indexOf('function mgOpportunityState('),mg.indexOf('function mgDesignState(')),c);
 const opp=c.oqOpp('B'),row=c.oqOrder(code);assert.equal(c.mgOpportunityState(opp),'报价中');c.applyDraftSaved(data);assert.equal(c.mgOpportunityState(opp),'待下定');
 row[13]='¥20000';assert.equal(c.mgOpportunityState(opp),'待下单');
 const changed={...data,spaces:[{name:'客厅',products:[{name:'家具',cat:'家具',qty:1,price:120000,amt:120000}]}]};
 c.v3QuickSave(changed);assert.equal(c.mgOpportunityState(opp),'待下单');assert.equal(c.oqSavedAmount(row),120000);assert.equal(row[10],'¥100000');
 c.applyDraftSaved(changed);assert.equal(c.mgOpportunityState(opp),'待下定');row[18].stockStartedAt='2026-10-28';assert.equal(c.mgOpportunityState(opp),'交付中');row[18].normalDeliveryCompletedAt='2026-10-29';assert.equal(c.mgOpportunityState(opp),'已完成');
});
test('设计交付生成失败时整次提交不残留报价、ERP或已完成待办',()=>{
 const c=setup(),{code,data}=quote(c);const base=c.oqFinalizePublished;c.oqFinalizePublished=code=>{base(code);throw Error('GDS交付请求未保存');};
 assert.equal(c.applyDraftSaved(data),false);assert.equal(c.V3.meta[code].submitted,undefined);assert.equal(c.V3.meta[code].quoteVersions,undefined);assert.equal(c.ORDERS[0][18].erpRequests,undefined);assert.equal(c.TODOS[0].status,'待处理');assert.equal(c.PROJECT_QUOTES.P.length,0);
});
test('提交完成后的待办标题不再要求重复确认或提交',()=>{
 const c=setup(),{data}=quote(c);c.applyDraftSaved(data);assert.equal(c.todoSubject(c.TODOS[0]),'报价已提交');
});
