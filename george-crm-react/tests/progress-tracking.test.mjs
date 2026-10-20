import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const tracking=fs.readFileSync(new URL('../src/compat/runtime/progressTracking.js',import.meta.url),'utf8');
const management=fs.readFileSync(new URL('../src/compat/runtime/managementWorkflow.js',import.meta.url),'utf8');
const crm=fs.readFileSync(new URL('../src/compat/runtime/crm.js',import.meta.url),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
const functions=management.slice(management.indexOf('function mgOpportunityState('),management.indexOf('function mgOppActions('));
const opp=(id='O',category='家具')=>[id,'住宅-'+category,'进行中',category,'P','北美','客户','SM'];
function setup(data={}) {
 const clock={now:Date.parse('2026-10-10T04:00:00Z')};
 class ClockDate extends Date {constructor(...args){super(...(args.length?args:[clock.now]));}static now(){return clock.now;}}
 const c={Date:ClockDate,OPPS:data.OPPS||[opp()],TODOS:data.TODOS||[],ORDERS:data.ORDERS||[],PROJECTS:[['P','住宅项目','','','','','北美','客户','','PM']],PROJECT_EXTRA:{P:{formData:{purchaseCategory:['家具','灯饰']}}},
  MG135:{opportunityStates:['待接受','已拒绝','洽谈中','报价中','待下定','待下单','交付中','已完成','已输单']},document:{createElement:()=>({}),getElementById:()=>null,querySelector:()=>null,head:{appendChild(){}},addEventListener(){}},
  esc:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),tag:String,orderOppOf:o=>o[17],mgInvitationName:t=>'住宅-'+t.cat,
  handleAct:button=>{c.opened=button.dataset;},v3Save:()=>{if(c.throws)throw Error('保存失败');if(c.fail)return false;c.saved=copy({OPPS:c.OPPS,TODOS:c.TODOS,ORDERS:c.ORDERS});return true;},
  visibleTodos:()=>c.TODOS,v21CanOperate:t=>t.owner==='SM',v21FlowAllowed:t=>!c.forbidden,v75SearchTask:t=>{c.openedTask=t.id;},toast:message=>{c.toast=message;}};
 vm.createContext(c);vm.runInContext(functions,c);vm.runInContext(tracking,c);return {c,clock};
}
function quote(c){const row=Array(19).fill('');row[2]='报价单';row[15]='P';row[17]='O';row[18]={quoteCode:'Q'};c.ORDERS.push(row);return row;}

