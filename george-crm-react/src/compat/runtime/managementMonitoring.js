/* Read-only management summaries share the displayed business records. */
// Fees contribute once to money, independently of opportunity lifecycle stages.
function mmFeeOrders(projects,opportunities=null) {
 const seen=new Set();
 return ORDERS.filter(o=>{
  if(!projects.has(o[15])||!(o[2]==='费用订单'||o[18]?.kind==='fee')||opportunities&&!opportunities.has(o[15]+'|'+orderOppOf(o)))return false;
  const key=o[0]||o;if(seen.has(key))return false;seen.add(key);return true;
 });
}
function mmFeeTotals(orders) {
 return orders.reduce((total,o)=>{const amount=qNum(o[10]);total.amount+=amount;total.won+=amount;total.paid+=qNum(o[13]);return total;},{amount:0,won:0,paid:0});
}
function mmTotals(rows,fees=mmFeeOrders(new Set(rows.map(o=>o[4])),new Set(rows.map(o=>o[4]+'|'+o[0])))) {
 const totals=mmFeeTotals(fees);
 return rows.reduce((total,o)=>{total.amount+=qNum(o[13]);total.won+=qNum(o[15]);total.paid+=qNum(o[16]);return total;},totals);
}
function mmOpportunityMoney(opp) {return mmTotals(opp&&!opp[20]?.preliminaryTask?[opp]:[]);}
function mmProjectMoney(project) {
 const money=mmScope([project],undefined,true);
 return {amount:mmProjectAmount(project),won:money.won,paid:money.paid};
}
function mmScope(projects=PROJECTS,opportunities=mgOppRows(),includeProjectFees=false) {
 const ids=new Set(projects.map(p=>p[0])),rows=opportunities.filter(o=>ids.has(o[4])),accepted=rows.filter(o=>!o[20]?.preliminaryTask),tasks=visibleTodos().filter(t=>ids.has(t.project)&&t.status==='待处理'&&crmTodoEnabled(t));
 const states=Object.fromEntries(MG135.opportunityStates.map(s=>[s,rows.filter(o=>mgOpportunityState(o)===s).length]));
 const quotes=tasks.filter(t=>t.type==='报价待办'&&accepted.some(o=>o[0]===t.opp&&!['已完成','已输单'].includes(mgOpportunityState(o))));
 return {projects,rows,accepted,tasks,states,quotes,overdue:rows.filter(o=>ptOpportunityTiming(o).overdue).length,...mmTotals(accepted,includeProjectFees?mmFeeOrders(ids):undefined)};
}
function mmCard(title,value,sub='',attention=false) {
 const key=({'暂无设计':'noneDesign','洗图报价':'procurementDesign','设计服务':'independentDesign','待拉商机':'allocation','停留超10天':'overdue','项目金额':'projectAmount','待接收':'pending','洽谈中':'negotiating','报价中':'quoting','已完成':'completed','项目数':'all','项目状态':'all','商机数':'all','待设计':'design','待设计确认':'review','待拉商机项目':'allocation','待报价商机':'quotation','待处理待办':'tasks','停留超过 10 天':'overdue','商机金额':'amount','成单金额':'won','待接受':'pending','报价推进中':'quoteStages','待下定':'deposit','待下单':'order','交付中':'delivery'})[title]||'all';
 const paths={all:'M4 7h16v13H4z M8 7V4h8v3',design:'m4 20 4-1 12-12-5-5L3 14l1 6 M13 4l5 5',review:'M8 4H5v17h14V4h-3 M8 2h8v5H8z m0 11 3 3 5-5',allocation:'M12 3v6 M5 20v-7h14v7 M3 20h4 M17 20h4',quotation:'M6 3h9l4 4v14H6z M15 3v5h4 M9 12h7 M9 16h5',tasks:'M4 5h16v16H4z m3 7 2 2 4-5 M15 11h3 M15 16h3',overdue:'M12 8v5l3 2 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',amount:'M4 5h16v15H4z M4 8h16 M15 12h5v5h-5z',won:'M8 3h8v7a4 4 0 0 1-8 0z M8 5H4v3a4 4 0 0 0 4 4 M16 5h4v3a4 4 0 0 1-4 4 M12 14v5 M8 21h8',pending:'M3 8h18v13H3z m0 0 4-5h10l4 5 M3 13h5l2 3h4l2-3h5',quoteStages:'M3 4h18v13H9l-5 4v-4H3z M7 8h10 M7 12h7',deposit:'M3 6h18v14H3z M3 10h18 M7 15h4',order:'M3 3h3l3 13h10l2-9H7 M10 20h.01 M18 20h.01',delivery:'M3 5h11v13H3z M14 9h4l3 4v5h-7 M6 18v3 M18 18v3'};
 const svg=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
 return `<button type="button" class="mm-card ${attention?'mm-attention':''}" data-act="mmMetric" data-mm-key="${key}" aria-label="${esc(title)} ${esc(String(value))}" aria-pressed="false"><span class="mm-card-heading" data-mm-title>${esc(title)}</span><strong>${esc(String(value))}</strong>${sub?`<small>${esc(sub)}</small>`:''}<span class="mm-card-icon">${svg(paths[key]||paths.all)}</span></button>`;
}
function mmProjectAmount(project) {
 const raw=String(project[12]||'').trim();
 return (/^[¥￥$]?\s*[\d,]+(?:\.\d+)?(?:\s*(?:CNY|RMB|USD))?$/.test(raw)?qNum(raw):0)+mmFeeTotals(mmFeeOrders(new Set([project[0]]))).amount;
}
function mmDesignType(project) {return oqDesignType(PROJECT_EXTRA[project[0]]?.formData?.designType);}
function mmProjectCards(projects=PROJECTS,shown=projects) {
 const d=mmScope(projects),money=mmScope(shown,undefined,true),pending=mmScopeTasks('projects',shown).filter(t=>t.status==='待处理').length;
 const count=type=>projects.filter(p=>mmDesignType(p)===type).length;
 const allocation=new Set(d.tasks.filter(t=>t.type==='项目待办').map(t=>t.project)).size;
 const overdue=projects.filter(p=>mgOppRows(p[0]).some(o=>ptOpportunityTiming(o).overdue)).length;
 return `<div class="mm-process-cards">${mmCard('暂无设计',count('暂无'))}${mmCard('洗图报价',count('采购方案设计'))}${mmCard('设计服务',count('独立设计服务'))}${mmCard('待处理待办',pending)}${mmCard('待拉商机',allocation)}${mmCard('停留超10天',overdue,'',overdue>0)}</div><div class="mm-money-cards">${mmCard('项目金额',qMoney(shown.reduce((total,p)=>total+mmProjectAmount(p),0)),`当前筛选 ${shown.length} 个项目`)}${mmCard('成单金额',qMoney(money.won),`实收 ${qMoney(money.paid)}`)}</div>`;
}
function mmOpportunityCards(opportunities=mgOppRows(),shown=opportunities) {
 const d=mmScope(PROJECTS,opportunities),money=mmScope(PROJECTS,shown),pending=mmScopeTasks('opps',shown).filter(t=>t.status==='待处理').length;
 return `<div class="mm-process-cards">${mmCard('待接收',d.states['待接受'])}${mmCard('洽谈中',d.states['洽谈中'])}${mmCard('报价中',d.states['报价中'])}${mmCard('待下定',d.states['待下定'])}${mmCard('待下单',d.states['待下单'])}${mmCard('交付中',d.states['交付中'])}${mmCard('已完成',d.states['已完成'])}${mmCard('待处理待办',pending)}${mmCard('停留超10天',d.overdue,'',d.overdue>0)}</div><div class="mm-money-cards">${mmCard('商机金额',qMoney(money.amount),`当前筛选 ${shown.length} 条商机`)}${mmCard('成单金额',qMoney(money.won),`实收 ${qMoney(money.paid)}`)}</div>`;
}
function mmProgressSummary(matrix) {
 const d=mmScope(PROJECTS.filter(p=>p[0]===matrix.project)),addons=d.accepted.filter(o=>o[20]?.isAddon).length;
 return `<div class="mm-cards mm-progress-cards">${mmCard('项目状态',matrix.status)}${mmCard('商机数',matrix.total,`加单 ${addons} · 设计 ${d.accepted.filter(o=>o[20]?.kind==='design').length}`)}${mmCard('待处理待办',d.tasks.length,`报价 ${d.quotes.length} · 设计确认 ${d.tasks.filter(t=>t.type==='设计确认待办').length}`)}${mmCard('停留超过 10 天',d.overdue,'',d.overdue>0)}${mmCard('商机金额',qMoney(d.amount))}${mmCard('成单金额',qMoney(d.won),`实收 ${qMoney(d.paid)}`)}</div>`;
}
function mmRefreshCards(section,kind,value='全部') {
 const cards=section?.querySelector('[data-mm-cards]');if(!cards)return;
 mmApplyManagementFilter(section,kind,value);
}
if(typeof pageProjects==='function'){
 const base=pageProjects;pageProjects=function(...args){const box=document.createElement('div');box.innerHTML=base(...args);box.querySelector('.sky-stats')?.remove();box.querySelector('.sky-page-heading')?.insertAdjacentHTML('afterend',`<div class="mm-dashboard" data-mm-cards="projects">${mmProjectCards()}</div>`);mmInstallTaskEntrances(box);mmApplyManagementFilter(box,'projects');return box.innerHTML;};RENDER.projects=pageProjects;
}
if(typeof pageOpps==='function'){
 const base=pageOpps;pageOpps=function(...args){const box=document.createElement('div');box.innerHTML=`<header class="sky-page-heading"><h1>商机管理中心</h1></header><div class="mm-dashboard" data-mm-cards="opps">${mmOpportunityCards()}</div>${base(...args)}`;mmApplyManagementFilter(box,'opps');return box.innerHTML;};RENDER.opps=pageOpps;
}
if(typeof pageDetail==='function'){
 const base=pageDetail;pageDetail=function(...args){const box=document.createElement('div');box.innerHTML=base(...args);box.querySelector('.proj-bar')?.insertAdjacentHTML('beforeend',`<button class="btn default" data-act="ptProjectProgress" data-proj="${esc(archiveProject)}">商机进度</button><button class="btn default" data-act="mmViewTasks" data-proj="${esc(archiveProject)}">查看待办</button>`);box.querySelectorAll('[data-act="oqDesignRequest"]').forEach(b=>b.className='btn default');mmHideDesignEntrances(box);return box.innerHTML;};RENDER.detail=pageDetail;
}
document.addEventListener('change',event=>{
 if(event.target.matches?.('[data-customer-project-filter]')){MM164.filters.projects=null;mmRefreshCards(event.target.closest('.page'),'projects',event.target.value);}
 if(event.target.matches?.('[data-mg-opp-filter]')){MM164.filters.opps=null;mmRefreshCards(event.target.closest('.page'),'opps',event.target.value);}
});

