/* Acceptance invitations keep their original scope and identity when the PM
 * corrects the recipient. The allocation and actual task owner are one save. */
function ae197Task(task){return !!task&&['确认商机',...V68_APPROVALS].includes(task.type);}
function ae197Design(task){return !!task.designOpportunity||task.allocation?.mode==='design';}
function ae197Allocation(task){const a=task.allocation||{};return {...v3Copy(a),project:task.project,mode:ae197Design(task)?'design':task.type===V68_APPROVALS[0]||a.mode==='cross'?'cross':task.type===V68_APPROVALS[1]||a.mode==='referral'||a.referrer?'referral':'normal',cat:ae197Design(task)?'设计服务':a.cat||task.cat||task.smDept||task.cats,sm:a.sm||task.owner};}
function ae197Conflict(task,name){
 if(!ae197Design(task))return v68AllocationConflict(task.project,ae197Allocation(task).cat,name,task.id);
 if(OPPS.some(o=>o[4]===task.project&&o[20]?.kind==='design'&&o[7]===name)||TODOS.some(t=>t.id!==task.id&&t.project===task.project&&t.designOpportunity&&t.owner===name&&t.status==='待处理'))return '该设计师已有本项目商机或待处理分配';
 return '';
}
function ae197Candidates(task){const a=ae197Allocation(task);return ae197Design(task)?ua176Supervisors().map(name=>({name,cat:'设计服务',regions:[]})):v68Candidates(task.project,a.cat,a.mode==='referral'?'normal':a.mode);}
const ae197ValuesBase=v81EditValues;
v81EditValues=function(task){
 const value=ae197ValuesBase(task);if(!ae197Task(task))return value;
 const a=ae197Allocation(task);
 return {...value,allocation:{reason:a.reason||'',referrer:a.referrer||'',leader:a.leader||'',sm:a.sm},attachments:v3Copy(task.allocation?.attachments||[task.allocation?.evidence?.leader].filter(Boolean).concat(task.attachments||[])),...(ae197Design(task)?{expectedCompletionAt:task.expectedCompletionAt||a.expectedCompletionAt||'',coordination:v3Copy(task.coordination||a.coordination||{mode:'self',person:''})}:{})};
};
const ae197NormaliseBase=v81NormaliseEdit;
v81NormaliseEdit=function(task,values){
 if(!ae197Task(task))return ae197NormaliseBase(task,values);
 if(!PROJECTS.some(p=>p[0]===task.project))throw Error('关联项目不存在');
 if(task.createdOppId&&OPPS.some(o=>o[0]===task.createdOppId))throw Error('商机已承接，请通过负责人交接调整人员');
 const before=v81EditValues(task),a=ae197Allocation(task),input=values.allocation||{};
 if(input.mode&&input.mode!==a.mode||input.cat&&input.cat!==a.cat)throw Error('请保留原分配方式和品类');
 const next={...before,summary:String(values.summary??before.summary).trim(),note:String(values.note??before.note).trim(),attachments:v3Copy(values.attachments??before.attachments),allocation:{...before.allocation,sm:String(input.sm??before.allocation.sm).trim(),reason:String(input.reason??before.allocation.reason).trim(),referrer:String(input.referrer??before.allocation.referrer).trim()}};
 if(next.summary.length>5000||next.note.length>5000||next.allocation.reason.length>5000)throw Error('请将说明控制在 5000 字以内');
 dqFiles(next.attachments);
 if(!ae197Candidates(task).some(p=>p.name===next.allocation.sm))throw Error(ae197Design(task)?'请选择设计师主管':'请选择符合原分配区域及品类条件的方案经理');
 // Cross-region acceptance records predate direct approval-to-opportunity flow.
 // Changing an already-approved recipient must not bypass a fresh application.
 if(a.mode==='cross'&&task.type==='确认商机'&&next.allocation.sm!==a.sm)throw Error('跨区域变更接收人请重新提交跨区域申请审批');
 const conflict=ae197Conflict(task,next.allocation.sm);if(conflict)throw Error(conflict);
 if(a.mode==='design'){
  next.expectedCompletionAt=tfExpected(values.expectedCompletionAt??before.expectedCompletionAt);
  next.coordination=dr187Coordination(values.coordination??before.coordination);
 }else{
  const referrers=[...new Set([findProject(task.project)[9],...(typeof PMS!=='undefined'?PMS:[]),...V68_SMS.map(s=>s.name)].filter(Boolean))];
  if(next.allocation.referrer&&!referrers.includes(next.allocation.referrer))throw Error('请选择有效的转介绍人');
  const error=v68ValidateAllocation({...a,...next.allocation,attachments:next.attachments,evidence:next.allocation.referrer?{leader:next.attachments[0]}:{}});if(error)throw Error(error);
 }
 return next;
};
const ae197SubmitBase=v81SubmitTodoEdit;
v81SubmitTodoEdit=function(id,values,revision){
 const task=TODOS.find(t=>t.id===id);if(!ae197Task(task))return ae197SubmitBase(id,values,revision);
 if(!v81CanEditTodo(task))throw Error('当前账号无权编辑此待办，或待办已处理');
 if(revision!==undefined&&(task.editRevision||0)!==Number(revision))throw Error('这条待办已更新，请重新打开后编辑');
 const before=v81EditValues(task),next=v81NormaliseEdit(task,values),rejected=task.status==='已驳回';
 if(!rejected&&JSON.stringify(before)===JSON.stringify(next))return {changed:false,task};
 return bs131Atomic(()=>{
  const stamp=todoStamp(),actor=v17Owner(),prior=v3Copy(task),a=ae197Allocation(task),mode=a.mode==='normal'&&next.allocation.referrer?'referral':a.mode;
  const type=mode==='referral'?V68_APPROVALS[1]:mode==='cross'&&task.type!== '确认商机'?V68_APPROVALS[0]:task.type,owner=V68_APPROVALS.includes(type)?V68_OFFICE:next.allocation.sm;
  if(task.owner!==owner){task.ownerHistory=[...(task.ownerHistory||[]),{from:task.owner,to:owner,time:stamp,actor}];task.owner=owner;}
  Object.assign(task,{type,title:next.summary,note:next.note,attachments:v3Copy(next.attachments),files:next.attachments.map(f=>f.name).join('、'),sm:next.allocation.sm,cat:a.cat,cats:a.cat,smDept:a.cat,assignmentManaged:true,allocation176:true});
  task.allocation={...a,...next.allocation,mode,attachments:v3Copy(next.attachments),evidence:next.allocation.referrer?{leader:v3Copy(next.attachments[0])}:{}};
  if(a.mode==='design'){task.expectedCompletionAt=next.expectedCompletionAt;task.coordination=v3Copy(next.coordination);Object.assign(task.allocation,{expectedCompletionAt:next.expectedCompletionAt,coordination:v3Copy(next.coordination)});}
  task.editRevision=(task.editRevision||0)+1;
  task.lastEdit={actor,time:stamp,fromStatus:prior.status,revision:task.editRevision};
  task.editHistory=[...(task.editHistory||[]),{...task.lastEdit,before,after:v3Copy(next),decision:{approver:prior.approver||'',time:prior.approveTime||'',reason:v82TodoRejectionReason(prior)}}];
  task.status='待处理';if(rejected){task.approver='-';task.approveTime='-';task.rejectReason='';task.approvalNote='';task.v21ArrivedAt=stamp;}
  return {changed:true,task};
 });
};
function ae197Picker(task,value){
 const label=ae197Design(task)?'设计师主管':'方案经理',people=ae197Candidates(task);
 return `<div class="full ae197-person"><label>${label} <b>*</b></label><input type="hidden" id="v81SM" value="${esc(value)}"><details id="ae197Picker"><summary><span data-ae-selected>${esc(value||'请选择'+label)}</span><span>⌄</span></summary><div class="ae197-menu"><input type="search" aria-label="搜索${label}" placeholder="搜索姓名或品类"><div role="listbox" aria-label="${label}">${people.map(p=>{const conflict=ae197Conflict(task,p.name);return `<button type="button" role="option" aria-selected="${p.name===value}" data-act="ae197Person" data-name="${esc(p.name)}" data-ae-search="${esc((p.name+' '+p.cat).toLowerCase())}" ${conflict?'disabled':''}><strong>${esc(p.name)}</strong><small>${esc([p.cat,...p.regions].join(' · '))}</small>${conflict?`<small>${esc(conflict)}</small>`:''}</button>`;}).join('')}</div></div></details></div>`;
}
const ae197OpenBase=v81OpenTodoEdit;
v81OpenTodoEdit=function(id){
 const task=TODOS.find(t=>t.id===id);if(!ae197Task(task))return ae197OpenBase(id);
 if(!v81CanEditTodo(task))return toast('当前账号无权编辑此待办，或待办已处理');
 const value=v81EditValues(task),a=ae197Allocation(task),design=ae197Design(task),p=PROJECTS.find(p=>p[0]===task.project);
 if(!p)return toast('关联项目不存在');
 const referrers=[...new Set([p[9],...(typeof PMS!=='undefined'?PMS:[]),...V68_SMS.map(s=>s.name)].filter(Boolean))];
 const fields=design?`${tfExpectedField('ae197Expected',value.expectedCompletionAt,'allocation')}<label class="full">是否需要协调员 <b>*</b><select id="ae197Coordination" aria-label="是否需要协调员">${selectOpts(Object.values(DR187_COORDINATOR_MODES),DR187_COORDINATOR_MODES[value.coordination.mode])}</select><small>协调员将协助与客户确认设计图纸，完成设计定稿。</small></label><label class="full" data-ae-coordinator>协调员 <b>*</b><select id="ae197Coordinator" aria-label="协调员">${selectOpts(dr187People(),value.coordination.person||'')}</select></label>`:['normal','referral'].includes(a.mode)?`<label class="full">转介绍人${a.mode==='referral'?' <b>*</b>':'（选填）'}<select id="v81Referrer" aria-label="转介绍人">${selectOpts(referrers,value.allocation.referrer)}</select></label><label class="full" data-ae-referral>转介绍原因 <b>*</b><textarea id="v81Reason" maxlength="5000">${esc(value.allocation.reason)}</textarea></label>`:`<label class="full">申请原因 <b>*</b><textarea id="v81Reason" maxlength="5000">${esc(value.allocation.reason)}</textarea></label>`;
 const context=`<div class="v68-project-head"><strong>${esc(p[1])}</strong><span>${esc(task.status)}</span></div><div class="v69-project-scope"><span><b>分配类型</b>${design?'设计服务':a.mode==='cross'?'跨区域申请':a.mode==='referral'?'转介绍申请':'区域内分配'}</span>${design?'':`<span><b>品类</b>${esc(a.cat)}</span><span><b>项目区域</b>${esc(v68Region(p))}</span>`}</div>`;
 v68Modal('编辑'+crmTaskCategory(task),`${context}${task.status==='已驳回'?`<div class="v68-source">驳回原因：${esc(v82TodoRejectionReason(task)||'未记录')}</div>`:''}<div class="planned-form two v81-edit-form" id="ae197Form" data-task="${esc(id)}">${ae197Picker(task,a.sm)}${fields}<div class="full" ${!design&&['normal','referral'].includes(a.mode)?'data-ae-referral':''}><label>${!design&&['normal','referral'].includes(a.mode)?'方案经理组长/主管同意截图 <b>*</b>':'相关附件（选填）'}</label>${v69UploadHtml('todo-edit-'+id,value.attachments,{images:!design&&['normal','referral'].includes(a.mode),max:10})}</div><label class="full">待办说明<textarea id="v81Summary" maxlength="5000">${esc(value.summary)}</textarea></label><label class="full">备注<textarea id="v81Note" maxlength="5000">${esc(value.note)}</textarea></label></div>`,`<button class="btn default" data-act="closeModal">取消</button><button class="btn" data-act="v81SaveTodoEdit" data-id="${esc(id)}" data-revision="${task.editRevision||0}">${task.status==='已驳回'?'修改并重新提交':'保存修改'}</button>`);
 ae197Conditional();
};
function ae197Conditional(){
 const form=document.getElementById('ae197Form');if(!form)return;
 form.querySelectorAll('[data-ae-referral]').forEach(n=>n.hidden=!document.getElementById('v81Referrer')?.value);
 form.querySelectorAll('[data-ae-coordinator]').forEach(n=>n.hidden=document.getElementById('ae197Coordination')?.value!==DR187_COORDINATOR_MODES.pm);
 const task=TODOS.find(t=>t.id===form.dataset.task),approval=V68_APPROVALS.includes(task.type)||!!document.getElementById('v81Referrer')?.value;
 const button=document.querySelector('[data-act="v81SaveTodoEdit"]');if(button)button.textContent=approval?(task.status==='已驳回'?'修改并重新提交审批':'保存并提交审批'):(task.status==='已驳回'?'修改并重新提交':'保存修改');
}
document.addEventListener('input',event=>{if(event.target.matches('#ae197Picker input[type="search"]')){const q=event.target.value.trim().toLowerCase();document.querySelectorAll('[data-ae-search]').forEach(n=>n.hidden=!n.dataset.aeSearch.includes(q));}});
document.addEventListener('change',event=>{if(['v81Referrer','ae197Coordination'].includes(event.target.id))ae197Conditional();});
const ae197HandleBase=handleAct;
handleAct=function(button){
 const action=button?.dataset?.act,form=document.getElementById('ae197Form');
 if(action==='ae197Person'&&form){const picker=document.getElementById('ae197Picker');document.getElementById('v81SM').value=button.dataset.name;picker.querySelector('[data-ae-selected]').textContent=button.dataset.name;picker.open=false;return;}
 if(action!=='v81SaveTodoEdit'||!form)return ae197HandleBase(button);
 if(v69UploadsBusy())return toast('附件正在上传，请稍候');button.disabled=true;
 try{
  const task=TODOS.find(t=>t.id===form.dataset.task),values={summary:document.getElementById('v81Summary').value,note:document.getElementById('v81Note').value,attachments:v69UploadValues('todo-edit-'+form.dataset.task),allocation:{sm:document.getElementById('v81SM').value,referrer:document.getElementById('v81Referrer')?.value||'',reason:document.getElementById('v81Reason')?.value||''}};
  if(ae197Design(task)){values.expectedCompletionAt=document.getElementById('ae197Expected').value;values.coordination={mode:Object.keys(DR187_COORDINATOR_MODES).find(k=>DR187_COORDINATOR_MODES[k]===document.getElementById('ae197Coordination').value),person:document.getElementById('ae197Coordinator').value};}
  const result=v81SubmitTodoEdit(form.dataset.task,values,button.dataset.revision);document.getElementById('mask').classList.remove('on');markPagesDirty();openPage(page);toast(result.changed?'待办已更新，已重新通知待办人':'内容未修改');
 }catch(error){toast(error.message);}finally{button.disabled=false;}
};
// Referral is an approval route even though its personnel are selected inside
// the regional-allocation form. Approval editors use the same eligibility rule.
const ae197ValidateBase=v68ValidateAllocation;
v68ValidateAllocation=function(data){
 if(data.mode==='referral'){
  if(!String(data.referrer||'').trim())return '请选择转介绍人';
  return ae197ValidateBase({...data,mode:'normal'});
 }
 return ae197ValidateBase(data);
};
const ae197CreateBase=v68SubmitAllocationData;
v68SubmitAllocationData=function(data){
 if(data.mode!=='normal'||!data.referrer)return ae197CreateBase(data);
 assertProjectAllocationActor(data);
 const allocation={...v3Copy(data),mode:'referral'},error=v68ValidateAllocation(allocation)||v68AllocationConflict(data.project,data.cat,data.sm);if(error)throw Error(error);
 const p=findProject(data.project);
 return addChainTodo({type:V68_APPROVALS[1],title:p[1]+'-'+data.cat,customer:p[7],project:p[0],region:v68Region(p),owner:V68_OFFICE,initiator:v17Owner(),cat:data.cat,cats:data.cat,smDept:data.cat,sm:data.sm,sourceTodoId:data.sourceTodoId,requestId:PROJECT_EXTRA[p[0]]?.requestId||'',allocation,assignmentManaged:true,allocation176:true});
};
const ae197ReferralDisplayBase=ua176ShowReferral;
ua176ShowReferral=function(...args){
 const result=ae197ReferralDisplayBase(...args),button=document.querySelector('[data-act="ua176Submit"]');
 if(button&&V68.allocation?.mode==='normal')button.textContent=document.getElementById('ua176Referrer')?.value?'提交转介绍申请':'发起采购商机接单';
 if(button&&V68.allocation?.mode==='cross')button.textContent='提交跨区域申请';
 return result;
};
const ae197AcceptBase=v68CreateOpportunity;
v68CreateOpportunity=function(task){
 if(task?.type==='确认商机'&&task.allocation?.referrer&&!task.createdOppId&&!ae197Design(task))throw Error('转介绍分配需总经办审批，请由发起人编辑原待办并重新提交审批');
 return ae197AcceptBase(task);
};
