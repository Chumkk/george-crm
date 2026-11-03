import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/compat/runtime/orderRevision.js',import.meta.url),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
function boot(state='未执行',integrate=false){
 const opp=['BU1','家具商机','进行中','家具','P1','北美','客户','SM'];
 const order=['SO1','SM','销售订单',state,'家具','业务部','原报价','90%','80%','FOB','¥90','¥10','¥30','¥20','原创建时间','P1','','BU1'];
 const data={draftCode:'D1',project:'P1',todoId:'DT1',sm:'SM',name:'新报价',spaces:[{name:'客厅',products:[{cat:'家具',name:'沙发',qty:2,amt:200}]}]};
 const meta={project:'P1',categories:['家具'],status:'已确认',revision:2,confirmedCats:['家具'],bindings:{家具:{orderNo:'SO1',oppId:'BU1',revision:1}},submitted:copy(data),submittedAt:'2026-10-07 09:00',confirmedAt:'2026-10-07 10:00',confirmedBy:'客户'};
 const c={ORDERS:[order],OPPS:[opp],TODOS:[{id:'DT1',type:'报价待办',owner:'SM',opp:'BU1',project:'P1'},{id:'OT1',type:'订单待办',owner:'SM',opp:'BU1',project:'P1',cat:'家具',status:'待处理'}],DRAFTS:[['D1','新报价']],DRAFT_DATA:{D1:data},V3:{meta:{D1:meta}},actor:'SM',admin:false,saveOk:true,messages:[],calls:[],document:{getElementById:()=>null},
  v3Copy:copy,orderOppOf:o=>o[17],v125DraftLocked:()=>true,v3QuickSave(){},openDraftEditor(){},applyDraftSaved:x=>'submitted:'+x.draftCode,v3BindEligible:()=>[],confirmBindDraft:()=>true,bindDraftHtml:()=>'',bindBindDraftForm(){},v3BindFromDraft(){},
  v3Meta:code=>c.V3.meta[code],v17Owner:()=>c.actor,v21SuperAdmin:()=>c.admin,v21CanOperate:t=>c.admin||t.owner===c.actor,v3Stamp:()=> '2026-10-07 12:00',v3BindAmount:()=>200,qMoney:n=>'¥'+n,v3Save:()=>c.saveOk,markPagesDirty(){},v3Status:m=>m.bindings.家具.revision===m.revision?'已绑定':'已确认',
  v125Backup:()=>copy({data:c.DRAFT_DATA,meta:c.V3.meta}),v125Restore:s=>{c.DRAFT_DATA=s.data;c.V3.meta=s.meta;},upsertDraftFromPims:d=>{c.DRAFT_DATA[d.draftCode]=copy(d);return d.draftCode;},v3LinkDraftTodo(){},v3OldOpenDraft:code=>c.calls.push(code),toast:x=>c.messages.push(x),draftEditorCtx:null};
 vm.createContext(c);
 if(integrate){
  Object.assign(c,{PROJECTS:[['P1','项目','','','','','北美','客户']],PROJECT_EXTRA:{P1:{handoff:{spaceCats:[{name:'客厅',cats:['家具']}]}}},PROJECT_QUOTES:{P1:[{space:'客厅',products:[['沙发','家具','200','S1',2,'100',{draftCode:'D1'}]],confirmedCats:['家具']}]},PROJECT_DRAFT_CATS:{},QUOTE_UI:{fx:{ccy:'CNY',rate:1}},v3Normalize:copy,v3Cats:d=>[...new Set(d.spaces.flatMap(s=>s.products.map(p=>p.cat)))],v3DraftAmount:d=>d.spaces.flatMap(s=>s.products).reduce((n,p)=>n+p.amt,0),v3RebuildDraftQuotes(){},openPage(){},quoteSmOf:()=> 'SM',qNum:x=>Number(String(x).replace('¥','')),addChainTodo:t=>{c.TODOS.push(t);return t;}});
  const quote=fs.readFileSync(new URL('../src/compat/runtime/quoteRevision.js',import.meta.url),'utf8');
  vm.runInContext(quote.slice(0,quote.indexOf('const v125OldStatus='))+quote.slice(quote.indexOf('applyDraftSaved=function(input)'),quote.indexOf('function v125SaveProjectWithSpaces')),c);
 }
 vm.runInContext(source,c);return c;
}
test('草稿绑定以精确订单与明确备货阶段判定，不以有bindings一律锁定或猜测执行中',()=>{
 const c=boot(),m=c.V3.meta.D1;assert.equal(c.v125DraftLocked(m),false);assert.equal(c.v126CanEditDraft('D1'),true);
 for(const status of ['备货中','已备货','已发货','执行中','未知','']){c.ORDERS[0][3]=status;assert.equal(c.v125DraftLocked(m),true,status);}
 c.ORDERS[0][3]='未执行';c.ORDERS[0][17]='OTHER';assert.equal(c.v125DraftLocked(m),true);
 c.ORDERS[0][17]='BU1';c.TODOS.push({type:'备货待办',order:'SO1',status:'待处理'});assert.equal(c.v125DraftLocked(m),true);
});
test('未备货绑定草稿可以保存和提交，bindings保留且保存不隐式修改订单；非SM无权编辑',()=>{
 const c=boot(),before=JSON.stringify(c.ORDERS),bindings=JSON.stringify(c.V3.meta.D1.bindings),source={postMessage:m=>c.messages.push(m)};
 assert.equal(c.v3QuickSave({...c.DRAFT_DATA.D1,name:'已修改'},source),'D1');
 assert.equal(JSON.stringify(c.ORDERS),before);assert.equal(JSON.stringify(c.V3.meta.D1.bindings),bindings);
 assert.equal(c.applyDraftSaved(c.DRAFT_DATA.D1),'submitted:D1');c.openDraftEditor('D1');assert.deepEqual(c.calls,['D1']);
 c.actor='其他';assert.equal(c.v126CanEditDraft('D1'),false);assert.equal(c.v3QuickSave(c.DRAFT_DATA.D1,source),false);assert.equal(c.applyDraftSaved(c.DRAFT_DATA.D1),false);
 c.actor='SM';c.ORDERS[0][3]='备货中';assert.equal(c.v3QuickSave(c.DRAFT_DATA.D1,source),false);assert.equal(c.applyDraftSaved(c.DRAFT_DATA.D1),false);
});
test('显式重新绑定更新自己原订单，编号/创建/履约/收款不变并保留之前报价与操作历史',()=>{
 const c=boot(),opp=c.OPPS[0],task=c.TODOS.find(t=>t.id==='OT1'),old=copy(c.ORDERS[0]);
 const no=c.v126RebindOrder('D1',opp,{commission:20,trade:'CIF'},task),order=c.ORDERS[0];
 assert.equal(no,'SO1');assert.equal(c.ORDERS.length,1);
 for(const index of [0,1,2,3,4,5,12,13,14,15,17])assert.equal(order[index],old[index]);
 assert.equal(order[10],'¥180');assert.equal(order[11],'¥20');assert.equal(order[18].quote.revision,2);
 assert.equal(order[18].quoteUpdates[0].previous.order[10],'¥90');assert.equal(c.V3.meta.D1.bindings.家具.revision,2);assert.equal(c.V3.meta.D1.bindingHistory[0].revision,1);assert.equal(task.status,'已处理');
 assert.throws(()=>c.v126RebindOrder('D1',opp,{commission:20}),/最新已确认/);assert.equal(order[18].quoteUpdates.length,1);
});
test('重绑校验新确认、真实商机关联、权限与持久化失败回滚，不触碰其他订单',()=>{
 for(const mutation of [c=>c.V3.meta.D1.confirmedCats=[],c=>c.V3.meta.D1.needsSpaceUpdate=true,c=>c.V3.meta.D1.bindings.家具.oppId='OTHER',c=>c.ORDERS[0][3]='备货中',c=>c.actor='其他']){
  const c=boot();mutation(c);const before=JSON.stringify({orders:c.ORDERS,meta:c.V3.meta,todos:c.TODOS});
  assert.throws(()=>c.v126RebindOrder('D1',c.OPPS[0],{commission:20}));assert.equal(JSON.stringify({orders:c.ORDERS,meta:c.V3.meta,todos:c.TODOS}),before);
 }
 const c=boot();c.saveOk=false;const before=JSON.stringify({orders:c.ORDERS,opps:c.OPPS,meta:c.V3.meta,todos:c.TODOS});
 assert.throws(()=>c.v126RebindOrder('D1',c.OPPS[0],{commission:20},c.TODOS[1]),/未保存/);assert.equal(JSON.stringify({orders:c.ORDERS,opps:c.OPPS,meta:c.V3.meta,todos:c.TODOS}),before);
});

