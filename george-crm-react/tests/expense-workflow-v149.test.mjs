import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=n=>fs.readFileSync(new URL('../src/compat/runtime/'+n+'.js',import.meta.url),'utf8');
const fixture=fs.readFileSync(new URL('./design-quotation-v148.test.mjs',import.meta.url),'utf8');
const inner=fs.readFileSync(new URL('./opportunity-quotes.test.mjs',import.meta.url),'utf8');
const section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
const copy=x=>JSON.parse(JSON.stringify(x));
function setup(){const c=Function('vm','read','section','fixture','copy',section(fixture,'function setup(){','function design(')+';return setup();')(vm,read,section,inner,copy);Object.assign(c,{v21SuperAdmin:()=>!!c.admin,V72_TYPES:{},v81CanEditTodo:()=>false,tfReminder:t=>({visible:t.status==='待处理'&&(c.admin||t.initiator===c.v17Owner()&&t.owner!==c.v17Owner()),allowed:true}),page:'todos'});vm.runInContext(read('expenseWorkflow'),c);return c;}
const data={feeType:'国内运费',owner:'SM',attachments:[{id:'A',name:'运输.pdf'}],note:'配送说明'};

test('经办人补充附件备注进入精确费用订单和ERP请求，保留发起资料；重复确认不覆盖，失败回滚',()=>{
 const c=setup(),t=c.efInitiate('P','B',data,'R'),original=JSON.stringify(t.submissionHistory);c.actor='SM';
 const details={attachments:[{id:'A',name:'运输.pdf'},{id:'B',name:'收货说明.pdf'}],note:'已核对配送与搬运'};
 c.fail=true;assert.throws(()=>c.efComplete(t.id,88,0,details),/保存失败/);assert.equal(c.ORDERS.length,0);assert.equal(c.TODOS[0].completionFields,undefined);c.fail=false;
 const row=c.efComplete(t.id,88,0,details),saved=c.TODOS[0];assert.equal(row[18].attachments.length,2);assert.equal(row[18].note,details.note);assert.equal(row[18].erpRequests[0].snapshot.note,details.note);assert.equal(saved.completionFields.amount,88);assert.equal(saved.note,data.note);assert.equal(JSON.stringify(saved.submissionHistory),original);
 c.efComplete(t.id,99,0,{attachments:[],note:'重复'});assert.equal(row[18].note,details.note);assert.equal(row[10],'¥88');
});

