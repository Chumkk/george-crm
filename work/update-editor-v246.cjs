const fs=require('fs'),path=require('path'),crypto=require('crypto'),root=path.resolve(__dirname,'..'),pub=path.join(root,'george-crm-react/public');
const original=fs.readFileSync(path.join(__dirname,'editor-v242.js'),'utf8');let script=original;
const start=script.indexOf(' const flow=window.__CRM_INITIAL?.quotationWorkflow;if(flow){');if(start<0)throw Error('Missing workflow strip');const end=script.indexOf('\n',start);script=script.slice(0,start)+' ed246Workflow(window.__CRM_INITIAL?.quotationWorkflow);'+script.slice(end);
const helper=String.raw`function ed246Workflow(flow){
 if(!flow)return;let status=document.querySelector('.ed235-workflow');if(!status){status=document.createElement('div');status.className='ed235-workflow';document.querySelector('.actionbar').insertAdjacentElement('afterend',status);}
 status.textContent='报价 · '+flow.status+(flow.workingSaved&&flow.publishedRevision?' · 需重新提交':'')+'　'+flow.erpStatus+(flow.erpRequest?'　ERP请求 · '+flow.erpRequest:'');
 status.insertAdjacentHTML('beforeend',ed238Roles({schemeManager:flow.schemeManager,quoteAssistant:flow.assistant||'未安排'}));status.title=[flow.lockReason,flow.erpNotice,'已提交报价再次暂存会激活原报价待办；提交发布报价、记录本版ERP请求并完成关联待办'].filter(Boolean).join('；');
}
window.addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='pimsSaveAck'&&event.data.durable&&event.data.quotationWorkflow)ed246Workflow(event.data.quotationWorkflow);});
`;
script=helper+'\n'+script;fs.writeFileSync(path.join(__dirname,'editor-v246.js'),script);
const base=fs.readFileSync(path.join(pub,'quote-editor-f43cfcfbee02.html'),'utf8'),html=base.replace('<script>'+original+'</script>','<script>'+script+'</script>');if(html===base)throw Error('Editor script not replaced');
const name='quote-editor-'+crypto.createHash('sha256').update(html).digest('hex').slice(0,12)+'.html';fs.writeFileSync(path.join(pub,name),html);
const file=path.join(root,'george-crm-react/src/compat/runtime/workflows.js');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/const WK_EDITOR_URL\s*=\s*['"][^'"]+['"]/,"const WK_EDITOR_URL='./"+name+"'"));
fs.writeFileSync(path.join(__dirname,'v246-editor-build.json'),JSON.stringify({name},null,2));console.log(name);