test('订单待办和加单批次只按明确关联办理，未知备货阶段显示核对提示',()=>{
 const c=boot();assert.equal(c.v126CanOperateOrder(c.OPPS[0],{...c.TODOS[1],opp:'OTHER'}),false);
 c.ORDERS[0][3]='执行中';assert.throws(()=>c.v126RebindOrder('D1',c.OPPS[0],{commission:20}),/状态未明确/);
 c.ORDERS[0][3]='未执行';c.V3.meta.D1.bindings={};c.TODOS[0].opp='';c.OPPS.push(['BU-ADD','加单','进行中','家具','P1','北美','客户','SM']);
 assert.equal(c.v126DraftMatchesOpportunity('D1',c.OPPS[0]),false);assert.equal(c.v126DraftMatchesOpportunity('D1',c.OPPS[1]),false);
 c.TODOS[0].opp='BU-ADD';assert.equal(c.v126DraftMatchesOpportunity('D1',c.OPPS[0]),false);assert.equal(c.v126DraftMatchesOpportunity('D1',c.OPPS[1]),true);
});


test('真实空间变更→旧名拒绝→新名提交保留绑定/历史→新确认后显式更新原订单',()=>{
 const c=boot('未执行',true),oldOrder=JSON.stringify(c.ORDERS),before=c.v125ProjectSpaces('P1'),after=[{name:'会客厅',cats:['家具']}];
 const m=c.V3.meta.D1;m.revision=1;m.bindings.家具.revision=1;
 c.v125ApplySpaceImpact('P1',before,after);c.PROJECT_EXTRA.P1.handoff.spaceCats=after;
 assert.equal(m.needsSpaceUpdate,true);assert.equal(m.status,'已暂存');assert.equal(m.confirmedCats.length,0);assert.equal(JSON.stringify(c.ORDERS),oldOrder);
 const draft=copy(c.DRAFT_DATA.D1);assert.equal(c.applyDraftSaved(draft),false);
 draft.spaces[0].name='会客厅';draft.submissionRequestId='request-2';assert.equal(c.applyDraftSaved(draft),'D1');
 const latest=c.V3.meta.D1;assert.equal(latest.bindings.家具.orderNo,'SO1');assert.equal(latest.bindings.家具.revision,1);assert.equal(latest.quoteVersions[0].spaces[0].name,'客厅');assert.equal(latest.quoteVersions.at(-1).spaces[0].name,'会客厅');assert.equal(JSON.stringify(c.ORDERS),oldOrder);
 assert.equal(c.v126DraftMatchesOpportunity('D1',c.OPPS[0]),false);latest.confirmedCats=['家具'];
 c.v126RebindOrder('D1',c.OPPS[0],{commission:20});assert.equal(c.ORDERS[0][18].quote.contents.spaces[0].name,'会客厅');assert.equal(c.ORDERS[0][18].quoteUpdates[0].previous.quote.spaces[0].name,'客厅');
});