test('历史状态缺少进入时间时不以创建日期或观察时间伪造停留',()=>{
 const old=opp();old[18]='2000-01-01 00:00';const {c,clock}=setup({OPPS:[old]});
 assert.equal(c.ptOpportunityTiming(old).known,false);assert.equal(c.ptOpportunityTiming(old).overdue,false);c.v3Save();
 assert.equal(old[20].stageTracking.enteredAt,'');clock.now+=100*86400000;assert.equal(c.ptOpportunityTiming(old).label,'未记录');
});
test('新商机保存、重开保持计时，负责人及报价内容编辑不重置，状态推进才重置',()=>{
 const {c,clock}=setup({OPPS:[]});c.OPPS.push(opp());c.v3Save();const entered=c.OPPS[0][20].stageTracking.enteredAt;
 clock.now+=2*86400000;c.OPPS[0][7]='接任SM';c.v3Save();assert.equal(c.OPPS[0][20].stageTracking.enteredAt,entered);
 const {c:reopened}=setup(c.saved);assert.equal(reopened.OPPS[0][20].stageTracking.enteredAt,entered);
 const row=quote(c);c.v3Save();const quoted=c.OPPS[0][20].stageTracking.enteredAt;assert.notEqual(quoted,entered);assert.equal(c.ptOpportunityTiming(c.OPPS[0]).state,'报价中');
 clock.now+=86400000;row[10]='¥1000';row[13]='¥999';c.v3Save();assert.equal(c.OPPS[0][20].stageTracking.enteredAt,quoted);
 row[18].erpRequestedRevision=1;c.v3Save();assert.equal(c.ptOpportunityTiming(c.OPPS[0]).state,'待下单');assert.notEqual(c.OPPS[0][20].stageTracking.enteredAt,quoted);
});
test('10天边界严格按当前阶段经过时间计算，正常结束不继续产生超时标记',()=>{
 const {c,clock}=setup({OPPS:[]});c.OPPS.push(opp());c.v3Save();clock.now+=10*86400000;assert.equal(c.ptOpportunityTiming(c.OPPS[0]).overdue,false);
 clock.now+=60000;assert.equal(c.ptOpportunityTiming(c.OPPS[0]).overdue,true);const highlighted=c.ptTimingCell(c.OPPS[0]);assert.match(highlighted,/pt-stay-overdue/);assert.match(highlighted,/10 天 0 小时/);assert.doesNotMatch(highlighted,/<b>|超过 10 天/);
 const row=quote(c);row[18].erpRequestedRevision=1;row[18].stockStatus='已完成';c.v3Save();clock.now+=20*86400000;
 assert.equal(c.ptOpportunityTiming(c.OPPS[0]).label,'已结束');assert.equal(c.ptOpportunityTiming(c.OPPS[0]).overdue,false);
});
test('失败保存不提交新的状态进入时间，重试成功后才记录',()=>{
 const {c,clock}=setup({OPPS:[]});c.OPPS.push(opp());c.v3Save();const old=copy(c.OPPS[0][20].stageTracking);clock.now+=86400000;quote(c);
 c.fail=true;assert.equal(c.v3Save(),false);assert.deepEqual(copy(c.OPPS[0][20].stageTracking),old);
 c.fail=false;c.throws=true;assert.throws(()=>c.v3Save(),/保存失败/);assert.deepEqual(copy(c.OPPS[0][20].stageTracking),old);
 c.throws=false;clock.now+=3600000;c.v3Save();assert.equal(c.OPPS[0][20].stageTracking.enteredAt,new Date(clock.now).toISOString());assert.equal(c.OPPS[0][20].stageTracking.history.length,1);
});
test('前置邀请拒绝及重新提交独立计时，接受后不重复出现在矩阵',()=>{
 const {c,clock}=setup({OPPS:[],TODOS:[]});const task={id:'A',type:'确认商机',project:'P',cat:'家具',status:'待处理',owner:'SM'};c.TODOS.push(task);c.v3Save();
 clock.now+=2*86400000;task.status='已驳回';c.v3Save();let row=c.mgOppRows('P')[0];assert.equal(c.ptOpportunityTiming(row).state,'已拒绝');assert.equal(c.ptOpportunityTiming(row).terminal,true);
 clock.now+=86400000;task.status='待处理';c.v3Save();row=c.mgOppRows('P')[0];assert.equal(c.ptOpportunityTiming(row).elapsedMs,0);
 c.OPPS.push(opp());c.OPPS[0][20]={approvalTodo:'A'};task.status='已处理';task.createdOppId='O';c.v3Save();assert.equal(c.ptProjectMatrix('P').total,1);assert.equal(c.ptProjectMatrix('P').counts['待接受'],0);
});
test('项目矩阵按品类与真实阶段归集原始和加单，未分配品类仍可见',()=>{
 const {c}=setup();const addon=opp('ADDON');addon[20]={isAddon:true,addonNumber:2};c.OPPS.push(addon);c.TODOS.push({id:'A',type:'确认商机',project:'P',cat:'门窗',status:'待处理',owner:'SM'},{id:'R',type:'确认商机',project:'P',cat:'地板',status:'已驳回',owner:'SM'});
 const row=quote(c);row[18].erpRequestedRevision=1;const matrix=c.ptProjectMatrix('P');
 assert.equal(matrix.total,4);assert.equal(matrix.counts['待下定'],1);assert.equal(matrix.counts['洽谈中'],1);assert.equal(matrix.counts['待接受'],1);assert.equal(matrix.counts['已拒绝'],1);assert.equal(matrix.status,'待成交');
 assert.equal(matrix.rows.find(r=>r.category==='家具').cells['待下定'][0][0],'O');assert.equal(matrix.rows.find(r=>r.category==='灯饰').cells['洽谈中'].length,0);
 row[18].stockStatus='备货中';assert.equal(c.ptProjectMatrix('P').status,'部分成交');assert.match(c.ptMatrixCard(addon),/加单 2/);
});
test('矩阵前置项只链接确切待办，权限不足不提供办理入口',()=>{
 const {c}=setup({OPPS:[],TODOS:[{id:'A',type:'确认商机',project:'P',cat:'家具',status:'待处理',owner:'OTHER'}]});const row=c.mgOppRows('P')[0];
 assert.match(c.ptMatrixCard(row),/data-act="ptOpenTask" data-id="A"/);c.forbidden=true;assert.doesNotMatch(c.ptMatrixCard(row),/data-act=/);assert.match(c.ptMatrixCard(row),/无权办理/);
});
test('商机列表停留列的表头、每行字段和列设置数量一致',()=>{
 const {c}=setup();c.qNum=x=>Number(String(x||'').replace(/[^0-9.-]/g,''))||0;c.qMoney=n=>'¥'+n;const money=fs.readFileSync(new URL('../src/compat/runtime/managementMonitoring.js',import.meta.url),'utf8');vm.runInContext(money.slice(money.indexOf('function mmFeeOrders('),money.indexOf('function mmProjectMoney(')),c);c.projectLevelTag=()=>'';c.tag=String;c.ops=()=>'<td>操作</td>';c.toolbar=()=>'';c.foot=()=>'';c.mgOppActions=()=>[];
 vm.runInContext(crm.slice(crm.indexOf('function pageOpps(){'),crm.indexOf('function pageCustomers(){')),c);const html=c.pageOpps();
 const header=html.match(/<thead><tr>([\s\S]*?)<\/tr><\/thead>/)[1],body=html.match(/<tbody><tr[^>]*>([\s\S]*?)<\/tr>/)[1];
 assert.equal((header.match(/<th[ >]/g)||[]).length,(body.match(/<td[ >]/g)||[]).length);assert.match(header,/<th>当前状态停留<\/th>/);assert.match(body,/未记录/);
 assert.match(crm,/opps:\['商机名称','商机状态','当前状态停留'/);
 assert.doesNotMatch(header,/国家ID/);assert.doesNotMatch(crm.match(/opps:\[([^\]]+)\]/)[1],/国家ID/);assert.match(crm,/创建时间,国家ID/);
});

