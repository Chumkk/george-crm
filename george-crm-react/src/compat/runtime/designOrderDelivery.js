/* A confirmed design order is the handoff to GDS. Drawing review is per file. */
const DR185_TYPES=['平面设计图','3D意向图','全屋3D图','其他图'];
const DR186_GROUPS={'平面设计图':'planDesignFiles','3D意向图':'intent3DFiles','全屋3D图':'wholeHouse3DFiles','其他图':'otherDesignFiles'};
function dr186FileType(file){return DR185_TYPES.includes(file?.designDrawingType)?file.designDrawingType:DR185_TYPES.includes(file?.drawingType)?file.drawingType:'其他图';}
function dr186GroupLegacy(bag){
 if(!bag||Array.isArray(bag.legacyDesignFiles186))return false;
 for(const key of Object.values(DR186_GROUPS))bag[key]||=[];
 for(const file of bag.designFile||[]){const list=bag[DR186_GROUPS[dr186FileType(file)]];if(!list.some(f=>file.id&&f.id===file.id||file.url&&f.url===file.url||!file.id&&!file.url&&f.name===file.name))list.push({...v3Copy(file),designDrawingType:dr186FileType(file)});}
 // Retain the original group as a migration snapshot; current editing uses only the four groups.
 bag.legacyDesignFiles186=v3Copy(bag.designFile||[]);return true;
}
function dr186OrderInfo(task){
 const source=TODOS.find(t=>t.id===task.sourceTodoId),order=ORDERS.find(o=>o[15]===task.project&&(o[0]===task.order||o[18]?.quoteCode&&o[18].quoteCode===task.draft||task.opp&&orderOppOf(o)===task.opp&&(o[2]==='设计单'||o[18]?.kind==='design')));
 if(order){const opp=oqOpp(orderOppOf(order)),meta=V3.meta[order[18]?.quoteCode],fields=meta?.submitted?.designFields||order[18]?.publishedQuote?.contents?.designFields||order[18]?.workingFields||{};return {order:order[0],quote:order[18]?.quoteCode,quoteRevision:order[18]?.erpRequestedRevision||meta?.revision||'',versionId:meta?.currentQuoteVersion||'',project:task.project,opportunity:orderOppOf(order),name:order[6],amount:order[10],designer:opp?.[7]||source?.owner||task.owner,attachments:v3Copy(fields.attachments||[]),note:fields.gdsRemark||fields.note||''};}
 return {order:'',project:task.project,opportunity:task.opp||source?.opp||'',name:task.title||'',amount:'',designer:task.type==='设计确认待办'?task.initiator:task.owner,attachments:v3Copy(task.needInfo?.attachments||source?.needInfo?.attachments||[]),note:task.needInfo?.note||task.handoff?.need||source?.needInfo?.note||'',legacy:true};
}
function dr186UpgradeTask(task){
 if(!task||task.drawingWorkflow185||!['设计待办','设计确认待办'].includes(task.type)||!PROJECTS.some(p=>p[0]===task.project)||task.retiredWorkflow135||task.archivedProductDesign173||task.status==='已取消')return false;
 task.legacyDesignSnapshot186=v3Copy(task);const info=dr186OrderInfo(task);
 task.drawingWorkflow185=true;task.designOpportunity=true;task.order=info.order||task.order||'';task.opp=info.opportunity||task.opp||'';
 if(task.type==='设计待办')task.needInfo={designOrder:info};
 else{
  const submitted=[task.handoff?.attachments,task.submittedSnapshot?.attachments].find(files=>Array.isArray(files)&&files.length)||[];
  task.drawings=submitted.map((file,i)=>({id:task.id+':legacy-drawing:'+i,type:dr186FileType(file),file:v3Copy(file),note:'',revision:1,status:task.status==='已处理'?'已确认':task.status==='已驳回'?'已驳回':'待确认',reason:task.status==='已驳回'?task.rejectReason||task.approvalNote||'历史驳回记录':'' ,history:task.status==='待处理'?[]:[{action:task.status==='已处理'?'confirm':'reject',by:task.approver||'',time:task.approveTime||'',revision:1,reason:task.rejectReason||'',file:v3Copy(file)}]}));
  task.handoff={...(task.handoff||{}),designOrder:info};
  if(task.status==='已驳回'){task.status='待处理';delete task.rejectReason;}
 }
 return true;
}
function dr185Source(task){return !!task?.drawingWorkflow185;}
function dr185Actor(){return typeof GDS171!=='undefined'&&GDS171.receipt?.actor||v17Owner();}
function dr185Can(task,designer=false){return !!task&&(typeof v21SuperAdmin==='function'&&v21SuperAdmin()||dr185Actor()===(designer?task.initiator:task.owner)||!designer&&task.coordination?.mode==='pm'&&dr185Actor()===task.coordination.person||!designer&&GDS171.receipt?.task===task.id&&task.coordination?.mode==='designer'&&dr185Actor()===task.coordination.gdsPerson);}
const DR187_COORDINATOR_MODES={designer:'是，由设计师安排',pm:'是，我安排人员',self:'否，我自己确认'};
function dr187People(){return [...new Set([...(typeof PMS!=='undefined'?PMS:[]),...DESIGNERS,...PROJECTS.map(p=>p[9]),...(typeof V68_SMS!=='undefined'?V68_SMS.map(s=>s.name):[])].filter(n=>n&&n!=='-'))];}
function dr187Coordination(value){
 const mode=value?.mode;if(!Object.hasOwn(DR187_COORDINATOR_MODES,mode))throw Error('请选择是否需要协调员');
 const person=mode==='pm'?String(value.person||'').trim():'';if(mode==='pm'&&!dr187People().includes(person))throw Error('请选择有效的协调员');
 return {mode,person};
}
function dr187Assignment(opp){const task=TODOS.find(t=>t.id===opp?.[20]?.approvalTodo)||TODOS.find(t=>t.createdOppId===opp?.[0]&&t.type==='确认商机');return {expectedCompletionAt:task?.expectedCompletionAt||opp?.[20]?.expectedCompletionAt||'',coordination:v3Copy(task?.coordination||opp?.[20]?.coordination||{mode:'self',person:''})};}
function dr187CoordinatorHtml(task){const c=task.coordination||{mode:'self'};return `<div class="dr187-assignment"><div><span>设计期望完成时间</span><strong>${esc(task.expectedCompletionAt?tfFormat(task.expectedCompletionAt):'未设置')}</strong></div><div><span>协调员安排</span><strong>${esc(DR187_COORDINATOR_MODES[c.mode]||DR187_COORDINATOR_MODES.self)}</strong></div>${c.person||c.gdsPerson?`<div><span>协调员</span><strong>${esc(c.person||c.gdsPerson)}</strong></div>`:''}<small>协调员将协助与客户确认设计图纸，完成设计确认待办。</small></div>`;}
function dr185Event(task,event,drawing,recipient,reason=''){
 task.drawingEvents=[...(task.drawingEvents||[]),{id:task.id+':'+((task.drawingEvents||[]).length+1),event,drawing:drawing.id,name:drawing.file.name,revision:drawing.revision,recipient,reason,by:dr185Actor(),time:todoStamp()}];
}
function dr185Ensure(order){
 const opp=oqOpp(orderOppOf(order));if(opp?.[20]?.kind!=='design'||!order[18]?.erpRequestedRevision)return null;
 const prior=TODOS.find(t=>t.type==='设计待办'&&t.project===order[15]&&t.order===order[0]);if(prior)return prior;
 const meta=V3.meta[order[18].quoteCode],submitted=meta?.submitted||{},fields=submitted.designFields||{};
 if(!order[0]||!(Number(String(order[10]).replace(/[^\d.-]/g,''))>0))throw Error('设计单号或设计费用不完整，请核对设计单');
 const snapshot={order:order[0],project:order[15],opportunity:opp[0],amount:order[10],designer:opp[7],attachments:v3Copy(fields.attachments||[]),note:String(fields.gdsRemark||fields.note||'')};
 const task=addChainTodo({type:'设计待办',title:findProject(order[15])[1]+' · 设计单交付',project:order[15],customer:opp[6],region:opp[5],owner:opp[7],initiator:projectPmOf(order[15]),opp:opp[0],order:order[0],draft:order[18].quoteCode,sourceTodoId:oqEnsureTodo(opp).id,requestId:'design-order:'+order[0],assignmentManaged:true,designOpportunity:true,drawingWorkflow185:true,...dr187Assignment(opp),gdsCompleted:false,needInfo:{designOrder:snapshot}});
 opp[20].designTodoId=task.id;order[18].designTodoId=task.id;gds171Queue(task);return task;
}
// Acceptance only opens quotation work. Historical design tasks remain intact.
ua176EnsureDesign=function(opp){return TODOS.find(t=>t.type==='设计待办'&&t.opp===opp?.[0])||null;};
const dr185ConfirmBase=oqConfirmQuote;
oqConfirmQuote=function(code,revision){return bs131Atomic(()=>{const order=dr185ConfirmBase(code,revision);dr185Ensure(order);return order;});};
// PM supplies the delivery expectation and coordinator arrangement with allocation.
dw132CreateOpportunities=function(project,names,sourceTodoId='',token='',options={}){
 if(!names.length||names.some(n=>!ua176Supervisors().includes(n)))throw Error('请选择设计师主管');
 const expectedCompletionAt=tfExpected(options.expectedCompletionAt),coordination=dr187Coordination(options.coordination);
 return bs131Atomic(()=>{const tasks=dqAllocateBase(project,names,sourceTodoId,token,options);for(const task of tasks){if(!task.allocation176){task.expectedCompletionAt=expectedCompletionAt;task.coordination=v3Copy(coordination);Object.assign(task.allocation||={}, {expectedCompletionAt,coordination:v3Copy(coordination)});}task.allocation176=true;}return tasks;});
};
ua181InvitationDeadline=dr187CoordinatorHtml;
if(typeof MODALS!=='undefined'&&MODALS.confirmTodo){const base=MODALS.confirmTodo.html;MODALS.confirmTodo.html=function(...args){return base.apply(this,args).replace('承接后同时生成设计待办和报价待办，两项可并行办理。','承接后生成商机和报价待办，设计单确认报价后生成设计待办。');};}
const dr185AllocationBase=v68Allocation;
v68Allocation=function(...args){const result=dr185AllocationBase(...args);if(V68.allocation?.mode==='design'){const saved=UA176.drafts.design||{},c=saved.coordination||{};document.getElementById('ua176Form')?.insertAdjacentHTML('beforeend',`<label class="full">是否需要协调员 <b>*</b><select id="dr187CoordinatorMode" aria-label="是否需要协调员"><option value="">请选择</option>${Object.entries(DR187_COORDINATOR_MODES).map(([key,label])=>`<option value="${key}" ${key===c.mode?'selected':''}>${label}</option>`).join('')}</select><small>协调员将协助与客户确认设计图纸，完成设计确认待办。</small></label><label class="full" id="dr187PersonField" ${c.mode==='pm'?'':'hidden'}>协调员 <b>*</b><select id="dr187CoordinatorPerson" aria-label="协调员">${selectOpts(dr187People(),c.person||'')}</select></label>`);}return result;};
const dr187CaptureBase=ua176CaptureAllocation;ua176CaptureAllocation=function(){const mode=document.getElementById('dr187CoordinatorMode')?.value,person=document.getElementById('dr187CoordinatorPerson')?.value||'';dr187CaptureBase();if(V68.allocation?.mode==='design'&&UA176.drafts.design)UA176.drafts.design.coordination={mode,person};};
function dr185Normalize(drawings){
 if(!Array.isArray(drawings)||!drawings.length)throw Error('请至少回传一张图纸');
 const ids=new Set();return drawings.map(d=>{
  const id=String(d.id||'').trim(),type=String(d.type||''),file=d.file||d.attachment;
  if(!id||ids.has(id))throw Error('图纸标识缺失或重复');ids.add(id);
  if(!DR185_TYPES.includes(type))throw Error('请选择有效的图纸类型');
  if(!file||typeof file.name!=='string'||!file.name.trim())throw Error('每张图纸需要一个有效附件');
  if(typeof dqFiles==='function')dqFiles([file]);
  return {id,type,file:v3Copy(file),note:String(d.note||''),revision:1,status:'待确认',history:[]};
 });
}
function dr185Submit(task,data){
 if(!dr185Source(task)||task.type!=='设计待办'||!mgDesignCanHandle(task)||task.status!=='待处理')throw Error('当前设计待办不可回传图纸');
 const drawings=dr185Normalize(data.drawings),coordination=v3Copy(task.coordination||{mode:'self',person:''});
 if(coordination.mode==='designer'&&data.coordinatorConfirmed){if(!GDS171.receipt||!String(data.coordinator||'').trim())throw Error('请由 GDS 回传协调员及图纸确认结果');coordination.gdsPerson=String(data.coordinator).trim();for(const d of drawings){d.status='已确认';d.reviewedBy=coordination.gdsPerson;d.reviewedAt=todoStamp();d.history.push({action:'confirm',by:d.reviewedBy,time:d.reviewedAt,revision:1,source:'GDS'});}}
 return bs131Atomic(()=>{
  const p=findProject(task.project);if(!p?.[9])throw Error('项目尚未设置项目经理');
  task.designSubmission=(task.designSubmission||0)+1;task.designSubmissions=[...(task.designSubmissions||[]),{revision:task.designSubmission,time:todoStamp(),by:dr185Actor(),contents:{drawings:v3Copy(drawings)}}];
  let review=TODOS.find(t=>t.id===task.reviewTodoId&&t.sourceTodoId===task.id&&t.status==='待处理');
  if(review){for(const d of drawings){const old=review.drawings.find(x=>x.id===d.id);if(old&&JSON.stringify(old.file)!==JSON.stringify(d.file))throw Error('已有图纸请按原图纸驳回重提，不可覆盖');if(!old)review.drawings.push(d);}review.coordination=coordination;review.editRevision=(review.editRevision||0)+1;}
  else review=addChainTodo({type:'设计确认待办',title:p[1]+' · 设计图纸确认',project:task.project,customer:task.customer,opp:task.opp,order:task.order,draft:task.draft,owner:p[9],initiator:task.owner,sourceTodoId:task.id,requestId:task.requestId,designSubmission:task.designSubmission,assignmentManaged:true,designOpportunity:true,drawingWorkflow185:true,coordination,expectedCompletionAt:task.expectedCompletionAt||'',drawings,handoff:{designOrder:v3Copy(task.needInfo.designOrder)},submittedSnapshot:{drawings:v3Copy(drawings)},editRevision:0});
  task.reviewTodoId=review.id;task.coordination=coordination;gds171Queue(task,'drawings-delivered');gds171Queue(review);return review;
 });
}
function dr187Sync(review,revision){
 if(!dr185Can(review)||review.type!=='设计确认待办'||review.status!=='待处理')throw Error('当前设计确认待办不可同步');
 if(Number(revision)!==Number(review.editRevision||0))throw Error('图纸已更新，请重新核对');
 if(!review.drawings.length||review.drawings.some(d=>d.status!=='已确认'))throw Error('请先确认全部图纸');
 return bs131Atomic(()=>{dr185Archive(review);gds171Queue(review,'complete');return review;});
}
function dr187GdsComplete(task){
 if(!GDS171.receipt||task.type!=='设计待办'||GDS171.receipt.actor!==task.owner)throw Error('设计待办由 GDS 完成回执结束');
 if(task.status==='已处理'&&task.gdsCompleted)return task;
 if(task.status!=='待处理')throw Error('当前设计待办不可完成');
 Object.assign(task,{status:'已处理',gdsCompleted:true,approver:dr185Actor(),approveTime:todoStamp(),completionReason:'GDS 已完成设计任务'});gds171Queue(task,'complete');return task;
}
function dr185Archive(review){
 const files=review.drawings.map(d=>({...v3Copy(d.file),designDrawingId:d.id,designDrawingType:d.type,designReviewId:review.id,designOrder:review.order,revision:d.revision}));
 const groups=PROJECT_FILES[review.project]||={};dr186GroupLegacy(groups);
 for(const [type,key] of Object.entries(DR186_GROUPS))groups[key]=[...(groups[key]||[]).filter(f=>f.designReviewId!==review.id),...files.filter(f=>f.designDrawingType===type)];
 // Compatibility aggregate is never shown as a separate upload field.
 groups.designFile=[...(groups.designFile||[]).filter(f=>f.designReviewId!==review.id),...files];
 const extra=PROJECT_EXTRA[review.project]||={};extra.designDrawingReviews={...(extra.designDrawingReviews||{}),[review.id]:{order:review.order,by:dr185Actor(),time:todoStamp(),drawings:v3Copy(review.drawings)}};
 if(typeof calculateProjectScore==='function'&&typeof writeProjectExtra==='function'){
  const previous=wizardState;try{wizardState={...previous,project:extra.formData||{},files:groups,customer:customerRecordToWizard(findCustomerByName(findProject(review.project)[7])||[])};writeProjectExtra(review.project,extra.formData||{},calculateProjectScore());}finally{wizardState=previous;}
 }
 Object.assign(review,{status:'已处理',approver:dr185Actor(),approveTime:todoStamp(),confirmedSnapshot:{drawings:v3Copy(review.drawings)},completionReason:'全部图纸已确认并同步项目信息'});
}
function dr185Review(review,id,action,revision,reason=''){
 if(!dr185Source(review)||review.type!=='设计确认待办'||!dr185Can(review)||review.status!=='待处理')throw Error('当前设计确认待办不可办理');
 if(review.coordination?.mode==='designer'&&!GDS171.receipt)throw Error('本批图纸由 GDS 协调员确认，CRM 负责同步项目信息');
 if(!['confirm','reject'].includes(action))throw Error('图纸确认动作无效');
 const drawing=review.drawings.find(d=>d.id===id);if(!drawing||drawing.revision!==Number(revision))throw Error('图纸已更新，请重新打开');
 if(drawing.status==='已确认'&&action==='confirm')return review;
 if(drawing.status!=='待确认')throw Error('此图纸不在待确认状态');
 if(action==='reject'&&!String(reason).trim())throw Error('请填写这张图纸的驳回原因');
 return bs131Atomic(()=>{
  review.drawings=v3Copy(review.drawings);const d=review.drawings.find(d=>d.id===id);
  const result={action,by:dr185Actor(),time:todoStamp(),revision:d.revision,reason:String(reason).trim(),file:v3Copy(d.file)};
  d.history.push(result);Object.assign(d,{status:action==='confirm'?'已确认':'已驳回',reason:result.reason,reviewedBy:result.by,reviewedAt:result.time});
  dr185Event(review,action,d,review.initiator,result.reason);review.editRevision=(review.editRevision||0)+1;
  gds171Queue(review,action==='reject'?'drawing-rejected':review.status==='已处理'?'complete':'drawing-confirmed');return review;
 });
}
function dr185Resubmit(review,data,expectedRevision){
 if(!dr185Source(review)||!dr185Can(review,true)||review.status!=='待处理')throw Error('请由原设计师重提被驳回的图纸');
 if(Number(expectedRevision)!==Number(review.editRevision||0))throw Error('待办已更新，请重新打开');
 const updates=dr185Normalize(data.drawings);
 const missingLegacy=review.legacyDesignSnapshot186&&!review.drawings.length;
 for(const update of updates){const old=review.drawings.find(d=>d.id===update.id);if(!missingLegacy&&(!old||old.status!=='已驳回'))throw Error('只能重提本次待办中被驳回的图纸');}
 return bs131Atomic(()=>{
  review.drawings=v3Copy(review.drawings);
  if(missingLegacy)review.drawings=updates.map(d=>({...v3Copy(d),revision:0,status:'已驳回'}));
  for(const update of updates){const d=review.drawings.find(d=>d.id===update.id),history=[...d.history,{action:'resubmit',by:dr185Actor(),time:todoStamp(),revision:d.revision,file:v3Copy(d.file),reason:d.reason}];Object.assign(d,update,{revision:d.revision+1,history,reason:'',reviewedBy:'',reviewedAt:''});dr185Event(review,'resubmit',d,review.owner);}
  review.editRevision=(review.editRevision||0)+1;review.lastEdit={actor:dr185Actor(),time:todoStamp(),fromStatus:'待处理'};gds171Queue(review,'drawings-resubmitted');return review;
 });
}
const dr185CompleteBase=dw132CompleteDesign;dw132CompleteDesign=function(task,data){return dr185Source(task)?dr185Submit(task,data):dr185CompleteBase(task,data);};
const dr185ResubmitBase=mgResubmitReview;mgResubmitReview=function(task,data,revision){return dr185Source(task)?dr185Resubmit(task,data,revision):dr185ResubmitBase(task,data,revision);};
const dr185QueueBase=gds171Queue;
gds171Queue=function(task,action='upsert'){
 if(!dr185Source(task))return dr185QueueBase(task,action);
 const state=task.gds||={revision:0,requests:[],receipts:[]},payload={task:task.id,project:task.project,opportunity:task.opp,order:task.order,type:task.type,owner:task.owner,initiator:task.initiator,status:task.status,sourceTodoId:task.sourceTodoId||'',designSubmission:task.designSubmission||0,editRevision:task.editRevision||0,expectedCompletionAt:task.expectedCompletionAt||'',coordination:v3Copy(task.coordination||{mode:'self',person:''}),contents:v3Copy(task.type==='设计待办'?task.needInfo:{designOrder:task.handoff.designOrder,drawings:task.drawings})};
 const signature=JSON.stringify([action,payload]);if(state.signature===signature)return;
 state.revision++;state.signature=signature;state.requests.push({id:task.id+':GDS:'+state.revision,revision:state.revision,action,time:todoStamp(),status:'待同步',localOnly:true,payload});
};
const dr185ReceiveBase=gds171Receive;
gds171Receive=function(receipt){
 const task=TODOS.find(t=>t.id===receipt?.task);if(!dr185Source(task))return dr185ReceiveBase(receipt);
 const designer=task.type==='设计待办'||receipt.action==='resubmit',actor=designer?(task.type==='设计待办'?task.owner:task.initiator):task.coordination?.mode==='designer'?task.coordination.gdsPerson:task.owner,state=task.gds;
 if(receipt.system!=='GDS'||!receipt.eventId||!state||receipt.actor!==actor)throw Error('GDS 回执的系统、任务或处理人不一致');
 if(receipt.project&&receipt.project!==task.project||receipt.order&&receipt.order!==task.order||receipt.opportunity&&receipt.opportunity!==task.opp)throw Error('GDS 回执关联的项目、商机或设计单不一致');
 const duplicate=state.receipts.find(r=>r.eventId===receipt.eventId);if(duplicate)return v3Copy(duplicate);
 if(receipt.revision!==state.revision)throw Error('GDS 回执版本已过期，请刷新最新任务');
 return bs131Atomic(()=>{let next;GDS171.receipt={task:task.id,actor:receipt.actor};try{
  if(task.type==='设计待办'&&receipt.action==='submit')next=dr185Submit(task,receipt.contents||{});
  else if(task.type==='设计待办'&&receipt.action==='payment-confirmed'){
   const order=ORDERS.find(o=>o[0]===task.order&&o[15]===task.project&&orderOppOf(o)===task.opp&&(o[2]==='设计单'||o[18]?.kind==='design')&&o[18]?.erpRequestedRevision);
   if(!order||!receipt.order||!receipt.opportunity||!receipt.project)throw Error('GDS 收款确认须关联已确认报价的精确项目、商机和设计单');
   if(!['待处理','已处理'].includes(task.status))throw Error('当前设计任务不可确认收款');
   task.gdsPaymentConfirmed||={eventId:receipt.eventId,time:todoStamp(),actor:receipt.actor,order:task.order,opportunity:task.opp,project:task.project};next=task;
  }
  else if(task.type==='设计待办'&&receipt.action==='complete'){if(receipt.contents?.drawings?.length)dr185Submit(task,receipt.contents);next=dr187GdsComplete(task);}
  else if(task.type==='设计确认待办'&&receipt.action==='resubmit')next=dr185Resubmit(task,receipt.contents||{},receipt.editRevision);
  else if(task.type==='设计确认待办'&&['confirm-drawing','reject-drawing'].includes(receipt.action))next=dr185Review(task,receipt.drawingId,receipt.action==='confirm-drawing'?'confirm':'reject',receipt.drawingRevision,receipt.reason);
  else throw Error('GDS 回执动作与待办类型不匹配');
 }finally{GDS171.receipt=null;}
 const result={eventId:receipt.eventId,revision:receipt.revision,action:receipt.action,actor:receipt.actor,time:todoStamp(),nextTask:next?.id||'',status:task.status};task.gds.receipts.push(result);return v3Copy(result);});
};
function dr185OrderHtml(task){const d=task.needInfo?.designOrder||task.handoff?.designOrder||{},valid=!!(d.order||task.order);return `<details class="dr185-order" ${task.type==='设计待办'?'open':''}><summary>设计单信息${valid?' · '+esc(d.order||task.order):''}</summary>${valid?`<dl><div><dt>设计单号</dt><dd>${esc(d.order||task.order)}</dd></div><div><dt>设计费用</dt><dd>${esc(d.amount||'未记录')}</dd></div><div><dt>商机编号</dt><dd>${esc(task.opp||'未记录')}</dd></div><div><dt>设计师主管</dt><dd>${esc(d.designer||task.owner)}</dd></div></dl>`:'<p>该记录产生于设计单关联前，原始资料已保留。</p>'}${d.attachments?.length?`<label>附件</label>${v69AttachmentList(d.attachments)}`:''}<label>备注</label><p>${esc(d.note||'—')}</p></details>${dr187CoordinatorHtml(task)}`;}

