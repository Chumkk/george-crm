const fs=require('fs'),path=require('path'),crypto=require('crypto'),root=path.resolve(__dirname,'..'),pub=path.join(root,'george-crm-react/public');
let script=fs.readFileSync(path.join(__dirname,'editor-v241.js'),'utf8');
script=script.replace("status.textContent='报价 · '+flow.status+'　 ERP · '+flow.erpStatus+(flow.erpRequest?' / '+flow.erpRequest:'');", "status.textContent='报价 · '+flow.status+'　'+flow.erpStatus+(flow.erpRequest?'　ERP请求 · '+flow.erpRequest:'');")
 .replace("status.title=flow.lockReason||'保存保留工作稿；提交发布报价、记录 ERP 请求并完成关联待办'", "status.title=[flow.lockReason,flow.erpNotice,'保存仅保留工作稿；提交发布报价、记录本版 ERP 请求并完成关联待办'].filter(Boolean).join('；')");
if(script.includes("?' / '+flow.erpRequest"))throw Error('ERP status and request display not separated');
fs.writeFileSync(path.join(__dirname,'editor-v242.js'),script);
let html=fs.readFileSync(path.join(pub,'quote-editor-54d54d50d9cd.html'),'utf8').replace('<script>'+fs.readFileSync(path.join(__dirname,'editor-v241.js'),'utf8')+'</script>','<script>'+script+'</script>');
const name='quote-editor-'+crypto.createHash('sha256').update(html).digest('hex').slice(0,12)+'.html';fs.writeFileSync(path.join(pub,name),html);
const engine=path.join(root,'george-crm-react/src/compat/runtime/workflows.js');fs.writeFileSync(engine,fs.readFileSync(engine,'utf8').replace(/const WK_EDITOR_URL\s*=\s*['"][^'"]+['"]/,"const WK_EDITOR_URL='./"+name+"'"));fs.writeFileSync(path.join(__dirname,'v242-editor-build.json'),JSON.stringify({name},null,2));console.log(name);
