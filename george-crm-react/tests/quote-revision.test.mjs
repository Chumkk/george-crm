import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/compat/runtime/quoteRevision.js',import.meta.url),'utf8');
const legacy=fs.readFileSync(new URL('../src/compat/runtime/workflows.js',import.meta.url),'utf8');
const clone=v=>JSON.parse(JSON.stringify(v));
function fixture(){
 const rooms=[{name:'客厅',cats:['家具']},{name:'主卧',cats:['家具','灯饰']}];
 const data={draftCode:'DR-1',project:'PJ',customer:'客户',tpl:'家具',todoId:'TD',name:'家具报价',spaces:rooms.map(s=>({name:s.name,products:[{name:'桌子',cat:'家具',sku:s.name,qty:1,price:100,amt:100,publicQuote:{description:'描述',remark:'备注',images:[]}}]}))};
 const c={V3:{meta:{}},DRAFTS:[['DR-1','家具报价']],DRAFT_DATA:{'DR-1':clone(data)},PROJECTS:[['PJ','项目','','','','','北美','客户']],PROJECT_EXTRA:{PJ:{handoff:{spaceCats:clone(rooms)}}},PROJECT_QUOTES:{PJ:rooms.map(s=>({space:s.name,dept:s.cats.join('/'),products:[['桌子','家具','100',s.name,1,'100',{draftCode:'DR-1'}]],confirmedCats:['家具']}))},PROJECT_DRAFT_CATS:{},TODOS:[{id:'TD',project:'PJ',type:'报价待办',cat:'家具',status:'已处理',draft:'DR-1',owner:'SM'},{id:'TO',project:'PJ',type:'订单待办',cat:'家具',status:'待处理',draft:'DR-1'}],QUOTE_UI:{fx:{ccy:'USD',rate:7}},v3Copy:clone,v3Stamp:()=> '2026-10-07 12:00',v17Owner:()=> 'SM',qNum:x=>Number(x),v3Cats:d=>[...new Set(d.spaces.flatMap(s=>s.products.map(p=>p.cat)))],v3DraftAmount:d=>d.spaces.flatMap(s=>s.products).reduce((n,p)=>n+p.amt,0),archiveProject:'PJ',page:'drafts',document:{getElementById:()=>null},toast:()=>{},markPagesDirty:()=>{},openPage:()=>{},v3Normalize:clone,quoteSmOf:()=> 'SM',v3LinkDraftTodo:()=>{},v3RebuildDraftQuotes:()=>{},v3Save:()=>true,v3Invalidate:()=>{}};
 c.V3.meta['DR-1']={project:'PJ',categories:['家具'],revision:1,submitted:clone(data),submittedAt:'2026-10-06 09:00',submittedBy:'旧SM',confirmedCats:['家具'],confirmedAt:'2026-10-06 10:00',confirmedBy:'客户',bindings:{},active:true};
 c.v3Meta=code=>c.V3.meta[code];c.findProject=id=>c.PROJECTS.find(p=>p[0]===id);
 c.upsertDraftFromPims=d=>{c.DRAFT_DATA[d.draftCode]=clone(d);return d.draftCode;};
 c.v3Status=m=>m.confirmedCats.length?'已确认':'已提交';
 vm.createContext(c);vm.runInContext(source.slice(0,source.indexOf('const v125OldStatus=')),c);
 vm.runInContext(source.slice(source.indexOf('applyDraftSaved=function(input)'),source.indexOf('function v125SaveProjectWithSpaces')),c);
 return {c,rooms,data};
}
test('submission compares category-space membership, not row order',()=>{
 const {c,data}=fixture();data.spaces.reverse();assert.equal(c.v125SpaceValidation(data),'');
 data.spaces[0].name='其他房间';assert.match(c.v125SpaceValidation(data),/缺少空间：主卧/);assert.match(c.v125SpaceValidation(data),/空间与项目不符：其他房间/);
});
test('legacy project forms recover quoted spaces without changing saved project data or valid form input',()=>{
 const {c}=fixture();delete c.PROJECT_EXTRA.PJ.handoff;const before=clone(c.PROJECT_EXTRA),result=c.v125HydrateProjectForm('PJ',{spaceCats:[],projectName:'现有项目',purchaseCategory:[]});
 assert.deepEqual(result.spaceCats.map(s=>s.name),['客厅','主卧']);assert.ok(result.purchaseCategory.includes('家具'));assert.deepEqual(clone(c.PROJECT_EXTRA),before);
 const edited={spaceCats:[{name:'手工空间',cats:['灯饰']}],projectName:'不覆盖'};assert.deepEqual(clone(c.v125HydrateProjectForm('PJ',edited)),edited);
 c.PROJECT_EXTRA.PJ={handoff:{spaceCats:[]},formData:{spaceCats:[{name:'已保存空间',cats:['石材']}]}};assert.equal(c.v125HydrateProjectForm('PJ',{}).spaceCats[0].name,'已保存空间');
});
test('project save preserves required-field blocking and explains every missing field',()=>{
 const {c}=fixture();c.projectRecordToWizard=()=>({spaceCats:[]});c.wizardFlow='project';c.step='project';c.setFooterHint=(text,missing)=>({text,missing});
 vm.runInContext(source.slice(source.indexOf('const v125ProjectRecordBase='),source.indexOf('const v125OldSave=')),c);
 const hint=c.setFooterHint('',['上传设计效果图','交付经理']);assert.equal(hint.text,'待补齐：上传设计效果图、交付经理');assert.deepEqual([...hint.missing],['上传设计效果图','交付经理']);
 assert.equal(c.setFooterHint('',[]).text,'');assert.equal(c.projectRecordToWizard(['PJ']).spaceCats.length,2);
});
test('duplicate and wrongly allocated spaces are rejected',()=>{
 const {c,data}=fixture();data.spaces[1].name='客厅';assert.match(c.v125SpaceValidation(data),/重复空间/);
 data.spaces[0].products[0].cat='灯饰';assert.match(c.v125SpaceValidation(data),/灯饰空间与项目不符：客厅/);
});
test('reordering project spaces has no effect; renaming identifies affected categories',()=>{
 const {c,rooms}=fixture();assert.deepEqual([...c.v125SpaceImpact('PJ',rooms,rooms.slice().reverse()).affected],[]);
 const after=clone(rooms);after[1].name='主人房';assert.deepEqual([...c.v125SpaceImpact('PJ',rooms,after).affected],['家具','灯饰']);
});
test('renaming resets editable quotations and tasks, preserves products and historical submission names',()=>{
 const {c,rooms}=fixture(),after=clone(rooms),original=clone(c.DRAFT_DATA['DR-1']);after[1].name='主人房';
 c.v125ApplySpaceImpact('PJ',rooms,after);
 const m=c.V3.meta['DR-1'];assert.equal(m.needsSpaceUpdate,true);assert.equal(m.active,false);assert.equal(m.status,'已暂存');assert.equal(m.confirmedCats.length,0);
 assert.deepEqual(clone(c.DRAFT_DATA['DR-1']),original);assert.equal(m.quoteVersions[0].spaces[1].name,'主卧');assert.equal(m.quoteVersions[0].confirmations[0].by,'客户');
 assert.equal(c.TODOS[0].status,'待处理');assert.equal(c.TODOS[1].status,'已取消');assert.deepEqual(c.PROJECT_QUOTES.PJ.map(q=>q.space),['客厅','主人房']);
 assert.equal(c.PROJECT_QUOTES.PJ[1].status,'待更新');
});
test('removing a category cancels unfinished draft and order tasks without deleting history',()=>{
 const {c,rooms}=fixture();c.TODOS[0].status='待处理';const after=[{name:'主卧',cats:['灯饰']}];
 c.v125ApplySpaceImpact('PJ',rooms,after);assert.equal(c.TODOS[0].status,'已取消');assert.equal(c.TODOS[1].status,'已取消');assert.equal(c.V3.meta['DR-1'].quoteVersions.length,1);
});
test('stocking-protected drafts and their tasks are not rewritten by project space changes',()=>{
 const {c,rooms}=fixture();c.V3.meta['DR-1'].bindings={家具:{orderNo:'SO-1',revision:1}};const before=clone(c.V3.meta['DR-1']);
 c.v125ApplySpaceImpact('PJ',rooms,[{name:'新客厅',cats:['家具']}]);assert.deepEqual(clone(c.V3.meta['DR-1']),before);assert.equal(c.TODOS[0].status,'已处理');assert.equal(c.TODOS[1].status,'待处理');
 assert.equal(c.PROJECT_QUOTES.PJ.reduce((sum,q)=>sum+q.amount,0),200);assert.equal(c.PROJECT_QUOTES.PJ.filter(q=>q.lockedOrderSpace).length,2);assert.equal(c.PROJECT_QUOTES.PJ.find(q=>q.space==='客厅').confirmedCats[0],'家具');
});
test('each successful submission creates a separate immutable record; failed writes create none',()=>{
 const {c,data}=fixture();assert.equal(c.applyDraftSaved(data),'DR-1');
 const first=c.V3.meta['DR-1'].quoteVersions;assert.equal(first.length,2);assert.equal(first[0].baseline,true);assert.equal(first[1].revision,2);assert.equal(first[1].submittedBy,'SM');
 data.spaces[0].products[0].price=180;data.spaces[0].products[0].amt=180;
 assert.equal(c.applyDraftSaved(data),'DR-1');assert.equal(c.V3.meta['DR-1'].quoteVersions.length,3);assert.equal(c.V3.meta['DR-1'].quoteVersions[1].spaces[0].products[0].amount,100);assert.equal(c.V3.meta['DR-1'].quoteVersions[2].spaces[0].products[0].amount,180);
 c.v3Save=()=>false;const backup=clone(c.V3.meta);assert.equal(c.applyDraftSaved(data),false);assert.deepEqual(clone(c.V3.meta),backup);
});
test('historical public records exclude internal pricing fields, preserve customer confirmation evidence',()=>{
 const {c}=fixture(),m=c.V3.meta['DR-1'];m.submitted.spaces[0].products[0].costPrice=1;m.submitted.spaces[0].products[0].profit=0.5;
 const version=c.v125Snapshot('DR-1',m);assert.equal(version.spaces[0].products[0].costPrice,undefined);assert.equal(version.spaces[0].products[0].profit,undefined);assert.equal(version.confirmations[0].time,'2026-10-06 10:00');
 c.v125EnsureBaseline('DR-1',m);m.confirmedCats=[];m.submitted.spaces[0].name='改名';assert.equal(m.quoteVersions[0].spaces[0].name,'客厅');assert.equal(m.quoteVersions[0].confirmations.length,1);
});
test('a retried submission request returns the original record and a failed request can be retried',()=>{
 const {c,data}=fixture();data.submissionRequestId='submit-1';c.applyDraftSaved(data);const revision=c.V3.meta['DR-1'].revision,count=c.V3.meta['DR-1'].quoteVersions.length;
 c.applyDraftSaved(data);assert.equal(c.V3.meta['DR-1'].revision,revision);assert.equal(c.V3.meta['DR-1'].quoteVersions.length,count);
 data.submissionRequestId='submit-2';c.v3Save=()=>false;assert.equal(c.applyDraftSaved(data),false);assert.equal(c.V3.meta['DR-1'].quoteVersions.length,count);
 c.v3Save=()=>true;assert.equal(c.applyDraftSaved(data),'DR-1');assert.equal(c.V3.meta['DR-1'].quoteVersions.length,count+1);
});
test('resubmission does not reset another independent draft batch or its order task',()=>{
 const {c,data}=fixture();c.V3.meta['DR-ADDON']={...clone(c.V3.meta['DR-1']),isAddon:true,revision:5};c.TODOS.push({id:'TO-ADDON',project:'PJ',type:'订单待办',cat:'家具',status:'待处理',draft:'DR-ADDON'});
 const prior=clone(c.V3.meta['DR-ADDON']);c.applyDraftSaved(data);assert.deepEqual(clone(c.V3.meta['DR-ADDON']),prior);assert.equal(c.TODOS.find(t=>t.id==='TO-ADDON').status,'待处理');assert.equal(c.TODOS.find(t=>t.id==='TO').status,'已取消');
});
test('explicit add-on batches validate only selected project spaces',()=>{
 const {c,data}=fixture();data.isAddon=true;data.selectedSpaces=['主卧'];data.spaces=data.spaces.filter(s=>s.name==='主卧');assert.equal(c.v125SpaceValidation(data),'');
 data.spaces[0].name='客厅';assert.match(c.v125SpaceValidation(data),/缺少空间：主卧/);assert.match(c.v125SpaceValidation(data),/空间与项目不符：客厅/);
});
test('project changes outside an explicit add-on space selection preserve that batch and its quoted amount',()=>{
 const {c,data,rooms}=fixture();const addon=clone(data);addon.draftCode='DR-ADDON';addon.isAddon=true;addon.selectedSpaces=['客厅'];addon.spaces=addon.spaces.filter(s=>s.name==='客厅');c.DRAFT_DATA['DR-ADDON']=addon;
 c.V3.meta['DR-ADDON']={...clone(c.V3.meta['DR-1']),submitted:clone(addon)};c.TODOS.push({id:'TO-ADDON',project:'PJ',type:'订单待办',cat:'家具',status:'待处理',draft:'DR-ADDON'});c.PROJECT_QUOTES.PJ[0].products.push(['加单椅子','家具','80','ADDON',1,'80',{draftCode:'DR-ADDON'}]);
 const after=clone(rooms);after[1].name='主人房';const prior=clone(c.V3.meta['DR-ADDON']);c.v125ApplySpaceImpact('PJ',rooms,after);
 assert.deepEqual(clone(c.V3.meta['DR-ADDON']),prior);assert.equal(c.TODOS.find(t=>t.id==='TO-ADDON').status,'待处理');assert.equal(c.PROJECT_QUOTES.PJ.find(q=>q.space==='客厅').amount,80);
});
test('inactive historical drafts are not labelled current and unknown historical submitters remain unknown',()=>{
 const {c}=fixture(),m=c.V3.meta['DR-1'];delete m.submittedBy;m.submitted.sm='当前SM';m.active=false;c.v125EnsureBaseline('DR-1',m);const record=c.v125QuoteHistory('PJ')[0];assert.equal(record.current,false);assert.equal(record.submittedBy,'');assert.equal(record.fx.ccy,'CNY');
});
test('history entry is read-only and pricing summary moves into a right-side panel',()=>{
 assert.match(source,/workspace\.append\(side\)/);assert.match(source,/历史版本仅供查阅，不能再次确认或绑定订单/);
 const details=source.slice(source.indexOf('function v125HistoryDetails'),source.indexOf('function v125OpenHistory'));
 assert.doesNotMatch(details,/data-act=.*(?:clientConfirmQuote|confirmBindDraft)/);
});
