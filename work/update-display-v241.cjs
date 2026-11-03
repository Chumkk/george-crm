const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
function edit(file,fn){const p=path.join(root,file),old=fs.readFileSync(p,'utf8'),next=fn(old);if(next===old)throw Error('No change: '+file);fs.writeFileSync(p,next);}
const runtime='george-crm-react/src/compat/runtime/';
edit(runtime+'opportunityQuotes.js',s=>s.replace("i===2?tag(archived?", "i===0?esc(oqFormatOrderNumber(value,project)):i===2?tag(archived?"));
edit(runtime+'quoteRevision.js',s=>s
 .replace("oqOrder(quoteCode)?.[0]||quoteCode", "typeof oqQuotationNumber==='function'?oqQuotationNumber(quoteCode,project):oqOrder(quoteCode)?.[0]||quoteCode")
 .replace("</header><dl><div><dt>${skyT('提交时间','Submitted')}", "</header><dl><div><dt>${skyT('单号','Quotation No.')}</dt><dd>${esc(typeof oqHistoryNumber==='function'?oqHistoryNumber(v):v.orderNo||v.code||skyT('单号未记录','Not recorded'))}</dd></div><div><dt>${skyT('提交时间','Submitted')}")
 .replace("<span>${esc(v.name)}</span><span>${esc(v.submittedAt", "<span>${esc(v.name)}</span><span>${esc(typeof oqHistoryNumber==='function'?oqHistoryNumber(v):v.orderNo||v.code||'单号未记录')}</span><span>${esc(v.submittedAt")
 .replace('dialog.querySelector(\'[data-close]\').onclick=()=>dialog.close();',"dialog.querySelector('[data-close]').remove();")
 .replace("dialog.showModal();dialog.querySelector('[data-close]').focus();", "dialog.showModal();dialog.querySelector('[data-history-category]').focus();")
 .replace("dialog.querySelector('[data-history-media=\"close\"]').focus({preventScroll:true});return dialog;", "dialog.querySelector('.q128-history-media-head [data-history-media=\"close\"]')?.remove();dialog.querySelector('button:not([disabled])')?.focus({preventScroll:true});return dialog;"));
edit(runtime+'clientQuoteUpdates.js',s=>s.replaceAll("oqOrder(version.code)?.[0]||version.code", "typeof oqHistoryNumber==='function'?oqHistoryNumber(version):oqOrder(version.code)?.[0]||version.code"));
edit(runtime+'clientShare.js',s=>s.replace("number:oqOrder(code)?.[0]||code", "number:typeof oqQuotationNumber==='function'?oqQuotationNumber(code,project):oqOrder(code)?.[0]||code"));
edit(runtime+'workflows.js',s=>{
 s=s.replace("['报价单编码',code]", "['报价单号',typeof oqQuotationNumber==='function'?oqQuotationNumber(code,m.project):code]")
 .replace("销售订单 ${esc(b.orderNo)}", "销售订单 ${esc(typeof oqFormatOrderNumber==='function'?oqFormatOrderNumber(b.orderNo,m.project):b.orderNo)}");
 // Restrict legacy-card substitutions to their renderers; action attributes retain raw keys.
 for(const name of ['v15CopyResults','v16RecentDrafts','v18DraftRows','v19OrderRows']){
  const start=s.indexOf('function '+name+'(');if(start<0)throw Error(name);const end=s.indexOf('\n',start),line=s.slice(start,end);
  const next=line.replace('esc(r[0])','esc(oqQuotationNumber(r[0]))').replace('esc(d[0])','esc(oqQuotationNumber(d[0]))').replace('<small>${esc(d.code)}','<small>${esc(oqQuotationNumber(d.code,d.m.project))}').replace("'order',esc(o[0])", "'order',esc(oqFormatOrderNumber(o[0],o[15]))");
  if(next===line)throw Error('Missing visible number '+name);s=s.slice(0,start)+next+s.slice(end);
 }return s;
});