test('项目状态仅显示真实状态，商机进度在操作列，详情没有签约字段',()=>{
 const {c}=setup();let html=c.ptProjectStatusButton('P');assert.doesNotMatch(html,/<button|ptProjectProgress/);assert.match(html,/data-project-progress="待成交"/);assert.match(crm,/t:'商机进度',act:'ptProjectProgress'/);
 const row=quote(c);row[18].erpRequestedRevision=1;row[18].stockStatus='备货中';html=c.ptProjectStatusButton('P');assert.match(html,/data-project-progress="全部成交"/);
 const detail=crm.slice(crm.indexOf('function pageDetail(){'),crm.indexOf('function orderTypeTone('));assert.doesNotMatch(detail,/签约状态/);assert.match(detail,/ptProjectStatusButton\(p\[0\]\)/);
});

test('看板保留全部阶段空列，可横向滚动，品类筛选不修改业务记录',()=>{
 const {c}=setup();const addon=opp('ADDON');addon[20]={isAddon:true,addonNumber:1};c.OPPS.push(addon);c.TODOS.push({id:'A',type:'确认商机',project:'P',cat:'门窗',status:'待处理',owner:'SM'});
 const before=copy({opps:c.OPPS,todos:c.TODOS});let matrix=c.ptProjectMatrix('P'),view=c.ptMatrixView(matrix);
 assert.deepEqual(Array.from(view.states),c.MG135.opportunityStates);assert.equal(view.total,3);assert.equal(view.rows.length,3);
 const body=c.ptProgressBody(matrix);assert.equal((body.match(/class="pt-stage-column"/g)||[]).length,9);assert.match(body,/min-width:1980px/);assert.match(body,/可横向滚动/);assert.doesNotMatch(body,/有商机阶段|ptShowStages|pt-stage-mode|品类 \/ 商机数|scope="row"|ptFilterStage|pt-stage-counts/);assert.match(body,/pt-card-category">家具/);assert.match(body,/data-pt-category-menu/);
 view=c.ptMatrixView(matrix,{category:'家具'});assert.deepEqual(Array.from(view.states),c.MG135.opportunityStates);assert.equal(view.total,2);assert.equal(view.rows.length,1);
 view=c.ptMatrixView(matrix,{stage:'待接受'});assert.equal(view.total,3);assert.equal(view.states.length,9);
 assert.deepEqual(copy({opps:c.OPPS,todos:c.TODOS}),before);
});

test('移除阶段筛选后旧筛选值不会隐藏阶段，品类多选与重置保留业务记录',()=>{
 const {c}=setup();const lamp=opp('LAMP','灯饰');c.OPPS.push(lamp);c.TODOS.push({id:'A',type:'确认商机',project:'P',cat:'门窗',status:'待处理',owner:'SM'},{id:'R',type:'确认商机',project:'P',cat:'地板',status:'已驳回',owner:'SM'});
 const before=copy({opps:c.OPPS,todos:c.TODOS});const matrix=c.ptProjectMatrix('P');
 let view=c.ptMatrixView(matrix,{categories:['家具','门窗'],stages:['洽谈中','待接受']});assert.equal(view.total,2);assert.equal(view.states.length,9);assert.deepEqual(Array.from(view.rows,r=>r.category),['家具','门窗']);
 view=c.ptMatrixView(matrix,{categories:['家具','门窗'],stages:['已拒绝']});assert.equal(view.total,2);
 vm.runInContext("PT137.view={project:'P',categories:[],overdue:false}",c);
 c.ptToggleFilter('category','家具',true);c.ptToggleFilter('category','门窗',true);c.ptToggleFilter('category','家具',true);
 assert.deepEqual(copy(vm.runInContext('PT137.view.categories',c)),['家具','门窗']);assert.equal(c.ptMatrixView(matrix,vm.runInContext('PT137.view',c)).total,2);
 c.handleAct({dataset:{act:'ptAllCategories'}});assert.deepEqual(copy(vm.runInContext('PT137.view.categories',c)),[]);
 c.handleAct({dataset:{act:'ptResetFilters'}});view=c.ptMatrixView(matrix,vm.runInContext('PT137.view',c));assert.equal(view.total,4);assert.equal(view.states.length,9);
 assert.deepEqual(copy({opps:c.OPPS,todos:c.TODOS}),before);assert.equal(c.saved,undefined);
});

test('正常阶段彩色箭头按顺序排列，退出阶段不误连到完成之后，商机保持纵向排列',()=>{
 const {c}=setup();const body=c.ptProgressBody(c.ptProjectMatrix('P'));
 assert.deepEqual([...body.matchAll(/<h3 class="[^"]+"[^>]*>([^<]+)/g)].map(match=>match[1]),['待接受','洽谈中','报价中','待下定','待下单','交付中','已完成','已拒绝','已输单']);
 assert.equal((body.match(/pt-stage-arrow"/g)||[]).length,7);assert.equal((body.match(/pt-stage-exit"/g)||[]).length,2);
 assert.doesNotMatch(body,/ptFilterStage|pt-stage-counts|原始商机/);assert.doesNotMatch(body,/退出|查看商机|报价状态|客户确认|ERP状态/);
 c.OPPS.push(opp('SECOND'));const next=c.ptProgressBody(c.ptProjectMatrix('P'));
 const talk=next.match(/<section class="pt-stage-column" aria-label="洽谈中商机">([\s\S]*?)<\/section>/)[1];
 assert.equal((talk.match(/<article class="pt-matrix-card/g)||[]).length,2);assert.doesNotMatch(talk,/ptOpenOpp/);
 assert.match(tracking,/\.pt-stage-list\{display:flex;flex-direction:column/);assert.match(tracking,/width:min\(1600px,86vw\)/);
 assert.match(body,/pt-card-category">家具/);assert.doesNotMatch(body,/品类 \/ 商机数|scope="row"/);
 const design=opp('DESIGN','');design[20]={kind:'design'};assert.match(c.ptMatrixCard(design),/pt-card-category">设计服务/);
});

test('参考卡片的信息对应自己的项目与报价，标题和项目入口分开，实收不借用其他商机或费用订单',()=>{
 const {c}=setup();const row=quote(c);row[10]='¥12,800';row[13]='¥2,500';c.OPPS[0][13]='¥12,800';c.OPPS[0][15]='¥10,000';c.OPPS[0][16]='¥2,500';c.OPPS[0][6]='自己的客户';c.OPPS[0][18]='2026-10-12 09:00';c.V3={meta:{Q:{submitted:{}}}};c.oqStatus=()=>'已报价';
 const other=Array(19).fill('');other[10]='¥99,999';other[13]='¥8,888';other[15]='P';other[17]='OTHER';other[18]={quoteCode:'OTHERQUOTE'};c.ORDERS.unshift(other);
 const html=c.ptMatrixCard(c.OPPS[0]);assert.match(html,/<article class="pt-matrix-card/);assert.match(html,/<strong class="pt-card-title">住宅-家具<\/strong>/);assert.doesNotMatch(html,/ptOpenOpp|查看商机/);assert.match(html,/data-act="ptOpenProject" data-proj="P"/);assert.match(html,/住宅项目/);assert.match(html,/自己的客户/);assert.match(html,/方案经理/);assert.match(html,/商机部门/);assert.match(html,/¥12,800/);assert.match(html,/实收金额[\s\S]*?¥2,500/);assert.match(html,/创建于[\s\S]*?2026-10-12/);assert.doesNotMatch(html,/99,999|8,888|等级|原始商机/);
 c.handleAct({dataset:{act:'ptOpenProject',proj:'P'}});assert.equal(c.opened.act,'go:detail');assert.equal(c.opened.proj,'P');
 c.handleAct({dataset:{act:'ptOpenProject',proj:'MISSING'}});assert.match(c.toast,/项目已更新/);assert.equal(c.opened.proj,'P');
});

test('看板非交互区域按住鼠标横拖，点击与触屏不误触，按钮仍可操作',()=>{
 const {c}=setup(),listeners={},classes=new Set();let captured=null;
 const scroll={scrollLeft:20,scrollWidth:2160,clientWidth:1100,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},setPointerCapture:id=>{captured=id;},hasPointerCapture:id=>captured===id,releasePointerCapture:()=>{captured=null;}},mask={addEventListener:(name,fn)=>{listeners[name]=fn;}};
 const before=copy({opps:c.OPPS,todos:c.TODOS,orders:c.ORDERS});c.ptInstallBoardBrowsing(mask);
 let prevented=0,stopped=0;const target={closest:selector=>selector==='.pt-matrix-scroll'?scroll:selector==='.pt-stage-heading'?{}:null},event={target,button:0,pointerType:'mouse',pointerId:1,clientX:600,clientY:100,preventDefault:()=>prevented++};
 listeners.pointerdown(event);listeners.pointermove({...event,clientX:598});assert.equal(scroll.scrollLeft,20);assert.equal(captured,null);
 listeners.pointermove({...event,clientX:400});assert.equal(scroll.scrollLeft,220);assert.equal(captured,1);assert.ok(classes.has('pt-board-dragging'));listeners.pointerup(event);assert.equal(captured,null);assert.equal(classes.size,0);
 listeners.click({preventDefault:()=>prevented++,stopImmediatePropagation:()=>stopped++});assert.equal(stopped,1);
 listeners.pointerdown(event);listeners.pointerup(event);listeners.click({preventDefault:()=>prevented++,stopImmediatePropagation:()=>stopped++});assert.equal(stopped,1);
 listeners.pointerdown({...event,pointerType:'touch'});listeners.pointermove({...event,clientX:300});assert.equal(scroll.scrollLeft,220);
 listeners.pointerdown({...event,target:{closest:()=>({})}});listeners.pointermove({...event,clientX:300});assert.equal(scroll.scrollLeft,220);
 listeners.wheel({target,deltaX:0,deltaY:100,deltaMode:0,preventDefault:()=>prevented++});assert.equal(scroll.scrollLeft,320);
 listeners.wheel({target,ctrlKey:true,deltaY:100,preventDefault:()=>prevented++});assert.equal(scroll.scrollLeft,320);
 listeners.wheel({target:{closest:()=>null},deltaY:100,preventDefault:()=>prevented++});assert.equal(scroll.scrollLeft,320);
 assert.deepEqual(copy({opps:c.OPPS,todos:c.TODOS,orders:c.ORDERS}),before);assert.equal(c.saved,undefined);
});

test('卡片区分保存中的报价与商机金额和客户确认，费用订单不冒充报价，加单仅显示加单标签',()=>{
 const {c}=setup();const row=quote(c);row[10]='¥12,800';c.OPPS[0][13]='¥12,800';c.OPPS[0][15]='¥10,000';row[3]='未执行';c.V3={meta:{Q:{submitted:{},workingSaved:true,confirmedCats:['家具']}}};c.oqStatus=()=>'已保存';
 const before=copy({opps:c.OPPS,todos:c.TODOS,orders:c.ORDERS,meta:c.V3.meta});c.TODOS.push({id:'QT',type:'报价待办',opp:'O',project:'P',status:'待处理'});
 const html=c.ptMatrixCard(c.OPPS[0]);assert.match(html,/商机金额/);assert.match(html,/¥12,800/);assert.doesNotMatch(html,/报价状态|客户确认|ERP状态|已保存|已确认|未执行/);assert.match(html,/data-act="ptOpenTask" data-id="QT"/);assert.match(html,/报价待办[\s\S]*?待处理/);assert.doesNotMatch(html,/原始商机|pt-card-batch/);
 const addon=opp('A');addon[20]={isAddon:true,addonNumber:2};assert.match(c.ptMatrixCard(addon),/pt-card-batch">加单 2/);
 c.V3.meta.Q.needsSpaceUpdate=true;assert.doesNotMatch(c.ptMatrixCard(c.OPPS[0]),/待重新确认/);
 delete c.V3.meta.Q.needsSpaceUpdate;assert.deepEqual(copy({opps:c.OPPS,orders:c.ORDERS,meta:c.V3.meta}),{opps:before.opps,orders:before.orders,meta:before.meta});
 const fee=Array(19).fill('');fee[2]='费用订单';fee[10]='¥300';fee[15]='P';fee[17]='O';fee[18]={kind:'fee'};c.ORDERS=[fee];assert.doesNotMatch(c.ptMatrixCard(c.OPPS[0]),/¥300/);assert.match(c.ptMatrixCard(c.OPPS[0]),/商机金额<\/span><strong>¥12,800/);assert.match(c.ptMatrixCard(c.OPPS[0]),/成单金额<\/span><strong>¥10,000/);
});

test('品类多选下拉保留选择标签与搜索入口，搜索只筛选候选项而不改商机',()=>{
 const {c}=setup(),matrix=c.ptProjectMatrix('P'),html=c.ptCategoryFilter(matrix,{categories:['家具','灯饰']});
 assert.match(html,/summary aria-label="筛选商机品类，可多选"/);assert.match(html,/家具、灯饰/);assert.match(html,/data-pt-category-search/);assert.equal((html.match(/ checked/g)||[]).length,2);
 const options=[{dataset:{ptCategoryOption:'家具'}},{dataset:{ptCategoryOption:'灯饰'}}];c.ptSearchCategories({querySelectorAll:()=>options},' 家具 ');assert.equal(options[0].hidden,false);assert.equal(options[1].hidden,true);
 c.ptSearchCategories({querySelectorAll:()=>options},'');assert.equal(options[1].hidden,false);assert.equal(c.saved,undefined);
});

test('仅超10天筛选显示准确当前状态，阶段变化后移除超时项并保留加单区分',()=>{
 const {c,clock}=setup({OPPS:[]});const original=opp(),addon=opp('ADDON');addon[20]={isAddon:true,addonNumber:2};c.OPPS.push(original,addon);c.v3Save();clock.now+=11*86400000;
 const row=quote(c);c.v3Save();let view=c.ptMatrixView(c.ptProjectMatrix('P'),{overdue:true});assert.equal(view.total,1);assert.equal(view.rows[0].cells['洽谈中'][0][0],'ADDON');assert.match(c.ptMatrixCard(addon),/加单 2/);
 row[18].erpRequestedRevision=1;c.v3Save();assert.equal(c.ptMatrixView(c.ptProjectMatrix('P'),{overdue:true}).total,1);
 c.OPPS[1][2]='已输单';c.v3Save();view=c.ptMatrixView(c.ptProjectMatrix('P'),{overdue:true});assert.equal(view.total,0);assert.equal(view.rows.length,0);
});

test('表头点击或拖动结束不会触发遮罩关闭，只有真正点击遮罩关闭',()=>{
 const {c}=setup(),listeners={},mask={addEventListener:(name,fn)=>{listeners[name]=fn;}};
 let closed=0;c.ptCloseProjectProgress=()=>closed++;c.ptInstallBackdropDismissal(mask);
 listeners.pointerdown({target:{}});listeners.click({target:mask});assert.equal(closed,0);
 listeners.pointerdown({target:mask});listeners.pointercancel();listeners.click({target:mask});assert.equal(closed,0);
 listeners.pointerdown({target:mask});listeners.click({target:mask});assert.equal(closed,1);
});

test('报价待办入口限定自己的商机和项目，不借用其他商机或加单待办',()=>{
 const {c}=setup({TODOS:[{id:'OTHER',type:'报价待办',project:'P',opp:'OTHER',status:'待处理'},{id:'WRONGPROJECT',type:'报价待办',project:'OTHER',opp:'O',status:'待处理'},{id:'OWN',type:'报价待办',project:'P',opp:'O',status:'待处理',owner:'OTHER'}]});
 const html=c.ptMatrixCard(c.OPPS[0]);assert.match(html,/data-act="ptOpenTask" data-id="OWN"/);assert.doesNotMatch(html,/data-id="OTHER"|data-id="WRONGPROJECT"|ptOpenOpp/);
 c.forbidden=true;assert.doesNotMatch(c.ptMatrixCard(c.OPPS[0]),/ptOpenTask/);
 c.forbidden=false;c.handleAct({dataset:{act:'ptOpenTask',id:'OWN'}});assert.equal(c.openedTask,'OWN');
});

test('每个状态列表都是独立可聚焦滚动区域，卡片不裁剪且看板没有边框',()=>{
 const {c}=setup();const html=c.ptProgressBody(c.ptProjectMatrix('P'));
 assert.equal((html.match(/商机列表，可独立上下滚动/g)||[]).length,9);
 assert.match(tracking,/\.pt-stage-list\{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden/);
 assert.match(tracking,/overflow-x:auto;overflow-y:hidden;border:0;border-radius:0;outline:none/);
 assert.match(tracking,/\.pt-stage-column\{display:flex;flex-direction:column;height:100%;min-height:0;border:0/);
});


test('采购20%推进重置阶段计时，同阶段收款及重开保留原进入时间',()=>{
 const {c,clock}=setup({OPPS:[]});c.OPPS.push(opp());c.v3Save();const q=quote(c);q[10]='¥100';q[13]='¥0';q[18].erpRequestedRevision=1;c.v3Save();const pending=c.OPPS[0][20].stageTracking.enteredAt;
 clock.now+=3600000;q[13]='¥19.99';c.v3Save();assert.equal(c.ptOpportunityTiming(c.OPPS[0]).state,'待下定');assert.equal(c.OPPS[0][20].stageTracking.enteredAt,pending);
 clock.now+=3600000;q[13]='¥20';c.v3Save();const ordered=c.OPPS[0][20].stageTracking.enteredAt;assert.notEqual(ordered,pending);assert.equal(c.ptOpportunityTiming(c.OPPS[0]).state,'待下单');
 clock.now+=3600000;q[13]='¥50';c.v3Save();assert.equal(c.OPPS[0][20].stageTracking.enteredAt,ordered);const {c:reopened}=setup(c.saved);assert.equal(reopened.ptOpportunityTiming(reopened.OPPS[0]).state,'待下单');assert.equal(reopened.OPPS[0][20].stageTracking.enteredAt,ordered);
});