function dr185RowsHtml(drawings,editing=false){return drawings.map((d,i)=>editing?`<section class="dr185-drawing" data-dr-row data-drawing-id="${esc(d.id)}"><label>图纸类型<select data-dr-type>${DR185_TYPES.map(t=>`<option ${d.type===t?'selected':''}>${t}</option>`).join('')}</select></label>${v69UploadHtml('dr185File'+i,d.file?[d.file]:[],{max:1})}<label>说明<textarea data-dr-note>${esc(d.note||'')}</textarea></label>${d.reason?`<p class="dr185-reason">驳回原因：${esc(d.reason)}</p>`:''}</section>`:`<section class="dr185-drawing"><header><strong>${esc(d.type)}</strong><span class="dr185-state ${d.status==='已驳回'?'rejected':d.status==='已确认'?'confirmed':''}">${esc(d.status)}</span></header><h4>${esc(d.file.name)}</h4>${v69AttachmentList([d.file])}<p>${esc(d.note||'')}</p>${d.reason?`<p class="dr185-reason">驳回原因：${esc(d.reason)}</p>`:''}<small>第 ${d.revision} 版${d.reviewedBy?' · '+esc(d.reviewedBy)+' · '+esc(d.reviewedAt):''}</small>${d.history?.length?`<details class="dr185-history"><summary>审核记录（${d.history.length}）</summary>${d.history.map(h=>`<p>${esc(({confirm:'已确认',reject:'已驳回',resubmit:'已重提'})[h.action]||h.action)} · 第 ${h.revision} 版 · ${esc(h.by)} · ${esc(h.time)}${h.reason?'<br>'+esc(h.reason):''}</p>`).join('')}</details>`:''}${d.status==='待确认'?`<footer><button class="btn default" data-act="dr185Reject" data-drawing="${esc(d.id)}" data-revision="${d.revision}">驳回此图</button><button class="btn" data-act="dr185Confirm" data-drawing="${esc(d.id)}" data-revision="${d.revision}">确认此图</button></footer>`:''}</section>`).join('');}
function dr185Open(task,edit=false){
 DR185_UI.task=task.id;const review=task.type==='设计确认待办',drawings=task.drawings||[];
 if(!review)return v68Modal('设计中',`${dr185OrderHtml(task)}<p>${task.status==='已处理'?'GDS 已完成设计任务。':'GDS 处理中；回传图纸后，设计中任务仍保持待处理，完成结果以 GDS 回执为准。'}</p>${task.reviewTodoId?'<p>已生成关联设计定稿，可独立办理。</p>':''}`,`<button class="btn default" data-act="closeModal">关闭</button>`);
 if(edit&&!dr185Can(task,true))return toast('请由原设计师编辑被驳回的图纸');
 const selected=edit?(drawings.length?drawings.filter(d=>d.status==='已驳回'):DR185_TYPES.map((type,i)=>({id:task.id+':drawing:'+i,type}))):drawings,all=drawings.length&&drawings.every(d=>d.status==='已确认');
 v68Modal(edit?'编辑设计定稿':'设计定稿',`${dr185OrderHtml(task)}<div class="dr185-summary">已确认 ${drawings.filter(d=>d.status==='已确认').length} / ${drawings.length} 张 · 待确认 ${drawings.filter(d=>d.status==='待确认').length} 张 · 已驳回 ${drawings.filter(d=>d.status==='已驳回').length} 张</div>${task.coordination?.mode==='designer'?'<p>图纸由 GDS 协调员确认，PM 核对后同步项目信息。</p>':''}<div class="planned-form" id="dr185Form" data-id="${esc(task.id)}">${dr185RowsHtml(selected,edit)}</div>`,`<button class="btn default" data-act="closeModal">关闭</button>${edit?`<button class="btn" data-act="dr185SubmitEdit" data-revision="${task.editRevision||0}">重新提交图纸</button>`:task.status==='待处理'&&dr185Can(task)?`<button class="btn" data-act="dr187Sync" data-revision="${task.editRevision||0}" ${all?'':'disabled'}>同步到项目信息</button>`:''}`);
 if(task.status!=='待处理'||!dr185Can(task)||task.coordination?.mode==='designer')document.querySelectorAll('#dr185Form footer').forEach(n=>n.remove());
}

