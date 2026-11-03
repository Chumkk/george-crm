import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {setup,now,read,copy} from './helpers/todo248.mjs';
test('rich samples have coherent quotation/task states, linked order snapshots, products and real photo references',()=>{
 const c=setup(),old=copy({projects:c.PROJECTS,opps:c.OPPS,todos:c.TODOS});const result=c.td248Seed(now);assert.equal(result.projects,4);assert.equal(result.quotations,8);
 const tasks=c.TODOS.filter(t=>t.scenario248&&t.type==='报价待办'&&!t.designOpportunity);assert.equal(tasks.length,8);const states=new Set(tasks.map(t=>c.oqStatus(t.draft)));assert.deepEqual([...states].sort(),['已提交','已暂存','已确认','待报价'].sort());
 for(const t of tasks){const code=t.draft,m=c.V3.meta[code],d=c.DRAFT_DATA[code];assert.equal(c.oqQuoteOpp(code)[0],t.opp);assert.equal(d.todoId,t.id);if(['已提交','已确认'].includes(c.oqStatus(code)))assert.equal(t.status,'已处理');else assert.equal(t.status,'待处理');if(m.submitted)assert.equal(c.oqOrder(code)[18].erpRequests.length,1);for(const p of d.spaces.flatMap(s=>s.products||[])){assert.ok(p.images[0].src.startsWith('./media-product-ref-'));assert.equal(p.amt,p.qty*p.price);assert.equal(p.publicQuote.amount,p.amt);}}
 for(const t of tasks){if(t.status==='已处理')assert.ok(t.approveTime>=t.time,t.id+' completed before arrival');const o=c.oqOpp(t.opp);assert.ok(o[20].stageTracking.enteredAt>=o[18],o[0]+' stage entered before opportunity creation');}
 const reopened=tasks.find(t=>c.V3.meta[t.draft].workingSaved&&c.V3.meta[t.draft].submitted),m=c.V3.meta[reopened.draft];assert.equal(reopened.status,'待处理');assert.equal(m.confirmedCats.length,1);assert.ok(c.v3DraftAmount(c.DRAFT_DATA[reopened.draft])>c.v3DraftAmount(m.submitted));assert.equal(c.oqOrder(reopened.draft)[18].erpRequests.length,1);
 const changed=tasks.find(t=>c.V3.meta[t.draft].needsSpaceUpdate);assert.equal(changed.status,'待处理');assert.equal(c.V3.meta[changed.draft].submitted.spaces[2].name,'主卧');assert.equal(c.PROJECT_EXTRA[changed.project].formData.spaceCats[2].name,'主卧套房');
 assert.deepEqual(copy(c.PROJECTS.find(p=>p[0]===old.projects[0][0])),old.projects[0]);assert.deepEqual(copy(c.OPPS.find(o=>o[0]===old.opps[0][0])),old.opps[0]);assert.equal(c.archiveProject,'P');
});
test('review samples include actual drawing contents and independent delivery/review states',()=>{
 const c=setup();c.td248Seed(now);const reviews=c.TODOS.filter(t=>t.scenario248&&t.type==='设计确认待办');assert.equal(reviews.length,2);
 const pending=reviews.find(t=>t.status==='待处理');assert.deepEqual(pending.drawings.map(d=>d.status),['已确认','已驳回','待确认','待确认']);assert.match(pending.drawings[1].reason,/浅米色/);assert.ok(pending.drawings.every(d=>d.file.url));assert.equal(c.TODOS.find(t=>t.id===pending.sourceTodoId).status,'待处理');
 const done=reviews.find(t=>t.status==='已处理');assert.equal(c.TODOS.find(t=>t.id===done.sourceTodoId).status,'已处理');assert.equal(c.TODOS.filter(t=>t.scenario248&&t.type==='费用订单待办').length,3);assert.deepEqual(c.TODOS.filter(t=>t.scenario248&&t.type==='费用订单待办').map(t=>t.status).sort(),['已处理','已驳回','待处理'].sort());
 const projectTask=c.TODOS.find(t=>t.id==='TD248-PROJECT');assert.equal(c.OPPS.filter(o=>o[4]===projectTask.project).length,0);
});
test('refresh never duplicates fixtures or overwrites saved sample edits; client and ordinary-user entry stay unchanged',()=>{
 const c=setup();c.td248Seed(now);const t=c.TODOS.find(t=>t.scenario248&&t.status==='待处理');t.summary='用户自己修改';const before=JSON.stringify({todos:c.TODOS,meta:c.V3.meta});assert.equal(c.td248Seed(now+86400000),false);assert.equal(JSON.stringify({todos:c.TODOS,meta:c.V3.meta}),before);
 for(const kind of ['client','ordinary','collision']){const d=setup();if(kind==='client')d.document.documentElement={dataset:{entry:'client'}};if(kind==='ordinary')d.v21SuperAdmin=()=>false;if(kind==='collision')d.PROJECTS.push(['PJ0088248','已有用户项目']);const old=JSON.stringify(d.PROJECTS);assert.equal(d.td248Seed(now),false);assert.equal(JSON.stringify(d.PROJECTS),old);}
});
test('fixture persistence failure rolls back all new records and restores temporary actor/time and navigation',()=>{
 const c=setup(),before=JSON.stringify({projects:c.PROJECTS,todos:c.TODOS,meta:c.V3.meta}),actor=c.v17Owner(),time=c.v3Stamp();c.failWrite=true;assert.throws(()=>c.td248Seed(now),/未保存/);assert.equal(JSON.stringify({projects:c.PROJECTS,todos:c.TODOS,meta:c.V3.meta}),before);assert.equal(c.v17Owner(),actor);assert.equal(c.v3Stamp(),time);assert.equal(c.archiveProject,'P');
});
test('new example payloads run through the actual fee and per-drawing GDS review/synchronization handlers',()=>{
 const c=setup(),noop=()=>'';Object.assign(c,{ua176CaptureAllocation:noop,ua176EnsureDesign:noop,ua181InvitationDeadline:noop,MODALS:{confirmTodo:{html:noop}},v68Allocation:noop,v72NotificationEvents:()=>[],tfFormat:String,projectPmOf:id=>c.PROJECTS.find(p=>p[0]===id)?.[9],GDS171:{receipt:null},dqFiles:copy,dqCanFee:()=>true,v69AttachmentList:noop,v69UploadHtml:noop,v69UploadsBusy:()=>false,dw132Designers:()=>['设计甲','设计乙','设计丙'],DQ_FEE_TYPES:['搬货费','安装费','国内运费']});
 c.document.createElement=()=>({});c.document.head={appendChild(){}};c.document.addEventListener=()=>{};c.dqAllocateBase=c.dw132CreateOpportunities;for(const name of ['mgResubmitReview','dw132CompleteDesign','mgSyncDesign','mgRejectDesign','v81OpenTodoEdit'])c[name]=noop;
 c.mgDesignCanHandle=()=>true;c.gds171Queue=t=>{if(!t.gds)t.gds={revision:1,requests:[],receipts:[]};};
 const fee=read('george-crm-react/src/compat/runtime/expenseWorkflow.js');vm.runInContext(fee.slice(0,fee.indexOf('function efOpen')),c);
 vm.runInContext(read('george-crm-react/src/compat/runtime/designOrderDelivery.js'),c);
 c.dqSaveDesign=(id,amount,fields,publish)=>{const opp=c.oqOpp(id),task=c.oqEnsureTodo(opp);if(!publish)return {amount,fields};const code='Q-DES-'+id;task.draft=code;task.status='已处理';c.V3.meta[code]={revision:1,currentQuoteVersion:code+':V1',submitted:{designFields:fields}};const order=['XF'+id,opp[7],'设计单','未执行','设计服务','','设计报价','','','',c.qMoney(amount),'','','','',opp[4],'',id,{kind:'design',quoteCode:code,erpRequestedRevision:1}];c.ORDERS.push(order);c.dr185Ensure(order);return order;};
 c.td248Seed(now);const reviews=c.TODOS.filter(t=>t.scenario248&&t.type==='设计确认待办'),complete=reviews.find(t=>t.status==='已处理'),pending=reviews.find(t=>t.status==='待处理');assert.ok(complete);assert.ok(pending);assert.ok(complete.confirmedSnapshot.drawings.length===4);assert.ok(c.PROJECT_FILES[complete.project].planDesignFiles.some(f=>f.designReviewId===complete.id));assert.equal(pending.drawings[1].status,'已驳回');assert.ok(pending.drawings[1].history[0].reason);const feeDone=c.TODOS.find(t=>t.scenario248&&t.type==='费用订单待办'&&t.status==='已处理');assert.ok(c.ORDERS.some(o=>o[0]===feeDone.order&&o[18].erpRequests.length===1));
});
