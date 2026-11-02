/* Reuse committed quotations without restoring standalone draft records. */
const ED235={pending:new Map(),serial:0,source:null,sources:[]};
function ed235Request(type,fields={}){return new Promise((resolve,reject)=>{
 const request='reuse-'+(++ED235.serial),timer=setTimeout(()=>{ED235.pending.delete(request);reject(Error('读取报价超时，请重试；当前工作稿未改变'));},12000);
 ED235.pending.set(request,{resolve,reject,timer});parent.postMessage({type,request,target:currentDraftCode,...fields},'*');
});}
window.addEventListener('message',event=>{const d=event.data;if(event.source!==parent||d?.type!=='qaReuseResult')return;const p=ED235.pending.get(d.request);if(!p)return;clearTimeout(p.timer);ED235.pending.delete(d.request);d.error?p.reject(Error(d.error)):p.resolve(d.payload);});
function ed235Close(){document.getElementById('ed235Reuse')?.close();document.getElementById('ed235Reuse')?.remove();ED235.source=null;}
async function ed235Load(){
 const content=document.querySelector('#ed235Reuse .ed235-body');if(!content)return;content.innerHTML='<p role="status">正在读取已提交报价…</p>';
 try{ED235.sources=await ed235Request('qaReuseList');if(!content.isConnected)return;content.innerHTML='<label class="ed235-search">查找来源报价<input id="ed235Search" type="search" placeholder="搜索项目、报价名称或编号"></label><p>只读取每张报价最近一次成功提交的内容；后续仅保存的修改不会带入。</p><div id="ed235Sources"></div>';document.getElementById('ed235Search').oninput=ed235List;ed235List();}
 catch(error){if(content.isConnected){content.innerHTML='<p role="alert">'+esc(error.message)+'</p><button class="btn" id="ed235Retry">重新加载</button>';document.getElementById('ed235Retry').onclick=ed235Load;}}
}
function ed235List(){const query=document.getElementById('ed235Search').value.trim().toLowerCase(),list=ED235.sources.filter(s=>[s.code,s.name,s.project,s.author].join(' ').toLowerCase().includes(query));document.getElementById('ed235Sources').innerHTML=list.map(s=>'<button type="button" class="ed235-source" data-source="'+esc(s.code)+'"><strong>'+esc(s.name)+'</strong><span>'+esc(s.project)+' · '+esc(s.code)+' · V'+s.revision+'</span><small>提交：'+esc(s.time)+' · '+esc(s.author)+' · '+edMoney(s.amount)+'</small></button>').join('')||'<p>没有符合条件且有权查看的已提交报价。</p>';document.querySelectorAll('[data-source]').forEach(button=>button.onclick=()=>ed235Select(button.dataset.source));}
async function ed235Select(code){
 const selected=ED235.sources.find(s=>s.code===code),content=document.querySelector('#ed235Reuse .ed235-body');if(!selected||!content)return;content.innerHTML='<p role="status">正在读取提交快照…</p>';
 try{const payload=await ed235Request('qaReuseSource',{code,version:selected.version});if(!content.isConnected)return;ED235.source=payload;
  content.innerHTML='<button type="button" class="btn" id="ed235Back">返回选择</button><h3>'+esc(payload.source.name)+' · V'+payload.source.revision+'</h3><p>'+esc(payload.source.time)+' · '+esc(payload.source.author)+' · '+edMoney(payload.source.amount)+'</p><p>将产品追加到下列目标空间。原有产品保留；不复制客户、商机、确认或 ERP 信息。完成后请核对当前价格，可用“撤销”恢复。</p>'+payload.spaces.map((s,i)=>'<section class="ed235-space"><label>'+esc(s.name)+' · '+s.products.length+' 项产品<select data-ed235-map="'+i+'"><option value="">不导入此空间</option>'+spaceNames().map(name=>'<option value="'+esc(name)+'" '+(name===s.name?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label><div class="ed235-products">'+s.products.map(p=>'<span>'+esc(p.name||p.sku)+'<small>'+esc(p.cat||'')+' · '+esc(p.sku||'')+' · '+esc(p.qty)+' × '+edMoney(p.price)+' = '+edMoney(p.amt)+'</small></span>').join('')+'</div></section>').join('')+'<p role="alert" id="ed235Error"></p>';
  document.getElementById('ed235Back').onclick=()=>{ED235.source=null;document.getElementById('ed235Import').hidden=true;ed235Load();};document.getElementById('ed235Import').hidden=false;
 }catch(error){if(content.isConnected){content.innerHTML='<p role="alert">'+esc(error.message)+'</p><button class="btn" id="ed235Retry">返回重新选择</button>';document.getElementById('ed235Retry').onclick=ed235Load;}}
}
function ed235MergeMaterials(a,b){const merged=e46Clone(a||{material1:[],material2:[]});for(const key of ['material1','material2']){merged[key]||=[];for(const row of b?.[key]||[]){const old=merged[key].find(r=>String(r[0]).toLowerCase()===String(row[0]).toLowerCase());if(old&&JSON.stringify(old)!==JSON.stringify(row))throw Error('材料辅助表“'+row[0]+'”与当前工作稿不同，请先核对后再复用');if(!old)merged[key].push(e46Clone(row));}}return merged;}
async function ed235Import(){
 const selected=ED235.source,button=document.getElementById('ed235Import');if(!selected||button.disabled)return;
 const mappings=[...document.querySelectorAll('[data-ed235-map]')].map(input=>({source:selected.spaces[+input.dataset.ed235Map].name,target:input.value})).filter(m=>m.target);
 if(!mappings.length){document.getElementById('ed235Error').textContent='请至少选择一个目标空间';return;}button.disabled=true;
 try{
  const latest=await ed235Request('qaReuseSource',{code:selected.source.code,version:selected.source.version});if(!button.isConnected)return;
  if(editing)commitEdit();const template=PIMS46.find(latest.templateId||latest.tpl),hasProducts=rows.some(e46Active);
  if(hasProducts&&template.id!==E46.template.id)throw Error('来源与当前工作稿模板不同，请选择相同模板的报价；空白报价可沿用来源模板');
  const materials=ed235MergeMaterials(hasProducts?E46.materials:null,latest.materials),next=e46Clone(rows),imports=[];
  for(const mapping of mappings){let heading='';for(const raw of latest.rows){if(raw.kind==='space'){heading=raw.type||raw.space;continue;}if((heading||raw.space)!==mapping.source||!e46Active(raw))continue;const row=e46Clone(raw),id='reuse-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));row.space=mapping.target;delete row.lineId;delete row.publicQuote;if(row._pims){row._pims.lineId=id;row._pims.category=row._pims.category||row.productSnapshot?.cat;for(const field of ['area_name','room_name'])if(Object.hasOwn(row._pims.cells||{},field))row._pims.cells[field]=mapping.target;}imports.push({target:mapping.target,row});}}
  if(!imports.length)throw Error('所选空间没有可复用的产品明细');
  for(const item of imports){const header=next.findIndex(r=>r.kind==='space'&&(r.type||r.space)===item.target);if(header<0)throw Error('目标空间已变化，请重新选择');let end=header+1;while(end<next.length&&next[end].kind!=='space')end++;next.splice(end,0,item.row);}
  pushHist();rows=next;E46.template=template;E46.materials=materials;e46Columns();renumber();renderGrid();edContext.reuseSources=[...(edContext.reuseSources||[]),{code:latest.source.code,version:latest.source.version,revision:latest.source.revision,mappings:e46Clone(mappings)}];edUpdateSummary();ed235Close();toast('已追加 '+imports.length+' 项产品到工作稿，请核对后保存或提交');
 }catch(error){const box=document.getElementById('ed235Error');if(box)box.textContent=error.message;else toast(error.message);}finally{if(button.isConnected)button.disabled=false;}
}
function ed235Open(){
 if(parent===window||!currentDraftCode)return toast('请从商机报价单进入后复用已提交报价');if(editing)commitEdit();ed235Close();const dialog=document.createElement('dialog');dialog.id='ed235Reuse';dialog.innerHTML='<header><div><strong>复用已提交报价</strong><small>最近提交快照 · 导入后自行核对价格</small></div><button class="btn" id="ed235Close">关闭</button></header><div class="ed235-body"></div><footer><button class="btn" id="ed235Cancel">取消</button><button class="btn green" id="ed235Import" hidden>追加至工作稿</button></footer>';document.body.append(dialog);dialog.showModal();document.getElementById('ed235Close').onclick=ed235Close;document.getElementById('ed235Cancel').onclick=ed235Close;document.getElementById('ed235Import').onclick=ed235Import;dialog.addEventListener('cancel',event=>{event.preventDefault();ed235Close();});ed235Load();
}
const ed235CollectBase=collectDraft;collectDraft=function(){const data=ed235CollectBase();if(edContext.reuseSources)data.reuseSources=e46Clone(edContext.reuseSources);return data;};
const ed235HistoryBase=e46History;e46History=function(){const snap=JSON.parse(ed235HistoryBase());snap.reuseSources=edContext.reuseSources||null;return JSON.stringify(snap);};
const ed235RestoreBase=e46RestoreHistory;e46RestoreHistory=function(raw){ed235RestoreBase(raw);const value=JSON.parse(raw).reuseSources;if(value)edContext.reuseSources=value;else delete edContext.reuseSources;edUpdateSummary();};
(()=>{
 const button=document.createElement('button');button.className='btn';button.type='button';button.textContent='复用已提交报价';button.onclick=ed235Open;document.querySelector('.ribbon').prepend(button);
 const flow=window.__CRM_INITIAL?.quotationWorkflow;if(flow){const status=document.createElement('div');status.className='ed235-workflow';status.textContent='报价 · '+flow.status+'　 ERP · '+flow.erpStatus+(flow.erpRequest?' / '+flow.erpRequest:'')+(flow.assistant?'　报价助理 · '+flow.assistant:'');status.title=flow.lockReason||'保存保留工作稿；提交发布报价、记录 ERP 请求并完成关联待办';document.querySelector('.actionbar').insertAdjacentElement('afterend',status);}
})();