const DR185_UI={task:'',drawing:'',revision:0};
if(typeof tfTaskMeta==='function'){const base=tfTaskMeta;tfTaskMeta=function(task,now=Date.now()){const result=base(task,now);return dr185Source(task)?{...result,deadline:task.type==='设计待办'?tfDeadline(task,now):null}:result;};}
const dr185OpenBase=openPlannedTodoForm;openPlannedTodoForm=function(task){return dr185Source(task)?dr185Open(task):dr185OpenBase(task);};
const dr185EditBase=v81OpenTodoEdit;v81OpenTodoEdit=function(id){const task=TODOS.find(t=>t.id===id);return task?.type==='设计确认待办'?toast('设计图纸由 GDS 修改后回传，请通过查看并处理核对图纸'):dr185EditBase(id);};
const dr185TodoBase=todoActs;todoActs=function(task){
 if(!dr185Source(task))return dr185TodoBase(task).filter(a=>task?.type!=='设计确认待办'||!['v81EditTodo','mgReviewEdit'].includes(a.act));
 const actions=[{t:task.type==='设计待办'?'查看设计单':task.status==='待处理'?'查看并处理':'查看',act:'plannedTodoDo',primary:task.type==='设计确认待办'&&task.status==='待处理',extra:`data-id="${esc(task.id)}"`}];
 const remind=dr185TodoBase(task).find(a=>/催办/.test(a.t));if(remind)actions.push(remind);return actions;
};
function dr185Read(){return [...document.querySelectorAll('[data-dr-row]')].map((n,i)=>({id:n.dataset.drawingId,type:n.querySelector('[data-dr-type]').value,file:v69UploadValues('dr185File'+i)[0],note:n.querySelector('[data-dr-note]').value})).filter(d=>d.file);}
const dr185HandleBase=handleAct;handleAct=function(button){
 const a=button?.dataset?.act;
 if(a==='mgQuote'&&oqOpp(button.dataset.opp)?.[20]?.kind==='design')return dqOpenDesign(button.dataset.opp,'',button.dataset.id||'');
 if(a==='dr187Sync'){try{const task=TODOS.find(t=>t.id===DR185_UI.task);dr187Sync(task,button.dataset.revision);document.getElementById('mask').classList.remove('on');markPagesDirty();openPage(page);toast('图纸已同步到项目信息，设计确认待办已完成');}catch(error){toast(error.message);}return;}
 if(!a?.startsWith('dr185'))return dr185HandleBase(button);
 try{if(v69UploadsBusy())throw Error('附件正在上传，请稍候');const task=TODOS.find(t=>t.id===DR185_UI.task);if(!task)throw Error('待办不存在');
  if(a==='dr185Reject'){DR185_UI.drawing=button.dataset.drawing;DR185_UI.revision=Number(button.dataset.revision);return v68Modal('驳回设计图纸',`<label>驳回原因<textarea id="dr185Reason" aria-label="驳回原因"></textarea></label>`,`<button class="btn default" data-act="dr185Back">返回</button><button class="btn" data-act="dr185RejectSave">确认驳回此图</button>`);}
  if(a==='dr185Back')return dr185Open(task);
  if(a==='dr185Add'){const root=document.getElementById('dr185Form'),i=root.querySelectorAll('[data-dr-row]').length;root.insertAdjacentHTML('beforeend',dr185RowsHtml([{id:task.id+':drawing:'+crypto.randomUUID(),type:'其他图'}],true).replaceAll('dr185File0','dr185File'+i));return;}
  if(a==='dr185Confirm')dr185Review(task,button.dataset.drawing,'confirm',button.dataset.revision);
  if(a==='dr185RejectSave')dr185Review(task,DR185_UI.drawing,'reject',DR185_UI.revision,document.getElementById('dr185Reason').value);
  if(a==='dr185Submit'){const review=dr185Submit(task,{drawings:dr185Read()});markPagesDirty();openPage(page);return dr185Open(review);}
  if(a==='dr185SubmitEdit')dr185Resubmit(task,{drawings:dr185Read()},button.dataset.revision);
  markPagesDirty();openPage(page);dr185Open(task);toast(task.status==='已处理'?'已保存':'已保存图纸处理结果；全部确认后请同步项目信息');
 }catch(error){toast(error.message);}
};
if(typeof v72NotificationEvents==='function'){
 const base=v72NotificationEvents;v72NotificationEvents=function(before,after){const messages=base(before,after).filter(m=>!(dr185Source(after.todos?.[m.task])&&['todo-updated','todo-resubmitted'].includes(m.event)));for(const task of Object.values(after.todos||{})){if(!dr185Source(task))continue;const prior=new Set((before.todos?.[task.id]?.drawingEvents||[]).map(e=>e.id));for(const e of task.drawingEvents||[]){if(prior.has(e.id)||e.event==='confirm')continue;messages.push({event:'design-drawing-'+e.event,role:e.event==='resubmit'?'pm':'designer',recipient:e.recipient,initiator:e.by,type:task.type,target:'todo',task:task.id,project:task.project,opp:task.opp,order:task.order,title:e.event==='resubmit'?'设计图纸已重新提交':'设计图纸已驳回',status:'待处理',rejectReason:e.reason,body:e.name+' · 第 '+e.revision+' 版'+(e.reason?' · '+e.reason:''),localOnly:true});}}return messages;};
}
if(typeof window!=='undefined'&&window.CRMDesignIntegration)window.CRMDesignIntegration.receive=gds171Receive;
// Early product-scope migration must not hide an order-linked design delivery.
const dr185Repair=TODOS.filter(t=>t.drawingWorkflow185&&t.archivedProductDesign173&&ORDERS.some(o=>o[0]===t.order&&o[15]===t.project&&orderOppOf(o)===t.opp));
if(dr185Repair.length)bs131Atomic(()=>{for(const t of dr185Repair)delete t.archivedProductDesign173;});