/* Completion is distinct from publication and customer confirmation. */
function mmQuotationResultEvents(before,after,events) {
 const result=events.slice();
 for(const task of Object.values(after.todos||{})){
  const old=before.todos?.[task.id];if(task.type!=='报价待办'||!old||old.status!=='待处理'||task.status!=='已处理'||task.completionReason!=='已确认报价')continue;
  const project=PROJECTS.find(p=>p[0]===task.project),order=ORDERS.find(o=>o[0]===task.order&&o[15]===task.project&&orderOppOf(o)===task.opp),quote=order?.[18]?.quoteCode;
  if(!project?.[9]||project[9]==='-'||!quote||!task.quoteRevision)continue;
  for(let i=result.length-1;i>=0;i--)if(result[i].task===task.id&&result[i].event==='todo-result'&&result[i].recipient===project[9])result.splice(i,1);
  result.push({event:'quote-erp-requested',role:'pm',recipient:project[9],initiator:task.approver||v17Owner(),type:'报价待办',target:'todo',task:task.id,project:task.project,projectName:project[1],customer:task.customer,opp:task.opp,quote,revision:task.quoteRevision,category:task.designOpportunity?'设计服务':task.cat||task.smDept||'',status:'已处理',title:'报价待办已完成',body:'商机负责人已确认报价，报价待办已完成。已保存本版本 ERP 传输请求；请跟进实际回执、收款与履行。',localOnly:true});
 }
 return result;
}
function mmRejectionEvents(before,after,events) {
 const result=events.slice();
 for(const task of Object.values(after.todos||{})){
  const old=before.todos?.[task.id];if(!old||old.status===task.status||task.status!=='已驳回'||!crmTodoEnabled(task)||!task.initiator||task.initiator==='-')continue;
  const project=PROJECTS.find(p=>p[0]===task.project),recipient=task.initiator;
  for(let i=result.length-1;i>=0;i--)if(result[i].task===task.id&&result[i].event==='todo-result'&&result[i].recipient===recipient)result.splice(i,1);
  result.push({event:'todo-result',role:task.type==='设计确认待办'?'designer':recipient===project?.[9]?'pm':'sales',recipient,initiator:task.approver||v17Owner(),type:task.type,target:'todo',task:task.id,project:task.project,projectName:project?.[1]||'',customer:task.customer,category:task.designOpportunity?'设计服务':task.feeType||task.allocation?.cat||task.cat||task.smDept||'',status:'已驳回',title:(typeof v18Name==='function'?v18Name(task.type):task.type)+'已驳回',rejectReason:typeof v82TodoRejectionReason==='function'?v82TodoRejectionReason(task):String(task.rejectReason||''),body:'请查看驳回原因，编辑这条原待办并重新提交。',localOnly:true});
 }
 return result;
}
function mmRecipientRole(recipient,task,fallback) {
 if(recipient===PROJECTS.find(p=>p[0]===task.project)?.[9])return 'pm';
 if(typeof dw132Designers==='function'&&dw132Designers().includes(recipient))return 'designer';
 if(OPPS.some(o=>o[7]===recipient))return 'sm';
 return fallback;
}
if(typeof v72NotificationEvents==='function'){
 const base=v72NotificationEvents;v72NotificationEvents=function(before,after){return mmRejectionEvents(before,after,mmQuotationResultEvents(before,after,base(before,after))).map(message=>{
  const task=after.todos?.[message.task];if(!task)return message;
  const project=PROJECTS.find(p=>p[0]===task.project),designer=task.designOpportunity||task.type==='设计待办';
  const role=message.event==='todo-result'&&task.type==='设计确认待办'?'designer':message.event==='todo-result'&&task.type==='设计待办'?'pm':message.recipient===project?.[9]?'pm':designer&&message.recipient===task.owner?'designer':message.role;
  return {...message,role:mmRecipientRole(message.recipient,task,role),projectName:project?.[1]||message.projectName};
 });};
}
if(typeof v72Go==='function'){
 const base=v72Go;v72Go=function(id){const m=V72.messages.find(m=>m.id===id);if(m?.event!=='quote-erp-requested')return base(id);const task=TODOS.find(t=>t.id===m.task&&t.type==='报价待办'&&t.project===m.project&&t.opp===m.opp);if(!task)return toast('对应报价待办不存在');if(!v21FlowAllowed(task)&&!v21CanOperate(task))return toast('当前账号无权查看这条报价待办');return v75SearchTask(task);};
}
if(typeof v73TextCard==='function'){
 const base=v73TextCard;v73TextCard=m=>{const card=base(m);return m.event==='quote-erp-requested'?{...card,btntxt:'查看报价待办'}:card;};
}
const mmStyle=document.createElement('style');mmStyle.textContent=`.mm-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 20px}.mm-card{display:flex;flex-direction:column;gap:9px;background:white;border:1px solid #dbe6ef;border-radius:9px;padding:16px 18px;min-width:0}.mm-card>span{font-size:12px;color:#6b8496}.mm-card>strong{font-size:23px;color:#235374;font-weight:600;overflow-wrap:anywhere}.mm-card>small{font-size:11px;line-height:1.6;color:#71899b}.mm-attention{background:#fffaf2;border-color:#edd9b7}.mm-attention>strong{color:#a66a20}.mm-progress-cards{grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:12px}.mm-progress-cards .mm-card{padding:12px 16px}.mm-progress-cards .mm-card>strong{font-size:20px}.pt-project-state{display:inline-block;white-space:nowrap}.ops-col [data-act="ptProjectProgress"]{white-space:nowrap}@media(max-width:900px){.mm-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.mm-progress-cards{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:600px){.mm-progress-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.mm-card{padding:12px}.mm-card>strong{font-size:19px}}`;document.head.appendChild(mmStyle);

