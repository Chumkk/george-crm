/* Department quotation scope is separate from each product's real category. */
let DB_CLIENT_RENDER=false;
function dbDepartment(opp){return !!opp&&opp[20]?.kind!=='design'&&(['Sourcing','SinoChina'].includes(opp[3])||opp[20]?.quoteBusinessKind==='department');}
// The prototype personnel directory is illustrative; real department IDs must
// come from the organization service, never be inferred from a department name.
if(!CATS.includes('SinoChina'))CATS.push('SinoChina');
if(!V3_CATS.includes('SinoChina'))V3_CATS.push('SinoChina');
if(!V68_SMS.some(p=>p.cat==='SinoChina')){const person={name:'SinoChina 报价负责人',cat:'SinoChina',regions:['欧洲/俄罗斯/中亚'],leader:'SinoChina 主管'};V68_SMS.push(person);SM_DEPT[person.name]=person.cat;}
const dbValidateBase=oqValidateInput;
oqValidateInput=function(input){const result=dbValidateBase(input);if(dbDepartment(result.opp)){result.data.quoteBusiness={kind:'department',name:result.opp[3],customerName:result.opp[20]?.customerQuoteName||dbFallbackName(result.data),departmentId:result.opp[20]?.departmentId||''};result.data.tpl=input.tpl||result.data.tpl;result.data.categoryManagers={[result.opp[3]]:result.opp[7]};}return result;};
function dbFallbackName(data){const cats=[...new Set((data?.spaces||[]).flatMap(s=>(s.products||[]).map(p=>p.cat)).filter(c=>c&&!['Sourcing','SinoChina'].includes(c)))];return cats.length?cats.join('与')+'采购方案':'产品采购方案';}
function dbCustomerName(group,project){const submitted=Object.values(V3.meta).find(m=>m.project===project&&m.submitted&&m.active!==false&&!m.needsSpaceUpdate&&m.categories?.includes(group))?.submitted;return submitted?.quoteBusiness?.customerName||dbFallbackName(submitted);}
const dbSkyCatBase=skyCat;
skyCat=function(value){if(!['Sourcing','SinoChina'].includes(value))return dbSkyCatBase(value);const internalBoard=!DB_CLIENT_RENDER&&typeof page!=='undefined'&&(typeof pageKind==='function'?pageKind(page)==='board':page==='board')&&!V3.client,project=internalBoard?archiveProject:SKY.project||archiveProject,name=dbCustomerName(value,project);return internalBoard?name+' · '+value:name;};
const dbRebuildBase=v3RebuildDraftQuotes;
v3RebuildDraftQuotes=function(code){
 const opp=oqQuoteOpp(code);if(!dbDepartment(opp))return dbRebuildBase(code);
 const m=V3.meta[code],d=m.submitted;if(!d)return;
 const list=projectQuoteRows(m.project);for(const q of list)q.products=q.products.filter(p=>p[6]?.draftCode!==code);
 for(const s of d.spaces||[]){let q=list.find(q=>q.space===s.name);if(!q){q={space:s.name,floor:'-',dept:'',manager:'',name:s.name+'方案',products:[],amount:0,confirmedCats:[],coverage:0,missing:[]};list.push(q);}
  for(const p of s.products||[])q.products.push([p.name,opp[3],qMoney(p.amt),p.sku,p.qty,qMoney(p.price),{draftCode:code,revision:m.revision,lineId:p.lineId,productCategory:p.cat,publicQuote:v3Copy(p.publicQuote||{name:p.name,category:p.cat,quantity:p.qty,amount:p.amt,unitPrice:p.price,sku:p.sku,unit:p.unit}),unit:p.unit}]);
  q.updatedAt=m.submittedAt;q.updatedBy=d.sm;
 }
 for(const q of list){q.amount=q.products.reduce((n,p)=>n+qNum(p[2]),0);q.dept=quoteCatsOf([q]).join(' / ');q.manager=quoteCatsOf([q]).map(c=>c+' · '+quoteSmOf(c,m.project)).join(' / ');}markDraftCats(m.project,[opp[3]]);
};
const dbSnapshotBase=v125Snapshot;
v125Snapshot=function(code,m,...args){const snapshot=dbSnapshotBase(code,m,...args),opp=oqQuoteOpp(code);if(snapshot&&dbDepartment(opp)){snapshot.quoteBusiness=v3Copy(m.submitted.quoteBusiness||{kind:'department',name:opp[3],customerName:dbFallbackName(m.submitted),departmentId:opp[20]?.departmentId||''});for(const s of snapshot.spaces||[])for(const p of s.products||[]){p.productCategory=p.category;p.category=opp[3];p.specifications=[...(p.specifications||[]),{field:'productCategory',label:'产品品类',value:p.productCategory}];}}return snapshot;};
const dbBindBase=bindPimsFrame;
bindPimsFrame=function(){const opp=draftEditorCtx?.draftCode&&oqQuoteOpp(draftEditorCtx.draftCode);if(dbDepartment(opp))draftEditorCtx={...draftEditorCtx,quoteBusiness:{kind:'department',name:opp[3]}};return dbBindBase();};
const dbCellsBase=v46Cells;
v46Cells=function(x,...args){const html=dbCellsBase(x,...args),actual=x[6]?.productCategory||x[6]?.publicQuote?.productCategory;return actual&&actual!==x[1]?html.replace(/(<td[^>]*data-col="category"[^>]*>)[\s\S]*?(<\/td>)/,(_,a,b)=>a+esc(skyCat(x[1]))+'<small style="display:block;color:#708397">'+esc(skyCat(actual))+ '</small>'+b):html;};
if(typeof qd228HeadingLabel==='function'){const base=qd228HeadingLabel;qd228HeadingLabel=function(kind,...args){return base(kind,...args).replace(/^品类/,'报价业务');};}
const dbLabelBase=q63Label;
q63Label=function(key){return key==='category'?skyT('报价业务 / 产品品类','Quotation business / Product category'):dbLabelBase(key);};
// Rebuild only explicit department records, using their last submitted snapshots.
for(const [code,m] of Object.entries(V3.meta))if(m.submitted&&m.active!==false&&!m.needsSpaceUpdate&&dbDepartment(oqQuoteOpp(code)))v3RebuildDraftQuotes(code);