function dr186Migrate(){
 const changed=TODOS.some(t=>!t.drawingWorkflow185&&['设计待办','设计确认待办'].includes(t.type)&&PROJECTS.some(p=>p[0]===t.project)&&!t.retiredWorkflow135&&!t.archivedProductDesign173&&t.status!=='已取消')||Object.values(PROJECT_FILES).some(b=>!Array.isArray(b.legacyDesignFiles186));
 if(!changed)return false;
 return bs131Atomic(()=>{for(const task of TODOS)dr186UpgradeTask(task);for(const bag of Object.values(PROJECT_FILES))dr186GroupLegacy(bag);return true;});
}
if(typeof window!=='undefined')try{dr186Migrate();}catch(error){toast('设计资料界面更新未保存，请重试：'+error.message);}
archiveDesignFields=function(project){const files=PROJECT_FILES[project]||{},form=PROJECT_EXTRA[project]?.formData||{};return `<div><span>设计状态</span><strong>${esc(mgDesignState(project)||'—')}</strong></div><div><span>客户图纸/附件</span><strong>${(files.drawingAttachment||[]).length} 份</strong></div>${Object.entries(DR186_GROUPS).map(([type,key])=>`<div><span>${type}</span><strong>${(files[key]||[]).length} 份</strong></div>`).join('')}<div><span>备注</span><strong>${esc(form.designNote||'未填写')}</strong></div>`;};
if(typeof projectDesignDocumentScore==='function')projectDesignDocumentScore=function(data,files){const ready=key=>Array.isArray(files?.[key])&&files[key].some(f=>f?.name&&(f.id||f.url||f.dataUrl||f.src));return (ready('drawingAttachment')?10:0)+(Object.values(DR186_GROUPS).some(ready)?20:0);};
if(typeof document!=='undefined'){const style=document.createElement('style');style.textContent='.dr185-order{padding:18px;background:#f5f9fc;border:1px solid #dce7ef;border-radius:10px;margin-bottom:20px}.dr185-order summary{cursor:pointer;font-weight:600}.dr185-order[open] summary{margin-bottom:16px}.dr185-order>label{display:block;font-size:12px;color:#7b8fa1}.dr185-history{margin-top:12px;font-size:12px;color:#748799}.dr185-history summary{cursor:pointer}.dr185-order dl{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin:0 0 16px}.dr185-order dt{font-size:12px;color:#7b8fa1}.dr185-order dd{margin:5px 0 0;font-weight:600}.dr185-drawing{padding:18px;border:1px solid #dce7ef;border-radius:10px;margin:12px 0}.dr185-drawing header,.dr185-drawing footer{display:flex;align-items:center;justify-content:space-between;gap:12px}.dr185-drawing footer{justify-content:flex-end;margin-top:12px}.dr185-drawing h4{margin:14px 0 10px}.dr185-state{color:#927018;background:#fff4d5;padding:4px 10px;border-radius:4px}.dr185-state.confirmed{color:#25845e;background:#e8f7ef}.dr185-state.rejected,.dr185-reason{color:#bf4b4b;background:#fff1f1}.dr185-reason{padding:10px;border-radius:5px}.dr185-summary{padding:12px 0;font-weight:600}.dr185-drawing>label{display:block;margin-bottom:12px}.dr185-drawing select,.dr185-drawing textarea{display:block;width:100%;margin-top:7px}';document.head.appendChild(style);}