test('确认界面带入费用附件备注，设计师下拉点击打开，再点关闭',()=>{
 const c=setup(),t=c.efInitiate('P','B',data,'R');c.actor='SM';c.efOpenTask(t.id,'handle');assert.match(c.modal.body,/ef-task-summary/);assert.match(c.modal.body,/efCompleteFiles/);assert.match(c.modal.body,/id="efCompleteNote"[^>]*>配送说明/);
 const listeners={},menu={hidden:true},toggle={setAttribute:(k,v)=>{toggle[k]=v;}},search={focus:()=>{}},root={classList:{toggle:()=>{}},querySelector:q=>q==='.allocation-menu'?menu:q==='[data-ds-toggle]'?toggle:search};
 c.document={getElementById:id=>id==='efDesignerMenu'?menu:id==='efDesignerPicker'?root:null,addEventListener:(type,cb)=>listeners[type]=cb};
 const source=read('expenseWorkflow');vm.runInContext(source.slice(source.indexOf('function efDesignerMenu(')),c);
 const event={target:{closest:q=>q==='[data-ds-toggle]'?toggle:null}};listeners.click(event);assert.equal(menu.hidden,false);assert.equal(toggle['aria-expanded'],'true');listeners.click(event);assert.equal(menu.hidden,true);
});
test('费用待办先存类型/待办人/附件/备注，无金额、订单或报价变更，同一请求幂等',()=>{const c=setup(),before=JSON.stringify([c.ORDERS,c.V3,c.PROJECT_QUOTES]),t=c.efInitiate('P','B',data,'REQ');assert.equal(t.type,'费用订单待办');assert.equal(t.owner,'SM');assert.equal(t.initiator,'PM');assert.equal(t.amount,undefined);assert.equal(t.attachments[0].name,'运输.pdf');assert.equal(JSON.stringify([c.ORDERS,c.V3,c.PROJECT_QUOTES]),before);assert.equal(c.efInitiate('P','B',data,'REQ').id,t.id);assert.equal(c.TODOS.length,1);assert.equal(c.V72_TYPES[t.type],'sm');});
test('收到待办的人填金额生成精确项目/商机费用订单和ERP请求，只完成该待办，重复确认幂等',()=>{const c=setup(),code=c.oqCreateQuote('B'),t=c.efInitiate('P','B',data,'REQ');const quoteTask=c.TODOS.find(t=>t.type==='报价待办'),before=JSON.stringify([c.V3,c.PROJECT_QUOTES]);c.actor='SM';const r=c.efComplete(t.id,120,0);assert.equal(r[2],'费用订单');assert.equal(r[16],'国内运费');assert.equal(r[15],'P');assert.equal(r[17],'B');assert.equal(r[10],'¥120');assert.equal(r[18].feeTaskId,t.id);assert.equal(r[18].erpRequests.length,1);assert.equal(r[18].erpRequests[0].snapshot.note,'配送说明');assert.equal(r[3],'等待ERP回执');assert.equal(r[18].erpRequestedRevision,undefined);assert.equal(t.status,'已处理');assert.equal(quoteTask.status,'待处理');assert.equal(c.oqStatus(code),'待报价');assert.equal(JSON.stringify([c.V3,c.PROJECT_QUOTES]),before);assert.equal(c.efComplete(t.id,120,0)[0],r[0]);assert.equal(c.ORDERS.length,2);});
test('项目费用及设计商机费用均支持，项目费用不伪造商机或设计报价',()=>{const c=setup(),t=c.efInitiate('P','',data,'P');c.actor='SM';const r=c.efComplete(t.id,100,0);assert.equal(r[17],'');assert.equal(r[15],'P');assert.equal(c.DRAFTS.length,0);c.actor='PM';c.OPPS.push(['DS','设计','洽谈中','设计服务','P','','客户','设计甲','','','PM','','','','','','','','','',{kind:'design'}]);const ds=c.efInitiate('P','DS',{...data,owner:'设计甲'},'DS');c.actor='设计甲';assert.equal(c.efComplete(ds.id,20,0)[17],'DS');assert.equal(c.DRAFTS.length,0);});
test('驳回保留原待办及理由，发起人从已驳回待办编辑重提，接收人处理新字段',()=>{const c=setup(),t=c.efInitiate('P','B',data,'REQ');c.actor='SM';c.efReject(t.id,'附件需要补充',0);assert.equal(t.status,'已驳回');assert.equal(t.rejectHistory[0].fields.feeType,'国内运费');assert.throws(()=>c.efComplete(t.id,20,0),/当前待办人/);c.actor='PM';const same=c.efEdit(t.id,{...data,feeType:'安装费',note:'已补齐'},0);assert.equal(same.id,t.id);assert.equal(c.TODOS.length,1);assert.equal(t.status,'待处理');assert.equal(t.editRevision,1);assert.equal(t.editHistory[0].before.rejectReason,'附件需要补充');assert.equal(t.rejectReason,undefined);assert.equal(t.lastEdit.fromStatus,'已驳回');c.actor='SM';assert.throws(()=>c.efComplete(t.id,100,0),/已被修改/);assert.equal(c.efComplete(t.id,100,1)[16],'安装费');});
test('金额/关联/权限验证失败不建订单或结束待办，完成待办不可重新编辑或驳回',()=>{const c=setup(),t=c.efInitiate('P','B',data,'R');assert.throws(()=>c.efComplete(t.id,10,0),/当前待办人/);c.actor='SM';for(const a of [0,-1,NaN,Infinity])assert.throws(()=>c.efComplete(t.id,a,0),/大于零/);assert.throws(()=>c.efEdit(t.id,data,0),/发起人/);assert.throws(()=>c.efReject(t.id,'',0),/驳回原因/);assert.equal(c.ORDERS.length,0);assert.equal(c.TODOS[0].status,'待处理');c.efComplete(t.id,10,0);assert.throws(()=>c.efEdit(t.id,data,0),/发起人/);assert.throws(()=>c.efReject(t.id,'x',0),/不可驳回/);});
test('失败保存回滚完成/订单/ERP请求、编辑及驳回，保留原输入与待处理状态',()=>{for(const action of ['complete','edit','reject']){const c=setup(),t=c.efInitiate('P','B',data,'R'),before=JSON.stringify([c.TODOS,c.ORDERS]);c.fail=true;c.actor=action==='edit'?'PM':'SM';assert.throws(()=>action==='complete'?c.efComplete(t.id,30,0):action==='edit'?c.efEdit(t.id,{...data,note:'改'},0):c.efReject(t.id,'退',0),/保存失败/);assert.equal(JSON.stringify([c.TODOS,c.ORDERS]),before);}});
test('直接创建费用订单独立传输，不生成待办或占用唯一报价，重复请求不重复ERP',()=>{const c=setup();const r=c.efDirect('P','B',40,'搬货费','',[],'D');assert.equal(r[3],'等待ERP回执');assert.equal(c.TODOS.length,0);assert.equal(c.DRAFTS.length,0);assert.equal(c.efDirect('P','B',40,'搬货费','',[],'D')[0],r[0]);assert.equal(c.ORDERS.length,1);assert.equal(r[18].erpRequests.length,1);assert.throws(()=>c.efInitiate('P','OTHER',data,'X'),/关联已变化/);assert.throws(()=>c.efInitiate('P','B',{...data,owner:'客户'},'X'),/有效的待办人/);assert.throws(()=>c.efDirect('P','B',5,'设计费','',[],'Y'),/费用类型/);});
test('费用待办操作包含经办确认驳回和发起人编辑催办；管理员不绕过数据校验',()=>{const c=setup(),t=c.efInitiate('P','B',data,'R');assert.deepEqual(Array.from(c.todoActs(t),a=>a.t),['编辑待办','催办']);c.actor='SM';assert.deepEqual(Array.from(c.todoActs(t),a=>a.t),['确认','驳回']);c.actor='其他';assert.deepEqual(Array.from(c.todoActs(t),a=>a.t),[]);c.admin=true;assert.ok(c.todoActs(t).some(a=>a.t==='催办'));assert.throws(()=>c.efComplete(t.id,0,0),/大于零/);});
test('两个费用页签同时保留DOM输入，设计分配使用紧凑多选下拉而非展开卡片',()=>{const c=setup();c.dqOpenFee('B','P');assert.equal(c.modal.title,'费用订单');assert.match(c.modal.body,/data-ef-panel="create"/);assert.match(c.modal.body,/data-ef-panel="task" hidden/);assert.match(c.modal.body,/id="efCreateFiles"|"key":"efCreateFiles"/);assert.match(c.modal.body,/"key":"efTaskFiles"/);c.PROJECT_EXTRA.P.formData.designType='独立设计服务';c.dqAllocation('P');assert.match(c.modal.body,/class="allocation-menu"/);assert.match(c.modal.body,/data-ds-search/);assert.match(c.modal.body,/data-design-person/);assert.doesNotMatch(c.modal.body,/<details|chk-grid/);});