function dbReadNames(){return Object.fromEntries([...document.querySelectorAll('[data-db-name]')].map(input=>[input.dataset.dbName,input.value.trim()]));}
function dbRefreshNames(){
 const form=document.getElementById('ua176Form');if(!form||V68.allocation.mode==='design')return;
 const prior={...(UA176.drafts[V68.allocation.mode]?.customerQuoteNames||{}),...dbReadNames()},selected=[...document.querySelectorAll('[data-ua-person]:checked')].map(input=>input.dataset.cat).filter(cat=>['Sourcing','SinoChina'].includes(cat));
 let box=document.getElementById('dbQuoteNames');if(!box){box=document.createElement('div');box.id='dbQuoteNames';box.className='full planned-form';document.getElementById('ua176People').insertAdjacentElement('afterend',box);}
 box.innerHTML=selected.map(cat=>`<label>${esc(cat)} · 客户报价名称 <b>*</b><input data-db-name="${esc(cat)}" aria-label="${esc(cat)}客户报价名称" maxlength="80" value="${esc(prior[cat]||'')}" placeholder="例如：家具与灯饰采购方案"><small>客户看到此名称，内部仍记录 ${esc(cat)}。实际产品品类保留在明细中，此名称不限制选品。</small></label>`).join('');
 UA176.drafts[V68.allocation.mode]||={};UA176.drafts[V68.allocation.mode].customerQuoteNames=prior;
}
const dbPickerBase=ua176RefreshPicker;
ua176RefreshPicker=function(){const result=dbPickerBase();dbRefreshNames();return result;};
const dbCaptureBase=ua176CaptureAllocation;
ua176CaptureAllocation=function(){const hasForm=!!document.getElementById('ua176Form'),names=dbReadNames(),result=dbCaptureBase();if(hasForm&&V68.allocation?.mode&&UA176.drafts[V68.allocation.mode])UA176.drafts[V68.allocation.mode].customerQuoteNames=names;return result;};
const dbBatchBase=allocationBatchInputs;
allocationBatchInputs=function(state,names,details={}){const inputs=dbBatchBase(state,names,details);for(const input of inputs)if(['Sourcing','SinoChina'].includes(input.cat)){const name=String(details.customerQuoteNames?.[input.cat]||'').trim();if(!name||name.length>80)throw Error('请填写 '+input.cat+' 的客户报价名称（最多80字）');input.customerQuoteName=name;}return inputs;};
const dbOpportunityBase=v68CreateOpportunity;
v68CreateOpportunity=function(task){return bs131Atomic(()=>{const id=dbOpportunityBase(task),opp=oqOpp(id);if(dbDepartment(opp)&&task.allocation?.customerQuoteName){opp[20]||={};opp[20].customerQuoteName=task.allocation.customerQuoteName;}return id;});};
const dbCreateBase=oqCreateQuote;
oqCreateQuote=function(id){return bs131Atomic(()=>{const code=dbCreateBase(id),opp=oqOpp(id);if(dbDepartment(opp)&&opp[20]?.customerQuoteName){const d=DRAFT_DATA[code];d.name=opp[20].customerQuoteName;const row=DRAFTS.find(r=>r[0]===code);if(row)row[1]=d.name;const order=oqOrder(code);if(order)order[6]=d.name;}return code;});};
const dbBoardBase=pageBoard;
pageBoard=function(...args){const box=document.createElement('div');box.innerHTML=dbBoardBase(...args);for(const button of box.querySelectorAll('[data-act="quoteCatNav"][data-cat]')){const group=button.dataset.cat;if(!['Sourcing','SinoChina'].includes(group))continue;const name=dbCustomerName(group,archiveProject)+' · '+group,label=button.querySelector('.v37-mix-name');if(label){for(const child of [...label.childNodes])if(child.nodeType===3&&child.textContent.trim()===group)child.textContent=name;}if(button.getAttribute('aria-label')?.startsWith(group))button.setAttribute('aria-label',button.getAttribute('aria-label').replace(group,name));}return box.innerHTML;};RENDER.board=pageBoard;
const dbClientHtmlBase=clientQuoteHtml;
clientQuoteHtml=function(...args){const prior=DB_CLIENT_RENDER;try{DB_CLIENT_RENDER=true;return dbClientHtmlBase(...args);}finally{DB_CLIENT_RENDER=prior;}};
if(typeof cxp208Summary==='function'){const base=cxp208Summary;cxp208Summary=function(project,...args){const box=document.createElement('div');box.innerHTML=base(project,...args);for(const row of box.querySelectorAll('.cxp-summary-table tbody tr')){const cell=row.children[2],group=cell?.textContent.trim();if(['Sourcing','SinoChina'].includes(group))cell.textContent=dbCustomerName(group,project);}return box.innerHTML;};}
