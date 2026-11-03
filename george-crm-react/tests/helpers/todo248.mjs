import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {setup as quotationSetup} from './quotation-runtime.mjs';
const read=p=>fs.readFileSync(new URL('../../../'+p,import.meta.url),'utf8'),script=read('george-crm-react/src/compat/runtime/todoScenario.js'),copy=x=>JSON.parse(JSON.stringify(x));
const now=Date.parse('2026-11-03T06:00:00Z');
function setup(){
 const c=quotationSetup(),storage=new Map(),audit=JSON.parse(read('work/v247-image-audit.json')),categories=['家具','灯饰','石材','门窗','Sourcing','SinoChina','卫浴','定制','地板'];c.actor='PM';
 Object.assign(c,{CUSTOMERS:[['SAMPLE','测试客户8564']],V68_SMS:categories.map(cat=>({name:cat+'SM',cat,regions:['北美','欧洲/俄罗斯/中亚']})),WK_CATALOG:audit.products.map(p=>({...p,price:1000,unit:'件'})),v21SuperAdmin:()=>true,v21CanOperate:()=>true,archiveProject:'P',PIMS46:{find:cat=>({id:cat})},wkRead:key=>storage.get(key),wkWrite:(key,value)=>{if(c.failWrite)return false;storage.set(key,copy(value));return true;},pw173QuoteSpaces:opp=>c.PROJECT_EXTRA[opp[4]].formData.spaceCats.map(s=>s.name),dbDepartment:opp=>['Sourcing','SinoChina'].includes(opp[3]),v125RecordConfirmations(){for(const m of Object.values(c.V3.meta))if(m.currentQuoteVersion&&m.confirmedCats?.length)m.quoteVersions.at(-1).confirmations=[{category:m.categories[0],time:m.confirmedAt,by:m.confirmedBy}];},efInitiate:(project,opp,data)=>c.addChainTodo({type:'费用订单待办',project,opp,...copy(data),status:'待处理'}),efReject:(id,reason)=>Object.assign(c.TODOS.find(t=>t.id===id),{status:'已驳回',rejectReason:reason}),efComplete:(id,amount)=>Object.assign(c.TODOS.find(t=>t.id===id),{status:'已处理',amount}),ua176Supervisors:()=>['设计甲','设计乙','设计丙'],tfRelativeDate:(days,t=now)=>new Date(t+days*86400000).toISOString().slice(0,10),tfExpected:value=>value+'T23:59:59+08:00'});
 c.mgOpportunityState=o=>o[2];
 c.dw132CreateOpportunities=(project,names,source,token,options)=>names.map(owner=>c.addChainTodo({type:'确认商机',project,owner,initiator:'PM',designOpportunity:true,allocation:{cat:'设计服务'},...copy(options)}));
 c.v68CreateOpportunity=t=>{const p=c.PROJECTS.find(p=>p[0]===t.project),id='DES-'+t.id,o=[id,p[1]+'-设计服务','洽谈中','设计服务',t.project,p[6],p[7],t.owner,'','','PM','','','¥0','','','','',c.v3Stamp(),'',{kind:'design',expectedCompletionAt:t.expectedCompletionAt,coordination:t.coordination}];c.OPPS.push(o);c.oqEnsureTodo(o,t.id);return id;};
 c.dqSaveDesign=(id,amount,fields,publish)=>{const o=c.oqOpp(id),t=c.oqEnsureTodo(o);if(!publish)return {amount,fields};t.status='已处理';const delivery=c.addChainTodo({type:'设计待办',project:o[4],owner:o[7],initiator:'PM',opp:id,status:'待处理',gds:{revision:1},expectedCompletionAt:o[20].expectedCompletionAt}),order=['XF'+id];order[18]={designTodoId:delivery.id};return order;};
 c.gds171Receive=receipt=>{const source=c.TODOS.find(t=>t.id===receipt.task);if(receipt.action==='complete'){source.status='已处理';return {};}const review=c.addChainTodo({type:'设计确认待办',project:source.project,owner:'PM',initiator:source.owner,sourceTodoId:source.id,status:'待处理',drawings:receipt.contents.drawings.map(x=>({...copy(x),status:'待确认'}))});return {nextTask:review.id};};
 c.dr185Review=(task,id,action,revision,reason)=>{const d=task.drawings.find(d=>d.id===id);d.status=action==='confirm'?'已确认':'已驳回';d.reason=reason||'';};c.dr187Sync=task=>{assert.ok(task.drawings.every(d=>d.status==='已确认'));task.status='已处理';};
 c.v125ApplySpaceImpact=(project,before,after)=>{for(const [code,m]of Object.entries(c.V3.meta))if(m.project===project){m.needsSpaceUpdate=true;m.active=false;m.confirmedCats=[];m.status='已暂存';m.spaceChangeAt=c.v3Stamp();const task=c.TODOS.find(t=>t.draft===code);task.statusHistory=[{status:task.status,time:c.v3Stamp(),reason:'项目空间已修改'}];task.status='待处理';}};
 c.bs131Atomic=change=>{const names=['PROJECTS','PROJECT_EXTRA','PROJECT_FILES','OPPS','TODOS','ORDERS','DRAFTS','DRAFT_DATA','V3','PROJECT_QUOTES'],before=copy(Object.fromEntries(names.map(n=>[n,c[n]]))),stored=new Map(storage);try{return change();}catch(e){Object.assign(c,before);storage.clear();for(const [key,value]of stored)storage.set(key,value);throw e;}};
 vm.runInContext(script,c);vm.runInContext(read('work/product-image-core-v247-built.js'),c);c.window={CRMProductImages247:c.CRMProductImages247};c.testStorage248=storage;return c;
}

export {setup,now,read,copy};
