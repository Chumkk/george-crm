import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=name=>fs.readFileSync(new URL('../src/compat/runtime/'+name+'.js',import.meta.url),'utf8');
const fixture=fs.readFileSync(new URL('./opportunity-quotes.test.mjs',import.meta.url),'utf8');
const section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
const copy=x=>JSON.parse(JSON.stringify(x));
function setup(){
 const c=Function('vm','source','copy',section(fixture,'function setup(){','function quote(')+';return setup();')(vm,read('opportunityQuotes'),copy);
 Object.assign(c,{projectPmOf:()=> 'PM',quoteSmOf:()=> 'SM',v68Allocation:()=>{},v3LinkDraftTodo:()=>{},v69AttachmentList:files=>files.map(f=>f.name).join(','),skyT:a=>a,q63Description:()=>'',v46Public:x=>x[6]?.publicQuote||{},v125PublicProduct:p=>p.publicQuote||{},openModal:()=>{},v68Modal:(title,body,foot)=>c.modal={title,body,foot},v69UploadHtml:(key,files)=>JSON.stringify({key,files}),selectOpts:(values,selected)=>values.map(v=>'<option>'+v+'</option>').join(''),localStorage:{getItem:()=> '1'},crypto:{randomUUID:()=> 'TOKEN'}});
 c.archiveProject='P';c.feeTodoId='';c.document.addEventListener=()=>{};c.bs131CanMaintain=()=>!c.denied;
 vm.runInContext(section(read('managementWorkflow'),'function mgOpportunityState(', 'function mgProjectState('),c);
 c.bs131AddonOrder=()=>null;
 vm.runInContext(section(read('businessSync'),'function bs131CreateAddon(', 'function bs131OpenAddon('),c);
 c.bs131OpenAddon=()=>{};vm.runInContext(read('designQuotation'),c);return c;
}
function design(c){const row=['DS','项目 · 设计服务 · 设计甲','洽谈中','设计服务','P','北美','客户','设计甲','','','PM','','','¥0','¥0','¥0','¥0','','','',{kind:'design'}];c.OPPS.push(row);return row;}
test('设计加单无需原设计单或备货，承接直接完成并生成PM发起的独立报价待办，重复请求幂等',()=>{
 const c=setup(),source=design(c),before=JSON.stringify(source),added=c.bs131CreateAddon('DS',[],'ADD');
 assert.equal(added[7],'设计甲');assert.equal(added[20].kind,'design');assert.equal(added[20].sourceOppId,'DS');assert.equal(added[20].sourceOrderId,'');
 const accept=c.TODOS.find(t=>t.createdOppId===added[0]),quote=c.TODOS.find(t=>t.type==='报价待办'&&t.opp===added[0]);assert.equal(accept.status,'已处理');assert.equal(quote.status,'待处理');assert.equal(quote.initiator,'PM');assert.equal(quote.sourceTodoId,accept.id);assert.equal(c.ORDERS.length,0);assert.equal(JSON.stringify(source),before);
 assert.equal(c.bs131CreateAddon('DS',[],'ADD')[0],added[0]);assert.equal(c.TODOS.length,2);
 const row=c.dqSaveDesign(added[0],500,{gdsRemark:'新增设计',attachments:[]},true,true);assert.equal(row[2],'设计单');assert.equal(c.V3.meta[row[18].quoteCode].submitted.isAddon,true);assert.equal(c.V3.meta[row[18].quoteCode].submitted.sourceOppId,'DS');
});
test('产品没有原报价或收款也可加单，仍校验采购空间，原商机和范围不改变',()=>{
 const c=setup(),before=JSON.stringify(c.OPPS[0]);c.PROJECT_EXTRA.P.formData.designType='采购方案设计';assert.throws(()=>c.bs131CreateAddon('B',['不存在'],'BAD'),/加单空间/);
 const added=c.bs131CreateAddon('B',['客厅'],'PRODUCT');assert.equal(added[20].sourceOppId,'B');assert.equal(added[20].sourceOrderId,'');assert.equal(JSON.stringify(c.OPPS.find(o=>o[0]==='B')),before);
});
test('设计单提交发布费用附件备注历史，同时传ERP并完成报价待办；再次创建拒绝',()=>{
 const c=setup();design(c);const row=c.dqSaveDesign('DS',1200,{gdsRemark:'客厅设计服务',attachments:[{id:'FILE',name:'相似作品.jpg',url:'https://example.com/sample.jpg'}]},true,true),code=row[18].quoteCode;
 assert.equal(row[2],'设计单');assert.equal(c.oqStatus(code),'已提交');assert.equal(c.V3.meta[code].submitted.designFields.attachments[0].name,'相似作品.jpg');assert.equal(c.PROJECT_QUOTES.P[0].products[0].products[0].publicQuote.description,'客厅设计服务');assert.equal(c.TODOS.find(t=>t.opp==='DS').status,'已处理');assert.equal(row[18].erpRequestedRevision,1);
 assert.throws(()=>c.dqSaveDesign('DS',1200,{},true,true),/已有设计单/);assert.equal(c.ORDERS.length,1);c.oqConfirmQuote(code,1);assert.equal(c.TODOS.find(t=>t.opp==='DS').status,'已处理');
 const history=JSON.stringify(c.V3.meta[code].quoteVersions[0]);c.dqSaveDesign('DS',2000,{gdsRemark:'新内容',attachments:[]},false);assert.equal(row[10],'¥1200');assert.equal(c.oqStatus(code),'已暂存');assert.equal(c.V3.meta[code].submitted.designFields.gdsRemark,'客厅设计服务');assert.equal(JSON.stringify(c.V3.meta[code].quoteVersions[0]),history);
});
test('设计单失败保存回滚总览/报价/附件/待办，产品商机不能创建设计单',()=>{
 const c=setup();design(c);c.fail=true;assert.throws(()=>c.dqSaveDesign('DS',400,{attachments:[{name:'参考.pdf'}]},true,true),/保存失败/);assert.equal(c.ORDERS.length,0);assert.equal(c.TODOS.length,0);assert.equal(Object.keys(c.DRAFT_DATA).length,0);assert.equal(c.PROJECT_QUOTES.P.length,0);
 c.fail=false;assert.throws(()=>c.dqSaveDesign('B',400,{},true,true),/仅设计商机/);assert.throws(()=>c.dqSaveDesign('DS',0,{},true,true),/设计费用/);
});
test('产品与设计商机的费用订单独立于唯一报价及其状态/待办，并保持精确商机关联',()=>{
 const c=setup();design(c);const designRow=c.dqSaveDesign('DS',500,{},true,true),before=JSON.stringify([c.V3,c.TODOS,c.PROJECT_QUOTES]);
 const fee=c.dqCreateFee('DS','P',80,'国内运费','费用备注',[{name:'凭证.pdf'}],'FEE');assert.equal(fee[2],'费用订单');assert.equal(fee[17],'DS');assert.equal(fee[18].quoteCode,undefined);assert.equal(fee[18].attachments[0].name,'凭证.pdf');assert.equal(JSON.stringify([c.V3,c.TODOS,c.PROJECT_QUOTES]),before);assert.equal(c.dqCurrent(c.oqOpp('DS')),designRow);
 assert.equal(c.dqCreateFee('DS','P',80,'国内运费','',[],'FEE')[0],fee[0]);
});
test('费用订单校验及重复保存不生成设计报价，不影响产品唯一报价',()=>{
 const c=setup(),quote=c.oqCreateQuote('B'),fee=c.dqCreateFee('B','P',60,'样板费','',[],'F');assert.equal(c.dqCreateFee('B','P',60,'样板费','',[],'F')[0],fee[0]);assert.equal(c.ORDERS.length,2);assert.equal(c.oqOrder(quote)[18].kind,'product');assert.throws(()=>c.dqCreateFee('B','P',60,'设计费'),/创建设计单/);
 c.fail=true;assert.throws(()=>c.dqCreateFee('B','P',60,'国内运费','',[],'FAILED'),/保存失败/);assert.equal(c.ORDERS.length,2);
});
test('仅独立设计项目开放设计商机分配，确认或拒绝流程保留；旧费用入口打开独立费用表单',()=>{
 const c=setup();for(const type of ['暂无','采购方案设计']){c.PROJECT_EXTRA.P.formData.designType=type;assert.throws(()=>c.dw132CreateOpportunities('P',['设计甲']),/仅独立/);}
 c.PROJECT_EXTRA.P.formData.designType='独立设计服务';c.dw132CreateOpportunities('P',['设计甲'],'','NEW');assert.equal(c.TODOS[0].type,'确认商机');assert.equal(c.TODOS[0].status,'待处理');c.v68Allocation('P');assert.match(c.modal.body,/data-design-person/);assert.match(c.modal.foot,/dw132Allocate/);
 c.openModal('createFee');assert.equal(c.modal.title,'创建费用订单');assert.doesNotMatch(c.modal.body,/设计费|gdsForm|dw132FeeOpp/);c.openModal('summaryExport');assert.equal(c.modal.title,'创建费用订单');
});