mmStyle.textContent+=`.mm-notification-guide{margin-bottom:16px;background:white;border:1px solid #dbe6ef;border-radius:8px}.mm-notification-guide>summary{padding:12px 16px;color:#31566d;font-weight:600;cursor:pointer}.mm-notification-table{overflow:auto}.mm-notification-table table{width:100%;border-collapse:collapse;font-size:12px;line-height:1.7}.mm-notification-table th,.mm-notification-table td{padding:12px 16px;border-top:1px solid #e3ecf2;text-align:left;vertical-align:top}.mm-notification-table th{white-space:nowrap}`;

mmStyle.textContent+=`.page:has([data-mm-cards]) .table-box{min-height:260px;flex-shrink:0}.mm-cards:not(.mm-progress-cards) .mm-card{padding:14px 16px;gap:7px}.mm-card>strong{line-height:1.2}`;

const MM164={filters:{projects:null,opps:null},queries:{projects:'',opps:''}};
function mmTaskVisible(task) {return crmTodoEnabled(task)&&(typeof v21FlowAllowed==='function'?v21FlowAllowed(task)||v21CanOperate(task):v21CanOperate(task));}
function mmRelatedTasks(project,oppId='') {
 if(oppId.startsWith('pending:')){const source=TODOS.find(t=>t.id===oppId.slice(8)&&t.project===project);const accepted=OPPS.find(o=>o[4]===project&&(o[0]===source?.createdOppId||o[20]?.approvalTodo===source?.id));if(accepted)oppId=accepted[0];}
 const opp=oppId?mgOppRows(project).find(o=>o[0]===oppId):null;
 if(oppId&&!opp)return [];
 return visibleTodos().filter(t=>t.project===project&&mmTaskVisible(t)&&(!oppId||t.id===opp[20]?.preliminaryTask||t.opp===oppId||t.createdOppId===oppId||t.id===opp[20]?.approvalTodo||t.order&&ORDERS.some(o=>o[0]===t.order&&o[15]===project&&orderOppOf(o)===oppId)));
}
function mmRefreshTaskContext(){
 const context=V18.context;if(!context?.relation)return;
 context.ids=[...new Set(context.relation.records.flatMap(row=>mmRelatedTasks(row.project,row.opp||'').map(t=>t.id)))];
 if(context.relation.records.length===1){const row=context.relation.records[0];if(row.opp?.startsWith('pending:')){const task=TODOS.find(t=>t.id===row.opp.slice(8)&&t.project===row.project);if(task?.createdOppId&&todoSearch===task.id)todoSearch=task.createdOppId;}}
}
function mmScopeTasks(kind,rows) {
 return [...new Map(rows.flatMap(row=>kind==='projects'?mmRelatedTasks(row[0]):mmRelatedTasks(row[4],row[0])).map(t=>[t.id,t])).values()];
}
function mmScopeQuery(kind,rows) {
 // Bulk scopes stay in the readable context banner, not in a concatenated query.
 if(rows.length!==1)return '';
 const row=rows[0];return kind==='projects'?row[0]:/^BU/i.test(row[0])?row[0]:row[20]?.preliminaryTask||'';
}
function mmTaskOpportunityIds(task) {
 return [...new Set([task.opp,task.createdOppId,...OPPS.filter(o=>o[4]===task.project&&o[20]?.approvalTodo===task.id).map(o=>o[0]),...ORDERS.filter(o=>o[15]===task.project&&o[0]===task.order).map(orderOppOf)].filter(Boolean))];
}
function mmIdentifierSearch(task,query) {
 const terms=String(query||'').trim().split(/\s*\|\s*/).filter(Boolean);
 if(!terms.length)return null;
 const known=new Set([...PROJECTS.map(p=>p[0]),...OPPS.map(o=>o[0]),...visibleTodos().map(t=>t.id)].map(id=>String(id).toLowerCase()));
 if(!terms.every(term=>known.has(term.toLowerCase())||/^BU[\w-]+$/i.test(term)))return null;
 const ids=[task.project,task.id,...mmTaskOpportunityIds(task)].filter(Boolean).map(id=>String(id).toLowerCase());
 return terms.some(term=>ids.includes(term.toLowerCase()));
}
if(typeof todoMatchesSearch==='function'){
 const base=todoMatchesSearch;todoMatchesSearch=function(task,query){const exact=mmIdentifierSearch(task,query);return exact===null?base(task,query):exact;};
}
function mmOpenTasks(tasks,label,source='项目管理',query='',status='全部',relation=null) {
 const rows=[...new Map(tasks.filter(mmTaskVisible).map(t=>[t.id,t])).values()];
 ptCloseProjectProgress();if(typeof v21View==='function')v21View();
 V21.stay='all';V21.view=v21Manager()?'team':v17Owner();
 todoQuick='';todoSearch=query;todoProject='';todoFilter='全部';todoStatus=status;WK.sort='recent';
 V18.context={ids:rows.map(t=>t.id),source,label,scope:v21ScopeName(),...(relation?{relation}: {})};
 if(typeof window!=='undefined'&&window.GeorgeRuntime?.todoUpdate)return window.GeorgeRuntime.todoUpdate({filter:'全部',status,query,keepContext:true,sort:'recent',quick:'',stay:'all'});
 markPagesDirty();return openPage('todos');
}
function mmHideDesignEntrances(box) {
 box.querySelectorAll('[data-act="mgViewDesign"]').forEach(b=>b.remove());
 box.querySelectorAll('[data-act="oqDesignRequest"]').forEach(b=>{if(oqDesignType(PROJECT_EXTRA[b.dataset.proj||archiveProject]?.formData?.designType)!=='暂无')b.remove();});
}
function mmInstallTaskEntrances(box) {
 mmHideDesignEntrances(box);
 box.querySelectorAll('tbody tr[data-proj]').forEach(row=>{if(!row.querySelector('[data-act="mmViewTasks"]'))row.querySelector('.ops')?.insertAdjacentHTML('beforeend',`<button type="button" class="link" data-act="mmViewTasks" data-proj="${esc(row.dataset.proj)}">查看待办</button>`);});
}
if(typeof mgOppActions==='function'){
 const base=mgOppActions;mgOppActions=function(opp,...args){const actions=base(opp,...args);return [...actions,{t:'查看待办',act:'mmViewTasks',extra:`data-proj="${esc(opp[4])}" data-opp="${esc(opp[0])}"`}];};
}
function mmProgressMatches(opp,key) {
 if(!key||key==='all')return true;
 if(key==='overdue')return ptOpportunityTiming(opp).overdue;
 if(key==='amount')return !opp[20]?.preliminaryTask&&mmOpportunityMoney(opp).amount>0;
 if(key==='won')return !opp[20]?.preliminaryTask&&mmOpportunityMoney(opp).won>0;
 if(key==='tasks')return mmRelatedTasks(opp[4],opp[0]).some(t=>t.status==='待处理');
 return ({pending:['待接受'],negotiating:['洽谈中'],quoting:['报价中'],completed:['已完成'],quoteStages:['洽谈中','报价中'],deposit:['待下定'],order:['待下单'],delivery:['交付中']})[key]?.includes(mgOpportunityState(opp))||false;
}
function mmMarkProgressCards(body) {
 body.querySelectorAll('.mm-card').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mmKey===PT137.view.metric)));
}
function mmProjectMatches(project,key) {
 if(!key||key==='all'||key==='tasks')return true;
 if(['noneDesign','procurementDesign','independentDesign'].includes(key))return mmDesignType(project)===({noneDesign:'暂无',procurementDesign:'采购方案设计',independentDesign:'独立设计服务'})[key];
 if(key==='projectAmount')return mmProjectAmount(project)>0;
 if(['design','review','quotation'].includes(key))return mmRelatedTasks(project[0]).some(t=>t.status==='待处理'&&t.type===({design:'设计待办',review:'设计确认待办',quotation:'报价待办'})[key]);
 if(key==='allocation')return mmRelatedTasks(project[0]).some(t=>t.type==='项目待办'&&t.status==='待处理');
 return mgOppRows(project[0]).some(o=>mmProgressMatches(o,key));
}
function mmNextCardSelection(current,key) {return current?.key===key?null:key;}
function mmManagementMatches(row,kind,query) {
 if(!query)return true;
 const orders=kind==='opps'?ORDERS.filter(o=>o[15]===row[4]&&orderOppOf(o)===row[0]).map(o=>o[0]):[];
 const customer=typeof CUSTOMERS==='undefined'?[]:CUSTOMERS.filter(c=>c[0]===row[kind==='projects'?7:6]||c[1]===row[kind==='projects'?7:6]).flat();
 return [...row,...orders,...customer].join(' ').toLowerCase().includes(query.toLowerCase());
}
function mmApplyManagementFilter(section,kind,value) {
 if(!section?.querySelector('[data-mm-cards]'))return;
 const selector=kind==='projects'?'[data-customer-project-filter]':'[data-mg-opp-filter]',select=section.querySelector(selector),state=value||select?.value||'全部',filter=MM164.filters[kind],scope=new Set(filter?.projects||PROJECTS.map(p=>p[0]));
 const baseRows=(kind==='projects'?PROJECTS.filter(p=>scope.has(p[0])&&(state==='全部'||mgProjectState(p[0])===state)):mgOppRows().filter(o=>scope.has(o[4])&&(state==='全部'||mgOpportunityState(o)===state))).filter(row=>mmManagementMatches(row,kind,MM164.queries[kind]));
 const taskIds=filter?.key==='tasks'&&filter.records?new Set(filter.records):null;
 const rows=baseRows.filter(row=>(!taskIds||taskIds.has(row[0]))&&(kind==='projects'?mmProjectMatches(row,filter?.key):filter?.key==='tasks'||mmProgressMatches(row,filter?.key))); 
 const ids=new Set(rows.map(r=>r[0]));section.querySelectorAll(kind==='projects'?'tbody tr[data-proj]':'tbody tr[data-opp]').forEach(tr=>tr.hidden=!ids.has(kind==='projects'?tr.dataset.proj:tr.dataset.opp));
 const cards=section.querySelector('[data-mm-cards]');cards.innerHTML=kind==='projects'?mmProjectCards(baseRows,rows):mmOpportunityCards(baseRows,rows);
 cards.querySelectorAll('.mm-card').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mmKey===filter?.key)));
 section.querySelector('.mm-list-context')?.remove();if(filter?.label)cards.insertAdjacentHTML('afterend',`<div class="mm-list-context"><span>${esc(filter.label)}</span><button type="button" class="link" data-act="mmClearManagement" data-kind="${kind}">清除卡片筛选</button></div>`);
 const count=section.querySelector('[data-customer-project-count],.foot strong');if(count)count.textContent=`共 ${rows.length} 条记录`;
 const search=section.querySelector('input.search');if(search&&search.value!==MM164.queries[kind])search.value=MM164.queries[kind];
 return rows;
}
function mmMetricAction(button) {
 const key=button.dataset.mmKey;
 if(button.closest('#ptProgressMask')){
  PT137.view.metric=PT137.view.metric===key?'':key;PT137.view.overdue=false;ptRefreshProjectProgress();
  document.querySelector(`#ptProgressMask [data-mm-key="${key}"]`)?.focus({preventScroll:true});return;
 }
 const section=button.closest('.page'),kind=button.closest('[data-mm-cards]')?.dataset.mmCards;if(!kind)return;
 if(mmNextCardSelection(MM164.filters[kind],key)===null){MM164.filters[kind]=null;if(V18.context?.cardKind===kind&&V18.context?.cardKey===key)V18.context=null;return mmApplyManagementFilter(section,kind);}
 if(key==='all'){MM164.filters[kind]={key};const select=section.querySelector(kind==='projects'?'[data-customer-project-filter]':'[data-mg-opp-filter]');if(select)select.value='全部';return mmApplyManagementFilter(section,kind,'全部');}
 const displayed=mmApplyManagementFilter(section,kind);
 const state=section.querySelector('[data-customer-project-filter]')?.value||'全部',projects=PROJECTS.filter(p=>(MM164.filters[kind]?.projects||PROJECTS.map(p=>p[0])).includes(p[0])&&(kind!=='projects'||state==='全部'||mgProjectState(p[0])===state)),ids=projects.map(p=>p[0]);
 if(key==='tasks'){
  const rows=displayed||[],query=mmScopeQuery(kind,rows),tasks=mmScopeTasks(kind,rows);
  MM164.filters[kind]={key,projects:ids,records:rows.map(row=>row[0]),label:'待处理待办'};mmApplyManagementFilter(section,kind);const result=mmOpenTasks(tasks,kind==='projects'?'项目相关待办':'商机相关待办',kind==='projects'?'项目管理卡片':'商机管理卡片',query,'待处理',{kind,records:rows.map(row=>({project:kind==='projects'?row[0]:row[4],opp:kind==='opps'?row[0]:''}))});V18.context.cardKind=kind;V18.context.cardKey=key;return result;
 }
 MM164.filters[kind]={key,projects:ids,label:button.querySelector('[data-mm-title]').textContent};return mmApplyManagementFilter(section,kind);
}
if(typeof handleAct==='function'){
 const base=handleAct;handleAct=function(button){const action=button?.dataset?.act;
  if(action==='mmMetric')return mmMetricAction(button);
  if(['toast:已查询','toast:已重置'].includes(action)){
   const section=button.closest('.page'),kind=section?.querySelector('[data-mm-cards]')?.dataset.mmCards;
   if(kind){MM164.queries[kind]=action==='toast:已查询'?(section.querySelector('input.search')?.value||'').trim():'';if(action==='toast:已重置'){MM164.filters[kind]=null;const select=section.querySelector(kind==='projects'?'[data-customer-project-filter]':'[data-mg-opp-filter]');if(select)select.value='全部';}return mmApplyManagementFilter(section,kind);}
  }
  if(action==='mmClearManagement'){MM164.filters[button.dataset.kind]=null;return mmApplyManagementFilter(button.closest('.page'),button.dataset.kind);}
  if(action==='mmViewTasks'){const p=PROJECTS.find(p=>p[0]===button.dataset.proj),opp=button.dataset.opp?mgOppRows(button.dataset.proj).find(o=>o[0]===button.dataset.opp):null;if(!p||button.dataset.opp&&!opp)return toast('关联记录已变化，请重新打开');return mmOpenTasks(mmRelatedTasks(p[0],opp?.[0]||''),opp?.[1]||p[1],opp?'商机管理':'项目管理',mmScopeQuery(opp?'opps':'projects',[opp||p]),'全部',{kind:opp?'opps':'projects',records:[{project:p[0],opp:opp?.[0]||''}]});}
  return base(button);
 };
}
document.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches?.('.page:has([data-mm-cards]) input.search')){event.preventDefault();event.target.closest('.page').querySelector('[data-act="toast:已查询"]')?.click();}});
if(typeof v21Rows==='function'){
 const base=v21Rows;v21Rows=function(...args){if(['项目管理','商机管理','项目管理卡片','商机管理卡片'].includes(V18.context?.source)){mmRefreshTaskContext();const ids=new Set(V18.context.ids);return visibleTodos().filter(t=>ids.has(t.id)&&mmTaskVisible(t));}return base(...args);};
}
mmStyle.textContent+=`.mm-card{cursor:pointer;text-align:left;font:inherit}.mm-card:hover{border-color:#82b9d8}.mm-card:focus-visible{outline:2px solid #3b94c5;outline-offset:2px}.mm-card[aria-pressed=true]{background:#edf7fd;border-color:#268bbe}.mm-list-context{display:flex;align-items:center;gap:12px;font-size:12px;color:#54809a;margin:-5px 0 14px}.mm-list-context .link{padding:0}`;
mmStyle.textContent+=`.mm-cards:not(.mm-progress-cards){grid-template-columns:repeat(3,minmax(0,1fr))}.mm-card{position:relative;overflow:hidden;transition:border-color .15s,background .15s}.mm-card-heading{display:block;width:auto;padding-right:48px}.mm-card>strong{padding-right:42px}.mm-card-icon,.mm-progress-cards .mm-card-icon{display:flex;align-items:center;justify-content:center;position:absolute;right:22px;top:18px;width:36px;height:36px;border-radius:11px;background:#f4f8fc;color:#8dabc1}.mm-card-icon svg{width:20px;height:20px}.mm-card:hover{border-color:#a7cde4}.mm-card[aria-pressed=true]{background:#f0f8fd;border-color:#add6f0;box-shadow:none}.mm-card[aria-pressed=true]:before{content:'';position:absolute;top:0;left:20px;right:20px;height:2px;background:#48a6d8}.mm-card[aria-pressed=true] .mm-card-icon{background:#f4f8fc;color:#8dabc1}.mm-card[aria-pressed=true]>strong{color:#235374}.mm-card[aria-pressed=true] [data-mm-title]{color:#6b8496}@media(max-width:900px){.mm-cards:not(.mm-progress-cards){grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.mm-cards:not(.mm-progress-cards){grid-template-columns:1fr}.mm-card-icon,.mm-progress-cards .mm-card-icon{right:16px;width:30px;height:30px}}`;

