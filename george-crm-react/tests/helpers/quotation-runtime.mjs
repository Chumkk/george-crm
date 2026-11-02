import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../src/compat/runtime/opportunityQuotes.js',import.meta.url),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
export function setup(){
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
export function quote(c,amount=100){const code=c.oqCreateQuote('B');return {code,data:{...copy(c.DRAFT_DATA[code]),spaces:[{name:'客厅',products:[{name:'椅子',cat:'家具',sku:'CH',qty:1,price:amount,amt:amount}]}]}};}

