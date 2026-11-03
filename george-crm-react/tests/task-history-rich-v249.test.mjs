import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {setup,now,read,copy} from './helpers/todo248.mjs';
const history=read('george-crm-react/src/compat/runtime/taskHistory.js'),migration=read('george-crm-react/src/compat/runtime/taskScenarioHistory.js');
function boot(){
 const c=setup(),snapshot=c.v125Snapshot;c.v125Snapshot=(code,m)=>({...snapshot(code,m),project:m.project,submittedAt:m.submittedAt,name:m.submitted.name});c.td248Seed(now);const storage=c.testStorage248;
 c.tfTime=value=>{if(!value||['-','未记录'].includes(value))return null;const text=/^\d{4}-\d\d-\d\d \d\d:\d\d/.test(value)?value.replace(' ','T')+'+08:00':value,time=Date.parse(text);return Number.isFinite(time)?time:null;};
 c.localStorage={get length(){return storage.size;},key:i=>[...storage.keys()][i],getItem:key=>{const value=storage.get(key);return value==null?null:typeof value==='string'?value:JSON.stringify(value);},setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
 const readKey=c.wkRead;c.wkRead=(key,fallback)=>{const value=readKey(key);if(value==null)return fallback;return typeof value==='string'?JSON.parse(value):value;};
 c.v3Save=()=>{if(c.failSave)return false;c.localStorage.setItem('crm-flow-v3',JSON.stringify({todos:c.TODOS}));return true;};
 const atomic=c.bs131Atomic;c.bs131Atomic=fn=>atomic(()=>{const value=fn();if(!c.v3Save())throw Error('保存失败');return value;});
 c.qaAssistant=(t,actor)=>t.quoteAssistant===actor&&t.quoteAssistantOwner===t.owner;
 vm.runInContext(history,c);
 const archive={};for(const t of c.TODOS.filter(t=>t.scenario248)){t.lifecycle192=c.th192Delta(t,null,new Date(now).toISOString(),'PM');archive[t.id]={type:t.type,project:t.project,startedAt:t.time,events:copy(t.lifecycle192)};}
 c.localStorage.setItem('crm-task-history-v192',JSON.stringify(archive));c.localStorage.setItem('crm-flow-v3',JSON.stringify({todos:c.TODOS}));c.TH_BASE=vm.runInContext('TH192.baseline',c);c.TH_BUSY=()=>vm.runInContext('TH192.busy',c);c.window=undefined;vm.runInContext(migration,c);return c;
}
test('submitted V1 -> saved/reopened -> submitted V2 uses the same task, actual actors/times and exact quote versions',()=>{
 const c=boot(),t=c.TODOS.find(t=>t.opp==='BU-TD248-1'&&t.type==='报价待办'),code=t.draft,m=c.V3.meta[code],original=JSON.stringify(m.quoteVersions[0]),result=c.tsh249Repair();assert.ok(result.resubmitted);assert.equal(m.quoteVersions.length,2);assert.equal(JSON.stringify(m.quoteVersions[0]),original);assert.equal(c.oqOrder(code)[18].erpRequests.length,2);assert.equal(t.status,'已处理');
 const view=c.th192History(t,now),reopen=view.events.find(e=>e.kind==='reactivated');assert.equal(reopen.actor,'助理B');assert.equal(reopen.quoteRevision,1);assert.equal(reopen.fromStatus,'已处理');assert.equal(reopen.toStatus,'待处理');
 const submitted=view.events.filter(e=>e.kind==='quote-submitted');assert.deepEqual(Array.from(submitted,e=>e.quoteRevision),[1,2]);for(const e of submitted){const v=m.quoteVersions.find(v=>v.id===e.quoteVersionId);assert.equal(e.actor,v.submittedBy);assert.equal(c.tfTime(e.at),c.tfTime(v.submittedAt));}
 const completed=view.events.filter(e=>e.kind==='completed');assert.deepEqual(Array.from(completed,e=>e.quoteRevision),[1,2]);assert.ok(c.tfTime(completed[0].at)<c.tfTime(reopen.at));assert.ok(c.tfTime(reopen.at)<c.tfTime(completed[1].at));assert.equal(view.segments.filter(s=>s.active).length,0);assert.equal(view.events[0].kind,'created');assert.equal(view.events[0].actor,t.initiator);assert.equal(c.archiveProject,'P');
});
test('saved-only and space-invalidated tasks end with the correct open handling segment and keep old confirmation evidence',()=>{
 const c=boot();c.tsh249Repair();for(const t of c.TODOS.filter(t=>t.scenario248&&t.type==='报价待办'&&!t.designOpportunity)){const view=c.th192History(t,now);assert.ok(view.events.every(e=>!e.quotation||c.V3.meta[e.quotation]?.project===t.project));assert.ok(view.events.every((e,i)=>!i||c.tfTime(e.at)>=c.tfTime(view.events[i-1].at)));if(t.status==='待处理')assert.ok(view.segments.at(-1).active);else assert.ok(!view.segments.some(s=>s.active));}
 const t=c.TODOS.find(t=>t.opp==='BU-TD248-7'&&t.type==='报价待办'),view=c.th192History(t,now);assert.ok(view.events.some(e=>e.kind==='quote-confirmed'&&e.quoteRevision===1));assert.ok(view.events.some(e=>e.kind==='reactivated'&&e.reason.includes('空间')));assert.equal(c.V3.meta[t.draft].quoteVersions[0].confirmations.length,1);
 const saved=c.TODOS.find(t=>t.opp==='BU-TD248-0'&&t.type==='报价待办');assert.ok(!c.th192History(saved,now).events.some(e=>e.kind==='quote-submitted'));
});
test('initial import timestamps are corrected only for reserved samples; later genuine audit entries and unrelated records survive',()=>{
 const c=boot(),t=c.TODOS.find(t=>t.opp==='BU-TD248-0'&&t.type==='报价待办'),later=c.th192Event(t,'edited','REAL-LATER',{at:new Date(now+7200000).toISOString(),actor:'真实办理人',detail:'用户后续实际编辑'});t.lifecycle192.push(later);const unrelated={id:'USER-TASK',type:'确认商机',project:'USER-PROJECT',status:'待处理',owner:'用户',time:'2026-11-03 10:00',lifecycle192:[{id:'U',kind:'created',at:'2026-11-03 10:00',actor:'用户'}]};c.TODOS.push(unrelated);const old=JSON.stringify(unrelated);c.tsh249Repair();assert.equal(JSON.stringify(unrelated),old);assert.ok(t.seedHistoryBefore249.length);assert.deepEqual(copy(t.lifecycle192.find(e=>e.evidence==='REAL-LATER')),copy(later));const once=JSON.stringify(c.TODOS);assert.equal(c.tsh249Repair(),false);assert.equal(JSON.stringify(c.TODOS),once);
});
test('read-only views never append events; failed migration restores business data, outbox, audit and selection',()=>{
 const c=boot(),before=JSON.stringify({todos:c.TODOS,meta:c.V3.meta,orders:c.ORDERS}),stored=c.localStorage.getItem('crm-task-history-v192');c.failSave=true;assert.throws(()=>c.tsh249Repair(),/保存失败/);assert.equal(JSON.stringify({todos:c.TODOS,meta:c.V3.meta,orders:c.ORDERS}),before);assert.equal(c.localStorage.getItem('crm-task-history-v192'),stored);assert.equal(c.archiveProject,'P');assert.equal(c.TH_BUSY(),false);
 const d=boot();d.document.documentElement={dataset:{entry:'client'}};assert.equal(d.tsh249Repair(),false);const t=d.TODOS.find(t=>t.scenario248),old=JSON.stringify(t);d.th192History(t,now);d.th192History(t,now);assert.equal(JSON.stringify(t),old);
});
test('same-minute V1 completion, reopening and V2 completion retain distinct version identities and logical order',()=>{
 const c=boot();c.tsh249Repair();const t=c.TODOS.find(t=>t.type==='报价待办'&&t.opp==='BU-TD248-1'),m=c.V3.meta[t.draft],same='2026-11-03 10:00';for(const v of m.quoteVersions)v.submittedAt=same;for(const r of c.oqOrder(t.draft)[18].erpRequests)r.time=same;m.submittedAt=same;m.workingSavedAt=same;t.approveTime=same;for(const r of t.quoteReactivations246){r.at=same;r.previous.approveTime=same;}t.lifecycle192=[];t.seedHistoryEvents249=[];c.localStorage.setItem('crm-task-history-v192','{}');
 const view=c.th192History(t,now),steps=Array.from(view.events.filter(e=>['quote-submitted','erp-request','completed','quote-saved','reactivated'].includes(e.kind)),e=>e.kind+':'+e.quoteRevision);assert.deepEqual(steps,['quote-submitted:1','erp-request:1','completed:1','quote-saved:1','reactivated:1','quote-submitted:2','erp-request:2','completed:2']);assert.equal(view.segments.filter(s=>s.active).length,0);
});