const dr187OperateBase=v21CanOperate;v21CanOperate=function(task){return dr187OperateBase(task)||!!task&&task.type==='设计确认待办'&&task.coordination?.mode==='pm'&&task.coordination.person===v17Owner();};
if(typeof v21AllowedOwners==='function'){const base=v21AllowedOwners;v21AllowedOwners=function(){return [...new Set([...base(),...(v21SuperAdmin()?TODOS.map(t=>t.coordination?.person).filter(Boolean):[])])];};}
if(typeof v21Rows==='function'){const base=v21Rows;v21Rows=function(){const owners=new Set(v21Owners());return [...new Map([...base(),...visibleTodos().filter(t=>t.type==='设计确认待办'&&t.coordination?.mode==='pm'&&owners.has(t.coordination.person))].map(t=>[t.id,t])).values()];};}
const dr187AcceptedBase=v68CreateOpportunity;v68CreateOpportunity=function(task){const id=dr187AcceptedBase(task),opp=oqOpp(id);if(opp&&task.designOpportunity)Object.assign(opp[20],{expectedCompletionAt:task.expectedCompletionAt||'',coordination:v3Copy(task.coordination||{mode:'self',person:''})});return id;};
if(typeof bs131CreateAddon==='function'){const base=bs131CreateAddon;bs131CreateAddon=function(id,...args){return bs131Atomic(()=>{const result=base(id,...args),source=oqOpp(id);if(source?.[20]?.kind==='design'){const assignment=dr187Assignment(source);Object.assign(result[20],assignment);const accepted=TODOS.find(t=>t.id===result[20].approvalTodo);if(accepted)Object.assign(accepted,v3Copy(assignment));}return result;});};}
if(typeof mgTaskBusinessInfo==='function'){const base=mgTaskBusinessInfo;mgTaskBusinessInfo=function(task){return task.type==='费用订单待办'?{label:task.feeType||'费用订单'}:['设计待办','设计确认待办'].includes(task.type)?{label:'设计服务'}:base(task);};}
if(typeof todoSubject==='function'){const base=todoSubject;todoSubject=function(task){return task.type==='费用订单待办'?task.title:base(task);};}
document.addEventListener('change',event=>{if(event.target.id==='dr187CoordinatorMode'){const field=document.getElementById('dr187PersonField');if(field)field.hidden=event.target.value!=='pm';}});
if(typeof document!=='undefined'){const style=document.createElement('style');style.textContent='.dr187-assignment{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px;background:#f7f9fc;border-radius:8px;margin:16px 0}.dr187-assignment span{display:block;color:#789;font-size:12px;margin-bottom:6px}.dr187-assignment strong{font-weight:500}.dr187-assignment small{grid-column:1/-1;color:#789}';document.head.appendChild(style);}
function dr187Migrate(){
 const changes=TODOS.filter(t=>dr185Source(t)&&!t.deliveryPolicy187);if(!changes.length)return false;
 return bs131Atomic(()=>{for(const task of changes){
  const d=task.needInfo?.designOrder||task.handoff?.designOrder;
  if(d){task.previousDesignOrder187=v3Copy(d);for(const key of ['name','quote','quoteRevision','versionId','quotation'])delete d[key];}
  if(task.order&&ORDERS.some(o=>o[0]===task.order&&o[15]===task.project)){task.coordination||=dr187Assignment(oqOpp(task.opp)).coordination;}
  else if(task.legacyDesignSnapshot186)task.legacyDesignArchive187=true;
  task.deliveryPolicy187=true;
 }return true;});
}
if(typeof window!=='undefined')try{dr187Migrate();}catch(error){toast('设计资料升级未保存，请重试：'+error.message);}
if(typeof crmTodoEnabled==='function'){const base=crmTodoEnabled;crmTodoEnabled=function(value){return !value?.legacyDesignArchive187&&base(value);};}
if(typeof v72NotificationEvents==='function'){const base=v72NotificationEvents;v72NotificationEvents=function(before,after){const events=base(before,after);return events.flatMap(e=>{const t=after.todos?.[e.task];return t?.type==='设计确认待办'&&t.coordination?.mode==='pm'&&t.coordination.person&&t.coordination.person!==t.owner&&e.recipient===t.owner?[e,{...e,event:'coordinator-'+e.event,recipient:t.coordination.person,role:'pm'}]:[e];});};}