test('费用来源读取精确项目和商机关联；历史缺失不套用其他商机，办理及编辑保留归属',()=>{
 const c=setup(),project=c.efInitiate('P','',data,'PROJECT'),business=c.efInitiate('P','B',data,'OPPORTUNITY');
 const p=c.efTaskSource(project),b=c.efTaskSource(business);
 assert.equal(p.label,'项目费用');assert.equal(p.kind,'project');assert.equal(p.opportunityCode,'');
 assert.equal(b.label,'商机费用');assert.equal(b.opportunityCode,'B');assert.equal(b.opportunityName,c.oqOpp('B')[1]);
 assert.equal(c.efTaskSource({...business,opp:'MISSING'}).opportunityName,'');
 assert.equal(c.efTaskSource({...business,project:'OTHER'}).opportunityName,'');
 const original=JSON.stringify(business);c.actor='SM';c.efOpenTask(business.id,'handle');assert.match(c.efTaskSourceHtml(business),new RegExp(b.opportunityName));assert.doesNotMatch(c.efTaskSourceHtml(business),/rx-task-tag/);assert.match(c.modal.body,/B/);assert.equal(JSON.stringify(business),original);
 c.actor='PM';c.efOpenTask(project.id,'edit');assert.match(c.efTaskSourceHtml(project),/ef-task-context/);assert.doesNotMatch(c.efTaskSourceHtml(project),/rx-task-tag|关联商机 ·/);
});
