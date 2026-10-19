import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/compat/runtime/taskHistory.js',import.meta.url),'utf8');
function boot(tasks=[]){
 const store=new Map();let success=true;
 const c={TODOS:tasks,Date,Map,Set,JSON,console,v17Owner:()=>c.actor,actor:'PM',tfTime:value=>{if(!value||value==='-')return null;const raw=/^\d{4}-\d\d-\d\d \d\d:\d\d/.test(value)?value.replace(' ','T')+'+08:00':value;const time=Date.parse(raw);return Number.isFinite(time)?time:null;},localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)},v3Save:()=>{if(!success)return false;store.set('crm-flow-v3',JSON.stringify({todos:c.TODOS}));return true;}};
 c.bs131Atomic=change=>{const before=JSON.parse(JSON.stringify(c.TODOS)),saved=new Map(store);try{const result=change();if(!c.v3Save())throw Error('save failed');return result;}catch(error){c.TODOS.splice(0,c.TODOS.length,...before);store.clear();for(const [key,value] of saved)store.set(key,value);throw error;}};
 vm.createContext(c);vm.runInContext(source,c);return {c,store,fail:()=>success=false,pass:()=>success=true};
}
const task=()=>({id:'T1',type:'确认商机',project:'PJ1',owner:'SM-A',initiator:'PM',status:'待处理',time:'2026-10-19 08:00'});
test('发起、催办、转派、驳回、重提、完成按成功保存追加，重复保存不重复记录',()=>{
 const {c}=boot();const t=task();c.TODOS.push(t);c.v3Save();assert.equal(t.lifecycle192[0].kind,'created');
 t.reminders=[{messageId:'M1',at:'2026-10-19T08:30:00+08:00',by:'PM',to:'SM-A'}];c.v3Save();
 c.actor='PM';t.ownerHistory=[{from:'SM-A',to:'SM-B',actor:'PM',time:'2026-10-19 09:00'}];t.owner='SM-B';c.v3Save();
 c.actor='SM-B';t.status='已驳回';t.approver='SM-B';t.approveTime='2026-10-19 09:10';t.rejectReason='补充资料';c.v3Save();
 c.actor='PM';t.status='待处理';t.editRevision=1;t.editHistory=[{actor:'PM',time:'2026-10-19 09:20',revision:1,fromStatus:'已驳回',decision:{reason:'补充资料'}}];c.v3Save();
 c.actor='SM-B';t.status='已处理';t.approveTime='2026-10-19 09:40';t.completionReason='已承接';c.v3Save();
 assert.deepEqual(Array.from(t.lifecycle192,e=>e.kind),['created','reminded','transferred','rejected','resubmitted','completed']);
 const before=JSON.stringify(t.lifecycle192);c.v3Save();assert.equal(JSON.stringify(t.lifecycle192),before);
 assert.ok(t.lifecycle192.every(e=>e.actor&&e.at));assert.equal(t.type,'确认商机');
});
test('保存失败不记录成功动作，重试只记一次；外层失败回滚嵌套保存的基线',()=>{
 const {c,fail,pass}=boot();const t=task();c.TODOS.push(t);fail();assert.equal(c.v3Save(),false);assert.equal(t.lifecycle192,undefined);
 pass();c.v3Save();assert.equal(t.lifecycle192.length,1);
 assert.throws(()=>c.bs131Atomic(()=>{c.TODOS[0].status='已处理';c.v3Save();throw Error('outer failed');}),/outer failed/);
 c.TODOS[0].status='已处理';c.v3Save();assert.equal(c.TODOS[0].lifecycle192.filter(e=>e.kind==='completed').length,1);
});
test('读取历史只整合真实字段，不补造发起、操作人或耗时',()=>{
 const t=task(),{c}=boot([t]);const before=JSON.stringify(t),view=c.th192History(t);
 assert.equal(JSON.stringify(t),before);assert.equal(view.partial,true);assert.equal(view.summary.total,'未记录');assert.equal(view.segments.length,0);assert.equal(view.events[0].kind,'arrived');assert.equal(view.events[0].actor,'');
});
test('旧记录的催办、移交、驳回和重提证据可读，缺失时间不用于耗时',()=>{
 const t={...task(),status:'已驳回',approveTime:'2026-10-19 10:00',approver:'SM-A',rejectReason:'资料不足',ownerHistory:[{from:'A',to:'SM-A',time:'',actor:'PM'}],reminders:[{by:'PM',to:'SM-A',at:'2026-10-19 09:00',messageId:'R'}]}, {c}=boot([t]);
 const view=c.th192History(t);assert.equal(view.events.length,4);assert.ok(view.events.some(e=>e.kind==='rejected'&&e.reason==='资料不足'));assert.equal(view.summary.transfers,1);assert.equal(view.summary.firstResponse,'未记录');
});
test('合并同一待办的跨入口持久化日志，隔离同编号不同项目',()=>{
 const {c,store}=boot();const t=task();c.TODOS.push(t);c.v3Save();
 const extra=c.th192Event(t,'reminded','external',{at:new Date().toISOString(),actor:'PM',toOwner:'SM-A'});
 store.set('crm-flow-v3',JSON.stringify({todos:[{...t,lifecycle192:[...t.lifecycle192,extra]}]}));c.v3Save();assert.equal(t.lifecycle192.length,2);
 store.set('crm-flow-v3',JSON.stringify({todos:[{...t,project:'OTHER',lifecycle192:[c.th192Event(t,'edited','other-project')]}]}));c.v3Save();assert.ok(!t.lifecycle192.some(e=>e.evidence==='other-project'));
});
test('按负责人分段，转派与驳回等待补充分别计时；催办不当成实际响应',()=>{
 const t={...task(),status:'已处理'}, {c}=boot([t]);const at=h=>'2026-10-19T'+h+':00+08:00';
 t.lifecycle192=[c.th192Event(t,'created','c',{at:at('08:00'),actor:'PM',toOwner:'SM-A'}),c.th192Event(t,'reminded','r',{at:at('08:30'),actor:'PM',toOwner:'SM-A'}),c.th192Event(t,'transferred','t',{at:at('09:00'),actor:'SM-A',fromOwner:'SM-A',toOwner:'SM-B'}),c.th192Event(t,'rejected','j',{at:at('10:00'),actor:'SM-B'}),c.th192Event(t,'resubmitted','s',{at:at('12:00'),actor:'PM',toOwner:'SM-B'}),c.th192Event(t,'completed','d',{at:at('13:00'),actor:'SM-B'})];
 const view=c.th192History(t,Date.parse(at('14:00')));assert.deepEqual(Array.from(view.segments,s=>s.duration),['1小时','1小时','2小时','1小时']);assert.equal(view.segments[2].kind,'等待补充资料');assert.equal(view.summary.firstResponse,'1小时');assert.equal(view.responses[0].duration,'30分钟');
});
test('GDS 逐图确认、驳回、重提保留图纸身份及来源，不代替整项任务完成',()=>{
 const t={...task(),type:'设计确认待办',drawings:[]}, {c}=boot([t]);
 t.drawings=[{id:'D1',type:'平面设计图',file:{name:'plan.pdf'},revision:1,history:[{action:'reject',by:'PM',time:'2026-10-19 09:00',reason:'尺寸错误',revision:1,source:'CRM'}]},{id:'D2',type:'3D意向图',file:{name:'render.png'},history:[{action:'confirm',by:'协调员',time:'2026-10-19 09:00',revision:1,source:'GDS'}]}];c.v3Save();const view=c.th192History(t);
 assert.ok(view.events.some(e=>e.kind==='drawing-reject'&&e.drawingId==='D1'&&e.reason==='尺寸错误'));
 assert.ok(view.events.some(e=>e.kind==='drawing-confirm'&&e.source==='GDS'&&e.drawingId==='D2'));assert.equal(t.status,'待处理');assert.ok(!view.events.some(e=>e.kind==='completed'));
});
test('GDS 生成审核待办记实际回执人，后续保存不可覆盖已有事件内容',()=>{
 const {c}=boot();c.GDS171={receipt:{actor:'GDS设计师'}};const t={...task(),type:'设计确认待办',owner:'PM',initiator:'GDS设计师'};c.TODOS.push(t);c.v3Save();
 assert.equal(t.lifecycle192[0].actor,'GDS设计师');assert.equal(t.lifecycle192[0].source,'GDS');
 t.lifecycle192[0].actor='改写';c.GDS171.receipt=null;c.v3Save();assert.equal(t.lifecycle192[0].actor,'GDS设计师');
});
test('报价创建及提交只关联本任务报价，不提前完成待办或串入别的项目',()=>{
 const t={...task(),type:'报价待办'}, {c}=boot([t]);c.V3={meta:{Q1:{project:'PJ1',quoteVersions:[]},OTHER:{project:'OTHER',quoteVersions:[{id:'wrong',submittedBy:'OTHER'}]}}};
 t.draft='Q1';c.actor='SM-A';c.v3Save();c.V3.meta.Q1.quoteVersions.push({id:'submit-1',submittedAt:'2026-10-19 09:00',submittedBy:'SM-A'});c.v3Save();
 assert.deepEqual(Array.from(t.lifecycle192,e=>e.kind),['quote-created','quote-submitted']);assert.equal(t.status,'待处理');assert.ok(c.th192History(t).events.every(e=>e.quotation!=='OTHER'));
});
test('旧页面覆盖业务缓存也保留独立处理履历，重开不补造新的发起事件',()=>{
 const {c,store}=boot();const t=task();c.TODOS.push(t);c.v3Save();const id=t.lifecycle192[0].id;
 delete t.lifecycle192;store.set('crm-flow-v3',JSON.stringify({todos:[t]}));const view=c.th192History(t);assert.ok(view.events.some(e=>e.id===id));
 c.v3Save();assert.equal(t.lifecycle192.filter(e=>e.kind==='created').length,1);
});