mmStyle.textContent+=`.mm-dashboard{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:16px;margin-bottom:16px;flex-shrink:0}.mm-process-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.mm-dashboard[data-mm-cards=opps] .mm-process-cards{grid-template-columns:repeat(5,minmax(0,1fr))}.mm-money-cards{display:grid;grid-template-columns:1fr;gap:8px;border-left:1px solid #dce7ef;padding-left:16px}.mm-dashboard .mm-card{padding:10px 12px;gap:5px;border-radius:8px;min-height:68px}.mm-dashboard .mm-card-heading{font-size:11px;padding-right:30px}.mm-dashboard .mm-card>strong{font-size:22px;line-height:1.1;padding-right:28px}.mm-dashboard .mm-card>small{font-size:10px;line-height:1.4}.mm-dashboard .mm-card-icon{right:10px;top:11px;width:26px;height:26px;border-radius:8px}.mm-dashboard .mm-card-icon svg{width:16px;height:16px}.mm-money-cards .mm-card{background:#edf5fa;border-color:#d4e5f0;padding:10px 14px}.mm-money-cards .mm-card>strong{font-size:26px;font-variant-numeric:tabular-nums}.mm-list-context{margin:0 0 12px}.page:has(.mm-dashboard){overflow-y:auto}.page:has(.mm-dashboard) .sky-page-heading{margin-bottom:12px}.page:has(.mm-dashboard) .sky-page-heading p{display:none}.page:has(.mm-dashboard) .table-box{flex:1 0 320px;min-height:320px;max-height:none}.page:has(.mm-dashboard) .foot{flex-shrink:0}@media(max-width:1100px){.mm-dashboard{grid-template-columns:minmax(0,1fr) 240px}.mm-dashboard[data-mm-cards=opps] .mm-process-cards{grid-template-columns:repeat(5,minmax(0,1fr))}.mm-money-cards .mm-card>strong{font-size:23px}}@media(max-width:800px){.mm-dashboard{grid-template-columns:1fr}.mm-money-cards{grid-template-columns:repeat(2,minmax(0,1fr));border-left:0;border-top:1px solid #dce7ef;padding:10px 0 0}.mm-dashboard[data-mm-cards=opps] .mm-process-cards{grid-template-columns:repeat(5,minmax(0,1fr))}}@media(max-width:520px){.mm-process-cards,.mm-dashboard[data-mm-cards=opps] .mm-process-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.mm-money-cards .mm-card>strong{font-size:20px}.mm-dashboard .mm-card-heading{padding-right:20px}.mm-dashboard .mm-card-icon{width:22px;height:22px}}`;

mmStyle.textContent+=`.page:has(.mm-dashboard) .sky-page-heading{display:none}.v24-home>.v24-heading .v27-heading-copy{display:none}.v24-home>.v24-heading{justify-content:flex-end;margin-bottom:12px;min-height:0;padding:0}.v24-home>.v24-heading .v24-heading-actions{margin-left:auto}`;
