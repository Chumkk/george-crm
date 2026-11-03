import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/compat/runtime/managementWorkflow.js',import.meta.url),'utf8');
function runtime(){
 const opp=(id,cat,design=false,addon=false)=>Object.assign(Array(21).fill(''),{0:id,3:cat,20:{kind:design?'design':'product',isAddon:addon}});
 const c={OPPS:[opp('A','家具'),opp('B','灯饰'),opp('D','设计服务',true,true)],DRAFT_DATA:{Q1:{opp:'A'},Q2:{opp:'B'},QD:{opp:'D'}},V3:{meta:{Q1:{revision:2,currentQuoteVersion:'V2',submitted:{},confirmedCats:['家具'],confirmationHistory:[{revision:1,confirmedCats:['家具'],confirmedAt:'旧时间'},{revision:2,versionId:'V2',confirmedCats:['家具'],confirmedAt:'2026-10-12 14:00'}]},Q2:{revision:1,submitted:{},confirmedCats:[]},QD:{revision:3,submitted:{},confirmedCats:[]}}}};
 c.oqOrder=code=>c.DRAFT_DATA[code]?Object.assign(Array(19).fill(''),{18:{quoteCode:code}}):null;
 c.oqQuoteOpp=code=>c.OPPS.find(o=>o[0]===c.DRAFT_DATA[code]?.opp);
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function mgCreatedNewest('),source.indexOf('function mgOppActions(')),c);return c;
}
test('管理排序按创建时间倒序，不改源数组，同时间稳定，未知创建时间置后',()=>{
 const c=runtime(),rows=[['old','2026-09-01 10:00'],['unknown','-'],['new','2026-10-12 10:00'],['same','2026-10-12 10:00'],['invalid','错误']],before=JSON.stringify(rows);
 assert.deepEqual(Array.from(c.mgCreatedNewest(rows,1),r=>r[0]),['new','same','old','unknown','invalid']);assert.equal(JSON.stringify(rows),before);
});
test('报价待办客户确认来自精确关联报价的当前版本，其他品类与加单互不混淆',()=>{
 const c=runtime(),a=c.mgTaskBusinessInfo({type:'报价待办',opp:'A',draft:'Q1',cat:'家具'}),b=c.mgTaskBusinessInfo({type:'报价待办',opp:'B',draft:'Q2',cat:'灯饰'}),d=c.mgTaskBusinessInfo({type:'报价待办',opp:'D',draft:'QD'});
 assert.equal(a.label,'家具');assert.equal(a.customerStatus,'已确认');assert.equal(a.revision,2);assert.equal(a.confirmedAt,'2026-10-12 14:00');assert.equal(b.customerStatus,'未确认');assert.equal(d.label,'设计单报价');assert.equal(d.scope,'加单');
 c.V3.meta.Q1.workingSaved=true;assert.equal(c.mgTaskBusinessInfo({type:'报价待办',opp:'A',draft:'Q1',cat:'家具'}).customerStatus,'已确认');
 c.V3.meta.Q1.confirmedCats=[];c.V3.meta.Q1.revision=3;assert.equal(c.mgTaskBusinessInfo({type:'报价待办',opp:'A',draft:'Q1',cat:'家具'}).customerStatus,'未确认');
 c.V3.meta.Q1.needsSpaceUpdate=true;assert.equal(c.mgTaskBusinessInfo({type:'报价待办',opp:'A',draft:'Q1',cat:'家具'}).customerStatus,'待更新，需重新确认');
});
test('商机邀请显示品类或设计，未建立报价不借用其他记录的确认',()=>{
 const c=runtime();assert.equal(c.mgTaskBusinessInfo({type:'确认商机',allocation:{cat:'门窗'}}).label,'门窗');assert.equal(c.mgTaskBusinessInfo({type:'确认商机',designOpportunity:true}).label,'设计服务');
 assert.equal(c.mgTaskBusinessInfo({type:'报价待办',opp:'missing',cat:'家具'}).customerStatus,'尚未发布');assert.equal(c.mgTaskBusinessInfo({type:'项目待办'}),null);
});

test('名称右侧只提供品类、加单、已报价或已确认标签，未发布/保存不冒充已报价',()=>{
 const c=runtime(),info=()=>c.mgTaskBusinessInfo({type:'报价待办',opp:'A',draft:'Q1',cat:'家具'});assert.equal(info().scope,'');assert.equal(info().quoteStatus,'已确认');c.V3.meta.Q1.confirmedCats=[];assert.equal(info().quoteStatus,'已提交');c.V3.meta.Q1.workingSaved=true;assert.equal(info().quoteStatus,'');c.V3.meta.Q1.workingSaved=false;c.V3.meta.Q1.needsSpaceUpdate=true;assert.equal(info().quoteStatus,'');delete c.V3.meta.Q1.submitted;assert.equal(info().quoteStatus,'');
 assert.equal(c.mgTaskBusinessInfo({type:'确认商机',opp:'D'}).scope,'加单');
 const jsx=fs.readFileSync(new URL('../src/features/todos/TodoCenter.jsx',import.meta.url),'utf8');const title=jsx.slice(jsx.indexOf('className="rx-task-title"'),jsx.indexOf('task.subject !=='));assert.match(title,/businessInfo.label/);assert.match(title,/businessInfo.quoteStatus/);assert.doesNotMatch(jsx,/V\$\{|rx-task-business|客户确认 ·/);
});
