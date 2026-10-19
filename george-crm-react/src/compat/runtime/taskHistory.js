/* Exact-task lifecycle evidence. Local prototype persistence; production audit
 * storage must be append-only on the server. Viewing never creates an event. */
const TH192 = { baseline: new Map(), busy: false };
const TH192_NAMES = {created:'发起待办',arrived:'到达记录',reminded:'催办',transferred:'转派',edited:'编辑资料',rejected:'驳回',resubmitted:'重新提交',completed:'完成待办',state:'状态变更',receipt:'GDS 回执',delivery:'回传设计图纸','drawing-confirm':'确认图纸','drawing-reject':'驳回图纸','drawing-resubmit':'重提图纸','quote-created':'创建报价','quote-submitted':'提交报价',initiator:'发起人交接'};
function th192Copy(value){return JSON.parse(JSON.stringify(value));}
function th192Time(value){return typeof tfTime==='function'?tfTime(value):null;}
function th192Text(value){return typeof value==='string'&&!['-','—'].includes(value.trim())?value.trim():'';}
function th192Event(task,kind,key,data={}){return {id:task.id+':'+key,evidence:key,kind,title:TH192_NAMES[kind]||kind,project:task.project||'',opportunity:task.opp||'',order:task.order||'',quotation:task.draft||'',at:'',actor:'',source:'CRM',fromStatus:'',toStatus:'',fromOwner:'',toOwner:'',reason:'',...data};}
function th192Changes(before={},after={}){
 const describe=value=>value===undefined||value===null||value===''?'未填写':Array.isArray(value)?value.map(v=>typeof v==='string'?v:v?.name||'附件').join('、'):typeof value==='object'?[value.person,value.sm,value.cat,value.reason].filter(Boolean).join(' · ')||'业务资料':String(value);
 return [['owner','待办人'],['sm','方案经理'],['summary','业务说明'],['note','备注'],['expectedCompletionAt','期望完成时间'],['attachments','附件'],['allocation','分配信息'],['coordination','协调员安排']].filter(([key])=>JSON.stringify(before[key])!==JSON.stringify(after[key])).map(([key,label])=>({label,before:describe(before[key]),after:describe(after[key])}));
}
function th192Evidence(t){
 const events=[],add=(kind,key,data)=>events.push(th192Event(t,kind,key,{legacy:true,...data}));
 for(const r of t.reminders||[])add('reminded','reminder:'+(r.messageId||r.at+':'+r.by),{at:r.at,actor:r.by,toOwner:r.to,detail:'催办当前负责人；通知结果与业务处理结果分别记录'});
 for(const r of t.ownerHistory||[])add('transferred','owner:'+JSON.stringify([r.time,r.from,r.to,r.actor]),{at:r.time,actor:r.actor,fromOwner:r.from,toOwner:r.to,reason:r.reason||''});
 for(const r of t.initiatorHistory||[])add('initiator','initiator:'+JSON.stringify([r.time,r.from,r.to,r.by]),{at:r.time,actor:r.by,detail:(r.from||'未记录')+' → '+(r.to||'未记录'),reason:r.reason||''});
 for(const r of t.editHistory||[]){
  const resubmit=r.fromStatus==='已驳回';
  add(resubmit?'resubmitted':'edited','edit:'+JSON.stringify([r.revision,r.time,r.actor]),{at:r.time,actor:r.actor,fromStatus:r.fromStatus,toStatus:'待处理',toOwner:r.after?.owner||r.after?.sm||'',reason:r.decision?.reason||'',changes:th192Changes(r.before,r.after),detail:resubmit?'修改原待办后重新提交':'更新原待办资料'});
 }
 if(['已处理','已驳回'].includes(t.status)&&th192Time(t.approveTime)!==null)add(t.status==='已处理'?'completed':'rejected','status:'+JSON.stringify([t.status,t.approveTime,t.editRevision||0]),{at:t.approveTime,actor:th192Text(t.approver),fromStatus:'待处理',toStatus:t.status,reason:t.status==='已驳回'?t.rejectReason||t.approvalNote||'':t.completionReason||'',source:t.gdsCompleted?'GDS':'CRM'});
 for(const r of t.gds?.receipts||[])add('receipt','receipt:'+r.eventId,{at:r.time,actor:r.actor,source:'GDS',detail:({submit:'回传设计图纸',complete:'GDS 完成设计任务',resubmit:'重新提交图纸',synchronize:'图纸同步',reject:'驳回图纸','confirm-drawing':'确认图纸回执','reject-drawing':'驳回图纸回执'})[r.action]||r.action,eventId:r.eventId});
 for(const r of t.designSubmissions||[])add('delivery','delivery:'+JSON.stringify([r.revision,r.time,r.by]),{at:r.time,actor:r.by,source:'GDS',detail:'回传第 '+r.revision+' 批设计图纸'});
 for(const d of t.drawings||[])for(const [i,r] of (d.history||[]).entries()){
  const kind={'confirm':'drawing-confirm','reject':'drawing-reject','resubmit':'drawing-resubmit'}[r.action];if(!kind)continue;
  add(kind,'drawing:'+d.id+':'+i+':'+r.action,{at:r.time,actor:r.by,source:r.source||((r.action==='resubmit'||t.coordination?.mode==='designer')?'GDS':'CRM'),reason:r.reason||'',detail:d.type+' · '+(r.file?.name||d.file?.name||d.id)+' · 图纸版本 '+(r.revision||1),drawingId:d.id});
 }
 const code=t.draft,meta=t.type==='报价待办'&&code&&typeof V3!=='undefined'&&V3.meta?.[code];
 if(meta&&meta.project===t.project&&(!t.opp||typeof oqQuoteOpp!=='function'||oqQuoteOpp(code)?.[0]===t.opp))for(const v of meta.quoteVersions||[])add('quote-submitted','quote:'+code+':'+v.id,{at:v.submittedAt,actor:v.submittedBy,quotation:code,detail:'已提交关联报价，保留原提交历史'});
 return events;
}
function th192Tracked(t){return {id:t.id,type:t.type,project:t.project,time:t.time||'',owner:t.owner,initiator:t.initiator,status:t.status,draft:t.draft||'',expectedCompletionAt:t.expectedCompletionAt||'',editRevision:t.editRevision||0,note:t.note||'',title:t.title||'',evidence:th192Evidence(t)};}
function th192Snapshot(){return new Map(TODOS.map(t=>[t.id,th192Tracked(t)]));}
function th192Merge(...groups){return [...new Map(groups.flat().filter(e=>e?.id&&e?.kind).map(e=>[e.evidence||e.id,e])).values()];}
function th192Stored(){try{return JSON.parse(localStorage.getItem('crm-flow-v3')||'{}').todos||[];}catch{return [];}}
function th192Archive(){try{return JSON.parse(localStorage.getItem('crm-task-history-v192')||'{}');}catch{return {};}}
function th192Archived(t,archive=th192Archive()){const saved=archive[t.id];return saved?.type===t.type&&saved?.project===t.project?saved.events||[]:[];}
function th192Delta(t,old,now,actor){
 const current=th192Tracked(t),events=[];
 if(!old)return [th192Event(t,'created','created',{at:now,actor,source:t.type==='设计确认待办'?'GDS':'CRM',toStatus:t.status,toOwner:t.owner,detail:'关联原业务生成待办，发起人 · '+(t.initiator||'未记录')}),...current.evidence.map(e=>({...e,legacy:false,businessAt:e.at,at:now,actor:e.actor||actor}))];
 const known=new Set(old.evidence.map(e=>e.evidence));
 for(const evidence of current.evidence)if(!known.has(evidence.evidence))events.push({...evidence,legacy:false,businessAt:evidence.at,at:now,actor:evidence.actor||actor});
 const add=(kind,key,data)=>events.push(th192Event(t,kind,key,{at:now,actor,...data}));
 if(t.type==='报价待办'&&current.draft&&current.draft!==old.draft)add('quote-created','quote-created:'+current.draft,{quotation:current.draft,detail:'创建并关联本商机报价'});
 if(old.owner!==t.owner&&!events.some(e=>e.kind==='transferred'))add('transferred','owner:'+JSON.stringify([now,old.owner,t.owner,actor]),{fromOwner:old.owner,toOwner:t.owner});
 if(old.status!==t.status&&!events.some(e=>e.toStatus===t.status)){
  const kind=t.status==='已驳回'?'rejected':t.status==='已处理'?'completed':old.status==='已驳回'&&t.status==='待处理'?'resubmitted':'state';
  add(kind,'status:'+JSON.stringify([t.status,t.approveTime||now,t.editRevision||0]),{fromStatus:old.status,toStatus:t.status,toOwner:t.owner,source:t.gdsCompleted?'GDS':'CRM',actor:th192Text(t.approver)||actor,reason:t.status==='已驳回'?t.rejectReason||t.approvalNote||'':t.completionReason||''});
 }
 const changed=['expectedCompletionAt','note','title'].filter(k=>old[k]!==current[k]);
 if((changed.length||old.editRevision!==current.editRevision)&&!events.some(e=>['edited','resubmitted','drawing-confirm','drawing-reject','drawing-resubmit','delivery'].includes(e.kind)))add('edited','observed-edit:'+JSON.stringify([now,current.editRevision,changed]),{detail:changed.length?'更新'+changed.map(k=>({expectedCompletionAt:'期望完成时间',note:'备注',title:'业务资料'})[k]).join('、'):'更新待办资料',fromStatus:old.status,toStatus:t.status});
 return events;
}
function th192Duration(start,end){if(start===null||end===null||end<start)return '未记录';const minutes=Math.floor((end-start)/60000);return minutes<1?'不足1分钟':minutes<60?minutes+'分钟':minutes<1440?Math.floor(minutes/60)+'小时'+(minutes%60?minutes%60+'分钟':''):Math.floor(minutes/1440)+'天'+(Math.floor(minutes%1440/60)?Math.floor(minutes%1440/60)+'小时':'');}
function th192Segments(task,events,now){
 const segments=[];let current=null;
 const close=at=>{if(current){segments.push({...current,end:at,duration:th192Duration(th192Time(current.start),th192Time(at))});current=null;}};
 for(const e of events){
  if(e.legacy||th192Time(e.at)===null)continue;
  if(e.kind==='created'){close(e.at);current={owner:e.toOwner||'',kind:'负责人处理',start:e.at};}
  else if(e.kind==='transferred'){close(e.at);current={owner:e.toOwner||'',kind:'负责人处理',start:e.at};}
  else if(e.kind==='rejected'){close(e.at);current={owner:task.originalInitiator||task.initiator||'',kind:'等待补充资料',start:e.at};}
  else if(e.kind==='resubmitted'){close(e.at);current={owner:e.toOwner||task.owner||'',kind:'负责人处理',start:e.at};}
  else if(e.kind==='completed')close(e.at);
 }
 if(current&&task.status!=='已处理')segments.push({...current,end:'',duration:th192Duration(th192Time(current.start),now),active:true});
 return segments;
}
function th192History(t,now=Date.now()){
 const events=th192Merge(th192Evidence(t),t.lifecycle192||[],th192Archived(t));
 if(!events.some(e=>e.kind==='created')){
  const arrival=typeof v21Arrival==='function'?v21Arrival(t):t.time;
  if(th192Time(arrival)!==null)events.push(th192Event(t,'arrived','arrival:'+arrival,{at:arrival,legacy:true,source:'历史字段',detail:'当前记录的到达时间；发起操作及当时处理人未记录'}));
 }
 events.sort((a,b)=>(th192Time(a.at)??Infinity)-(th192Time(b.at)??Infinity));
 const start=events.find(e=>e.kind==='created'&&th192Time(e.at)!==null);
 // Legacy tasks retain real arrival/handling fields even without a creation
 // audit event. Use those timestamps without inventing an actor or event.
 const saved=th192Archive()[t.id],archivedStart=saved?.type===t.type&&saved?.project===t.project?saved.startedAt:'';
 const originalArrival=th192Time(archivedStart)!==null?archivedStart:th192Time(t.time)!==null?t.time:events.find(e=>e.kind==='arrived'&&th192Time(e.at)!==null)?.at;
 const startedAt=start?.at||originalArrival||'',started=th192Time(startedAt);
 const finish=t.status==='已处理'?[...events].reverse().find(e=>e.kind==='completed'&&th192Time(e.at)!==null):null;
 let first=null,owner=start?.toOwner||t.owner;
 for(const e of events){
  const at=th192Time(e.at);if(at===null||started!==null&&at<started)continue;
  if(['rejected','completed','delivery','drawing-confirm','drawing-reject','quote-created','quote-submitted'].includes(e.kind)||e.actor&&e.actor===owner&&['edited','transferred'].includes(e.kind)){first=e;break;}
  if(e.kind==='transferred')owner=e.toOwner;
 }
 const reminders=events.filter(e=>e.kind==='reminded');
 const responses=reminders.map(e=>{const at=th192Time(e.at),next=at!==null&&events.slice(events.indexOf(e)+1).find(r=>!r.legacy&&th192Time(r.at)>=at&&r.actor===e.toOwner&&['edited','transferred','rejected','completed','delivery','drawing-confirm','drawing-reject','quote-created','quote-submitted'].includes(r.kind));return {reminder:e.id,at:e.at,respondedAt:next?.at||'',duration:next?th192Duration(at,th192Time(next.at)):'尚无实际办理记录'};});
 return {id:t.id,title:typeof crmTaskCategory==='function'?crmTaskCategory(t):t.type,subject:typeof todoSubject==='function'?todoSubject(t):t.title||'',project:t.project||'',order:t.order||'',status:t.status,owner:t.owner||'',initiator:t.initiator||'',events,segments:th192Segments(t,events,now),responses,summary:{total:th192Duration(started,t.status==='已处理'?th192Time(finish?.at):now),firstResponse:first?th192Duration(started,th192Time(first.at)):started!==null?'尚无实际办理记录':'未记录',startedAt,firstHandledAt:first?.at||'',basis:start?'发起记录':'已保存到达时间',reminders:reminders.length,transfers:events.filter(e=>e.kind==='transferred').length},partial:events.some(e=>e.legacy)||!start};
}
TH192.baseline=th192Snapshot();
const th192SaveBase=v3Save;
v3Save=function(...args){
 if(TH192.busy)return th192SaveBase(...args);
 TH192.busy=true;const backups=TODOS.map(t=>({task:t,had:Object.hasOwn(t,'lifecycle192'),log:t.lifecycle192})),stored=th192Stored(),archive=th192Archive();
 let beforeStorage,beforeArchive;try{beforeStorage=localStorage.getItem('crm-flow-v3');beforeArchive=localStorage.getItem('crm-task-history-v192');}catch{}
 const restore=()=>{for(const b of backups){if(b.had)b.task.lifecycle192=b.log;else delete b.task.lifecycle192;}try{for(const [key,value] of [['crm-flow-v3',beforeStorage],['crm-task-history-v192',beforeArchive]])if(value!==undefined){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}}catch{}};
 try{
  const now=new Date().toISOString(),actor=typeof GDS171!=='undefined'&&GDS171.receipt?.actor||(typeof v17Owner==='function'?v17Owner():'');
  for(const t of TODOS){const previous=stored.find(s=>s.id===t.id&&s.type===t.type&&s.project===t.project),baseline=TH192.baseline.get(t.id),saved=archive[t.id],same=saved?.type===t.type&&saved?.project===t.project;const log=th192Merge(t.lifecycle192||[],th192Delta(t,baseline,now,actor),previous?.lifecycle192||[],th192Archived(t,archive));const startedAt=[same&&saved.startedAt,baseline?.time,previous?.time,t.time].find(at=>th192Time(at)!==null)||'';if(log.length)t.lifecycle192=log;if(log.length||startedAt)archive[t.id]={type:t.type,project:t.project,startedAt,events:log};}
  const serialized=JSON.stringify(archive);if(serialized!==(beforeArchive||'{}'))try{localStorage.setItem('crm-task-history-v192',serialized);}catch{restore();return false;}
  const result=th192SaveBase(...args);if(!result){restore();return result;}TH192.baseline=th192Snapshot();return result;
 }catch(error){restore();throw error;}finally{TH192.busy=false;}
};
if(typeof bs131Atomic==='function'){
 const base=bs131Atomic;bs131Atomic=function(change){const before=TH192.baseline;try{return base(change);}catch(error){TH192.baseline=before;throw error;}};
}
