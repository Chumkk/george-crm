import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/compat/runtime/managementMonitoring.js',import.meta.url),'utf8');
function boot(){
 const o=Array(21).fill('');Object.assign(o,{0:'O',1:'商机',2:'报价中',4:'P',13:'¥1,000',15:'¥600',16:'¥200'});
 const c={PROJECT_EXTRA:{},oqDesignType:v=>v||'暂无',PROJECTS:[['P','项目','','','','','','客户','','当前PM']],OPPS:[o],ORDERS:[],TODOS:[],actor:'SM',qNum:x=>Number(String(x||'').replace(/[^0-9.-]/g,''))||0,qMoney:x=>'¥'+x,esc:String,mgOppRows:()=>c.OPPS,visibleTodos:()=>c.TODOS,crmTodoEnabled:t=>!['订单待办','创建项目待办'].includes(t.type),MG135:{opportunityStates:['待接受','已拒绝','洽谈中','报价中','待下单','交付中','已完成','已输单']},mgOpportunityState:o=>o[2],mgProjectState:()=> '待成交',ptOpportunityTiming:o=>({overdue:!!o[20]?.overdue}),tfDeadline:t=>({overdue:!!t.overdue}),V68_APPROVALS:['跨区域商机审批待办','转介绍商机审批待办'],orderOppOf:o=>o[17],v17Owner:()=>c.actor,v72NotificationEvents:()=>[],v72Go:()=>{c.baseGo=true;},v73TextCard:()=>({}),V72:{messages:[]},v21FlowAllowed:()=>c.allowed!==false,v21CanOperate:()=>false,v75SearchTask:t=>{c.opened=t.id;},toast:m=>{c.toast=m;},document:{addEventListener(){},createElement:()=>({}),head:{appendChild(){}}}};
 vm.createContext(c);vm.runInContext(source,c);return c;
}
test('过程卡片包含关联费用金额，当前范围筛选不修改原数据',()=>{
 const c=boot();c.PROJECTS[0][12]='¥1,000';const extra=Array(21).fill('');Object.assign(extra,{0:'X',2:'已输单',4:'OTHER',13:'¥9,000'});c.OPPS.push(extra);
 c.ORDERS=[{10:'¥8,000',15:'P',17:'O',2:'费用订单'}];c.OPPS[0][20]={overdue:true};
 c.TODOS=[{id:'Q',type:'报价待办',project:'P',opp:'O',status:'待处理'},{id:'R',type:'设计确认待办',project:'P',status:'待处理',overdue:true},{id:'OLD',type:'订单待办',project:'P',status:'待处理'}];
 const before=JSON.stringify([c.PROJECTS,c.OPPS,c.ORDERS,c.TODOS]),d=c.mmScope();assert.equal(d.amount,9000);assert.equal(d.won,8600);assert.equal(d.paid,200);assert.equal(d.overdue,1);assert.equal(d.tasks.length,2);
 const html=c.mmProjectCards();assert.match(html,/暂无设计/);assert.match(html,/洗图报价/);assert.match(html,/项目金额[\s\S]*?¥9000/);assert.match(html,/成单金额[\s\S]*?¥8600/);assert.doesNotMatch(html,/¥8000/);assert.equal(c.mmScope([]).amount,0);assert.equal(JSON.stringify([c.PROJECTS,c.OPPS,c.ORDERS,c.TODOS]),before);
});
function quotation(c){const row=Array(19).fill('');Object.assign(row,{0:'ORDER',15:'P',17:'O',18:{quoteCode:'QUOTE'}});c.ORDERS.push(row);return {id:'TASK',type:'报价待办',project:'P',opp:'O',customer:'客户',owner:'当前PM',initiator:'旧PM',cat:'家具',status:'待处理',draft:'QUOTE'};}
test('同人办理及客户确认同次发生时仍单独通知当前 PM 完成，关联原报价待办和真实版本',()=>{
 const c=boot(),t=quotation(c),after={...t,status:'已处理',completionReason:'已确认报价',order:'ORDER',quoteRevision:3,approver:'实际SM'};
 const events=c.mmQuotationResultEvents({todos:{TASK:t}},{todos:{TASK:after}},[{event:'todo-result',task:'TASK',recipient:'当前PM'},{event:'quote-confirmed',task:'TASK',recipient:'当前PM'}]);
 assert.equal(events.filter(m=>m.event==='quote-erp-requested').length,1);const m=events.find(m=>m.event==='quote-erp-requested');assert.equal(m.recipient,'当前PM');assert.equal(m.initiator,'实际SM');assert.equal(m.revision,3);assert.equal(m.task,'TASK');assert.equal(m.target,'todo');assert.match(m.body,/请求/);assert.equal(events.filter(m=>m.event==='quote-confirmed').length,1);
 assert.equal(c.mmQuotationResultEvents({todos:{TASK:after}},{todos:{TASK:after}},[]).length,0);
});
test('保存或发布不发完成通知，关联错误不发送，重新报价确认按新版本通知',()=>{
 const c=boot(),t=quotation(c);assert.equal(c.mmQuotationResultEvents({todos:{TASK:t}},{todos:{TASK:t}},[]).length,0);
 const done={...t,status:'已处理',completionReason:'已确认报价',order:'ORDER',quoteRevision:4};assert.equal(c.mmQuotationResultEvents({todos:{TASK:t}},{todos:{TASK:done}},[])[0].revision,4);
 c.ORDERS[0][17]='OTHER';assert.equal(c.mmQuotationResultEvents({todos:{TASK:t}},{todos:{TASK:done}},[]).length,0);
});
test('完成通知定位同一报价待办且保留权限校验，不进入订单或其他商机',()=>{
 const c=boot(),t=quotation(c);c.TODOS.push(t);c.V72.messages.push({id:'N',event:'quote-erp-requested',task:'TASK',project:'P',opp:'O'});c.v72Go('N');assert.equal(c.opened,'TASK');assert.equal(c.baseGo,undefined);c.allowed=false;c.opened='';c.v72Go('N');assert.equal(c.opened,'');assert.match(c.toast,/无权/);
});
test('设计确认待办有 PM 通知类型，设计成果及审核结果通知正确角色',()=>{
 const c=boot(),t={id:'R',type:'设计确认待办',project:'P',owner:'当前PM',initiator:'设计师',status:'待处理'};
 const events=c.v72NotificationEvents({todos:{}},{todos:{R:t}});assert.deepEqual(events,[]);
 const workflow=fs.readFileSync(new URL('../src/compat/runtime/workflows.js',import.meta.url),'utf8');assert.match(workflow,/V72_TYPES=\{[^\n]*'设计确认待办':'pm'/);
 const roles=JSON.parse(fs.readFileSync(new URL('../src/features/notifications/roles.json',import.meta.url),'utf8'));assert.match(roles.find(r=>r.role==='项目经理 PM').events,/报价任务完成/);assert.ok(roles.some(r=>r.role==='运营人员'));
});
test('驳回保留原待办与本次原因，原设计师或发起人收到一条通知，同人办理不漏发',()=>{
 const c=boot();
 for(const [type,initiator] of [['设计确认待办','设计师'],['确认商机','当前PM'],['跨区域商机审批待办','当前PM'],['转介绍商机审批待办','当前PM'],['设计待办','当前PM'],['费用订单待办','当前PM']]){
  const before={id:'REJECT',type,project:'P',initiator,owner:initiator,status:'待处理'},after={...before,status:'已驳回',rejectReason:'本次缺少附件',approver:'实际处理人'};
  const messages=c.mmRejectionEvents({todos:{REJECT:before}},{todos:{REJECT:after}},[{event:'todo-result',task:'REJECT',recipient:initiator,rejectReason:'旧原因'}]);
  assert.equal(messages.length,1);const m=messages[0];assert.equal(m.recipient,initiator);assert.equal(m.task,'REJECT');assert.equal(m.target,'todo');assert.equal(m.rejectReason,'本次缺少附件');assert.equal(m.initiator,'实际处理人');
  after.rejectReason='后来改动';assert.equal(m.rejectReason,'本次缺少附件');assert.equal(c.mmRejectionEvents({todos:{REJECT:after}},{todos:{REJECT:after}},[]).length,0);
 }
});
test('查看待办按项目与商机准确关联，不混入别的品类、加单或退休任务，并保留只读权限',()=>{
 const c=boot();c.OPPS.push(Object.assign(Array(21).fill(''),{0:'ADD',4:'P',20:{isAddon:true}}));
 c.TODOS=[{id:'OWN',type:'报价待办',project:'P',opp:'O',status:'已处理'},{id:'ADD',type:'报价待办',project:'P',opp:'ADD'},{id:'OTHER',type:'报价待办',project:'OTHER',opp:'O'},{id:'FEE',type:'费用订单待办',project:'P',order:'F'},{id:'OLD',type:'订单待办',project:'P',opp:'O'}];
 const row=Array(19).fill('');Object.assign(row,{0:'F',15:'P',17:'O'});c.ORDERS.push(row);
 assert.deepEqual(Array.from(c.mmRelatedTasks('P','O'),t=>t.id),['OWN','FEE']);assert.deepEqual(Array.from(c.mmRelatedTasks('P','ADD'),t=>t.id),['ADD']);assert.equal(c.mmRelatedTasks('OTHER','MISSING').length,0);
 c.allowed=false;assert.equal(c.mmRelatedTasks('P','O').length,0);
});
test('前置商机只关联原确认待办，卡片筛选不改变商机金额及业务数据',()=>{
 const c=boot(),pre=Object.assign(Array(21).fill(''),{0:'pending:A',2:'待接受',4:'P',20:{preliminaryTask:'A'}});c.OPPS.push(pre);
 c.TODOS=[{id:'A',type:'确认商机',project:'P',status:'待处理'},{id:'Q',type:'报价待办',project:'P',opp:'O',status:'待处理'}];
 const before=JSON.stringify([c.OPPS,c.TODOS]);assert.deepEqual(Array.from(c.mmRelatedTasks('P','pending:A'),t=>t.id),['A']);assert.equal(c.mmProgressMatches(pre,'amount'),false);assert.equal(c.mmProgressMatches(pre,'pending'),true);assert.equal(c.mmProgressMatches(c.OPPS[0],'won'),true);assert.equal(c.mmProgressMatches(c.OPPS[0],'tasks'),true);assert.equal(c.mmProgressMatches(c.OPPS[0],'overdue'),false);assert.equal(JSON.stringify([c.OPPS,c.TODOS]),before);
});
test('查看待办清空旧编码搜索，以记录 ID 集合进入而不新建任务或恢复旧流程',()=>{
 const c=boot();Object.assign(c,{V18:{},V21:{},WK:{},todoSearch:'OLD-CODE',todoQuick:'today',todoProject:'OTHER',todoFilter:'报价待办',todoStatus:'待处理',ptCloseProjectProgress(){},v21Manager:()=>true,v21ScopeName:()=> '全部人员',markPagesDirty(){},openPage:p=>{c.page=p;}});
 const rows=[{id:'A',type:'设计待办',project:'P'},{id:'A',type:'设计待办',project:'P'},{id:'OLD',type:'订单待办',project:'P'}];c.mmOpenTasks(rows,'本项目','项目管理');assert.equal(c.page,'todos');assert.equal(c.todoSearch,'');assert.equal(c.todoQuick,'');assert.equal(c.todoProject,'');assert.equal(c.todoStatus,'全部');assert.deepEqual(Array.from(c.V18.context.ids),['A']);assert.equal(c.WK.sort,'recent');
});
test('统计卡片可键盘操作，筛选栏固定且移除独立超时按钮，教程使用统一查看待办入口',()=>{
 const c=boot();assert.match(c.mmCard('待设计',2),/<button type="button"[^>]*data-act="mmMetric" data-mm-key="design"/);assert.match(c.mmCard('成单金额','¥600'),/data-mm-key="won"/);
 const progress=fs.readFileSync(new URL('../src/compat/runtime/progressTracking.js',import.meta.url),'utf8');assert.match(progress,/pt-progress-toolbar\{position:sticky;top:0;z-index:9/);assert.doesNotMatch(progress,/仅看超过 10 天<\/label>/);
 const tutorial=fs.readFileSync(new URL('../src/features/tutorial/dom.js',import.meta.url),'utf8');assert.match(tutorial,/case "created"[^\n]*mmViewTasks/);assert.doesNotMatch(tutorial,/mgViewDesign/);
});

test('卡片再次点击取消选中，切换指标替换旧选择且图标不干扰名称',()=>{
 const c=boot();assert.equal(c.mmNextCardSelection(null,'won'),'won');assert.equal(c.mmNextCardSelection({key:'won'},'won'),null);assert.equal(c.mmNextCardSelection({key:'won'},'amount'),'amount');
 const html=c.mmCard('成单金额','¥600');assert.match(html,/class="mm-card-icon"[\s\S]*aria-hidden="true"/);assert.match(html,/data-mm-title>成单金额/);assert.doesNotMatch(html,/mm-card-selected/);assert.match(html,/aria-label="成单金额 ¥600"/);
});

test('项目金额和超时卡片筛选本项目，不跳往商机列表且取消后恢复范围',()=>{
 const c=boot();c.PROJECTS.push(['EMPTY','没有商机项目']);c.mgOppRows=p=>c.OPPS.filter(o=>!p||o[4]===p);c.OPPS[0][20]={overdue:true};
 assert.equal(c.mmProjectMatches(c.PROJECTS[0],'amount'),true);assert.equal(c.mmProjectMatches(c.PROJECTS[1],'amount'),false);assert.equal(c.mmProjectMatches(c.PROJECTS[0],'overdue'),true);assert.equal(c.mmProjectMatches(c.PROJECTS[1],'overdue'),false);
 const section={querySelector:()=>({value:'全部'})},button={dataset:{mmKey:'amount'},closest:sel=>sel==='#ptProgressMask'?null:sel==='.page'?section:{dataset:{mmCards:'projects'}},querySelector:()=>({textContent:'商机金额'})};
 c.V18={};c.mmApplyManagementFilter=()=>{};c.openPage=p=>{c.openedPage=p;};c.mmMetricAction(button);assert.equal(c.openedPage,undefined);assert.equal(vm.runInContext('MM164.filters.projects.key',c),'amount');c.mmMetricAction(button);assert.equal(vm.runInContext('MM164.filters.projects',c),null);
});

test('统一项目待办卡片以项目号进入全部类型，返回后仍可取消选中',()=>{
 const c=boot(),section={querySelector:()=>({value:'全部'})},button={dataset:{mmKey:'tasks'},closest:sel=>sel==='#ptProgressMask'?null:sel==='.page'?section:{dataset:{mmCards:'projects'}},querySelector:()=>({textContent:'待处理待办'})};
 c.TODOS=[{id:'DESIGN',type:'设计待办',project:'P',status:'待处理'},{id:'OTHER',type:'报价待办',project:'P',status:'已处理'}];c.V18={};c.mmApplyManagementFilter=()=>c.PROJECTS;c.mmOpenTasks=(rows,label,source,query)=>{c.taskIds=rows.map(t=>t.id);c.query=query;c.V18.context={};};
 c.mmMetricAction(button);assert.deepEqual(Array.from(c.taskIds),['DESIGN','OTHER']);assert.equal(c.query,'P');assert.equal(c.V18.context.cardKey,'tasks');assert.equal(c.mmProjectMatches(c.PROJECTS[0],'design'),true);c.mmMetricAction(button);assert.equal(c.V18.context,null);assert.equal(vm.runInContext('MM164.filters.projects',c),null);
});

test('BU 快捷搜索准确关联商机、加单、费用和承接记录，多编码按或匹配，不借同品类任务',()=>{
 const c=boot();c.OPPS[0][0]='BU001';c.OPPS[0][20]={approvalTodo:'ACCEPT'};c.OPPS.push(Object.assign(Array(21).fill(''),{0:'BU002',4:'P'}));
 const fee=Object.assign(Array(19).fill(''),{0:'FEE',15:'P',17:'BU001'});c.ORDERS=[fee];
 const original={id:'QUOTE',type:'报价待办',project:'P',opp:'BU001'},addon={id:'ADD',type:'报价待办',project:'P',opp:'BU002'},accept={id:'ACCEPT',type:'确认商机',project:'P'},expense={id:'EXP',type:'费用订单待办',project:'P',order:'FEE'};c.TODOS=[original,addon,accept,expense];
 assert.equal(c.mmIdentifierSearch(original,'BU001'),true);assert.equal(c.mmIdentifierSearch(addon,'BU001'),false);assert.equal(c.mmIdentifierSearch(accept,'bu001'),true);assert.equal(c.mmIdentifierSearch(expense,'BU001'),true);assert.equal(c.mmIdentifierSearch(addon,'BU001 | BU002'),true);assert.equal(c.mmIdentifierSearch(original,'BU0010'),false);assert.equal(c.mmIdentifierSearch(original,'家具'),null);
 assert.equal(c.mmScopeQuery('opps',c.OPPS),'');assert.deepEqual(Array.from(c.mmScopeTasks('opps',[c.OPPS[0]]),t=>t.id),['QUOTE','ACCEPT','EXP']);
});

test('两类管理各有一个统一待办卡片，设计报价仍筛选项目，BU 待办卡片只使用当前显示的商机',()=>{
 const c=boot();c.OPPS[0][0]='BU001';c.TODOS=[{id:'Q',type:'报价待办',project:'P',opp:'BU001',status:'待处理'},{id:'R',type:'设计确认待办',project:'P',status:'待处理'}];
 assert.equal((c.mmProjectCards().match(/data-mm-key="tasks"/g)||[]).length,1);assert.equal((c.mmOpportunityCards().match(/data-mm-key="tasks"/g)||[]).length,1);assert.equal(c.mmProjectMatches(c.PROJECTS[0],'review'),true);assert.equal(c.mmProjectMatches(c.PROJECTS[0],'design'),false);
 const section={querySelector:()=>({value:'全部'})},button={dataset:{mmKey:'tasks'},closest:sel=>sel==='#ptProgressMask'?null:sel==='.page'?section:{dataset:{mmCards:'opps'}}};c.V18={};c.mmApplyManagementFilter=()=>c.OPPS;c.mmOpenTasks=(rows,label,source,query)=>{c.query=query;c.ids=rows.map(t=>t.id);c.V18.context={};};c.mmMetricAction(button);assert.equal(c.query,'BU001');assert.deepEqual(Array.from(c.ids),['Q']);
});

test('快捷搜索编码实际写入待办中心，类型与状态均可切换且不修改业务记录',()=>{
 const c=boot();Object.assign(c,{V18:{},V21:{},WK:{},ptCloseProjectProgress(){},v21Manager:()=>true,v21ScopeName:()=> '全部人员',markPagesDirty(){},openPage(){}});
 const before=JSON.stringify(c.TODOS);c.mmOpenTasks([],'商机相关待办','商机管理卡片','BU001 | BU002');assert.equal(c.todoSearch,'BU001 | BU002');assert.equal(c.todoFilter,'全部');assert.equal(c.todoStatus,'全部');assert.equal(JSON.stringify(c.TODOS),before);
});

test('项目三种设计类型独立筛选，项目金额使用登记值并随结果更新',()=>{
 const c=boot();c.PROJECTS[0][12]='¥2,000';const second=['P2','项目2'];second[12]='3–5 万美元';c.PROJECTS.push(second);c.PROJECT_EXTRA.P={formData:{designType:'采购方案设计'}};c.PROJECT_EXTRA.P2={formData:{designType:'独立设计服务'}};
 assert.equal(c.mmProjectMatches(c.PROJECTS[0],'procurementDesign'),true);assert.equal(c.mmProjectMatches(c.PROJECTS[0],'noneDesign'),false);assert.equal(c.mmProjectMatches(second,'independentDesign'),true);assert.equal(c.mmProjectAmount(second),0);
 const html=c.mmProjectCards(c.PROJECTS,[second]);assert.match(html,/项目金额[\s\S]*?¥0/);assert.match(html,/成单金额[\s\S]*?¥0/);assert.match(html,/mm-money-cards/);assert.equal((html.match(/data-act="mmMetric"/g)||[]).length,8);
 const first=c.mmProjectCards(c.PROJECTS,[c.PROJECTS[0]]);assert.match(first,/项目金额[\s\S]*?¥2000/);assert.match(first,/成单金额[\s\S]*?¥600/);
});

test('商机阶段分开统计和筛选，金额仅汇总当前结果而非所有商机',()=>{
 const c=boot();const second=Object.assign(Array(21).fill(''),{0:'BU002',4:'P',2:'洽谈中',13:'¥5,000',15:'¥2,000',16:'¥100'});c.OPPS.push(second);
 assert.equal(c.mmProgressMatches(c.OPPS[0],'quoting'),true);assert.equal(c.mmProgressMatches(second,'quoting'),false);assert.equal(c.mmProgressMatches(second,'negotiating'),true);second[2]='已完成';assert.equal(c.mmProgressMatches(second,'completed'),true);
 const html=c.mmOpportunityCards(c.OPPS,[c.OPPS[0]]);for(const title of ['待接收','洽谈中','报价中','待下单','交付中','已完成','待处理待办','停留超10天','商机金额','成单金额'])assert.match(html,new RegExp('data-mm-title>'+title));assert.match(html,/商机金额[\s\S]*?¥1000/);assert.doesNotMatch(html,/¥6000|¥2600/);assert.equal((html.match(/data-act="mmMetric"/g)||[]).length,10);
});

test('批量关联范围不再往快捷搜索栏拼编号，单条仍使用精确项目号或 BU 号',()=>{
 const c=boot();assert.equal(c.mmScopeQuery('projects',[['PJ001'],['PJ002']]),'');assert.equal(c.mmScopeQuery('projects',[['PJ001']]),'PJ001');assert.equal(c.mmScopeQuery('opps',[['BU001'],['BU002']]),'');assert.equal(c.mmScopeQuery('opps',[['BU001']]),'BU001');
});

test('手动新搜索替换旧关联范围，跳转传入的新范围可明确保留',()=>{
 const bridge=fs.readFileSync(new URL('../src/compat/runtime/bridge.js',import.meta.url),'utf8'),start=bridge.indexOf('    todoUpdate(values) {'),end=bridge.indexOf('    todoScope(value)',start),method=bridge.slice(start,end).trim().replace(/,$/,'');
 const c={V18:{context:{ids:['OLD']}},taskRelation:{context:{},value:'initiated'},todoSearch:'TD159 | TD155',todoFilter:'报价待办',todoStatus:'全部',WK:{},V21:{},openPage:()=>{}};vm.createContext(c);vm.runInContext(`const api={${method}};this.update=api.todoUpdate;`,c);
 c.update({query:'BU001'});assert.equal(c.todoSearch,'BU001');assert.equal(c.V18.context,null);assert.equal(c.taskRelation.context,null);assert.equal(c.taskRelation.value,'all');assert.equal(c.todoFilter,'报价待办');
 c.V18.context={ids:['NEW']};c.update({query:'PJ002',keepContext:true,filter:'全部',status:'全部'});assert.equal(c.todoSearch,'PJ002');assert.deepEqual(c.V18.context.ids,['NEW']);
});

test('待处理卡片进入待办中心时默认待处理，分类仍为全部且不删除历史关联',()=>{
 const c=boot();Object.assign(c,{V18:{},V21:{},WK:{},ptCloseProjectProgress(){},v21Manager:()=>true,v21ScopeName:()=> '全部人员',window:{GeorgeRuntime:{todoUpdate:values=>{c.values=values;}}}});
 const rows=[{id:'PENDING',type:'报价待办',project:'P',status:'待处理'},{id:'DONE',type:'设计待办',project:'P',status:'已处理'}];c.mmOpenTasks(rows,'项目相关待办','项目管理卡片','PJ001','待处理');assert.equal(c.todoStatus,'待处理');assert.equal(c.todoFilter,'全部');assert.equal(c.values.status,'待处理');assert.equal(c.values.filter,'全部');assert.deepEqual(Array.from(c.V18.context.ids),['PENDING','DONE']);assert.equal(c.values.keepContext,true);
 const cardCall=source.match(/const result=mmOpenTasks\(tasks,[^\n]+/)[0];assert.match(cardCall,/query,'待处理',/);
});

function fee(id,project,opp,amount,paid='-') {const row=Array(19).fill('');Object.assign(row,{0:id,2:'费用订单',10:amount,13:paid,15:project,17:opp,18:{kind:'fee'}});return row;}
test('费用金额按订单去重，项目费用不进入其他商机，项目汇总包含两种入口',()=>{
 const c=boot();c.PROJECTS[0][12]='¥1,000';const second=[...c.OPPS[0]];Object.assign(second,{0:'O2',13:'¥2,000',15:'¥0',16:'¥0'});c.OPPS.push(second);
 const a=fee('F1','P','O','¥300','¥100');c.ORDERS=[a,[...a],fee('F2','P','','¥200','¥20'),fee('F3','P','O2','¥50'),fee('FOREIGN','OTHER','O','¥999')];
 const before=JSON.stringify([c.PROJECTS,c.OPPS,c.ORDERS]);
 assert.deepEqual({...c.mmOpportunityMoney(c.OPPS[0])},{amount:1300,won:900,paid:300});
 assert.deepEqual({...c.mmOpportunityMoney(second)},{amount:2050,won:50,paid:0});
 assert.deepEqual({...c.mmProjectMoney(c.PROJECTS[0])},{amount:1550,won:1150,paid:320});
 assert.equal(c.mmScope(c.PROJECTS,[c.OPPS[0]]).amount,1300);assert.equal(c.mmScope(c.PROJECTS,[]).amount,0);
 assert.equal(c.mmScope([],c.OPPS,true).won,0);assert.equal(c.mmScope(c.PROJECTS,undefined,true).won,1150);
 assert.equal(JSON.stringify([c.PROJECTS,c.OPPS,c.ORDERS]),before);
});
test('仅费用订单项目和商机也计入金额；ERP等待、失败或付款不改变费用创建金额',()=>{
 const c=boot();c.PROJECTS[0][12]='预算范围';c.OPPS[0][13]=c.OPPS[0][15]=c.OPPS[0][16]='-';const f=fee('F','P','O','¥88.50');c.ORDERS.push(f);
 for(const status of ['等待ERP回执','传输失败','未执行','已完成']){f[3]=status;assert.equal(c.mmOpportunityMoney(c.OPPS[0]).amount,88.5);assert.equal(c.mmOpportunityMoney(c.OPPS[0]).won,88.5);assert.equal(c.mmOpportunityMoney(c.OPPS[0]).paid,0);}
 f[13]='¥20.10';assert.equal(c.mmProjectMoney(c.PROJECTS[0]).paid,20.1);assert.equal(c.mmProjectAmount(c.PROJECTS[0]),88.5);assert.equal(c.mmProgressMatches(c.OPPS[0],'amount'),true);assert.equal(c.mmProgressMatches(c.OPPS[0],'won'),true);
});
