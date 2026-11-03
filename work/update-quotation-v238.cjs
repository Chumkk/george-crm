const fs=require('fs'),path=require('path'),crypto=require('crypto'),root=path.resolve(__dirname,'..'),pub=path.join(root,'george-crm-react/public');
let script=fs.readFileSync(path.join(__dirname,'editor-v237.js'),'utf8');
const helper='function ed238Roles(source){return \'<span class="ed238-roles"><span><b>方案经理</b><em>\'+esc(source.schemeManager||\'未记录\')+\'</em></span><span><b>报价助理</b><em>\'+esc(source.quoteAssistant||\'未记录\')+\'</em></span></span>\';}\nfunction ed238Submission(source){return \'<span class="ed238-submission">提交人：\'+esc(source.author||\'未记录\')+\'　提交时间：\'+esc(source.time||\'未记录\')+\'　金额：\'+edMoney(source.amount)+\'</span>\';}\n';
script=script.replace('function ed235List(){',helper+'function ed235List(){')
 .replace('[s.code,s.name,s.project,s.author]','[s.code,s.name,s.project,s.schemeManager,s.quoteAssistant,s.author]')
 .replace("<small>提交：'+esc(s.time)+' · '+esc(s.author)+' · '+edMoney(s.amount)+'</small>","'+ed238Roles(s)+ed238Submission(s)+'")
 .replace("<p>'+esc(payload.source.time)+' · '+esc(payload.source.author)+' · '+edMoney(payload.source.amount)+'</p>","'+ed238Roles(payload.source)+'<p>'+ed238Submission(payload.source)+'</p>");
const old="status.textContent='报价 · '+flow.status+'　 ERP · '+flow.erpStatus+(flow.erpRequest?' / '+flow.erpRequest:'')+(flow.assistant?'　报价助理 · '+flow.assistant:'');";
script=script.replace(old,"status.textContent='报价 · '+flow.status+'　 ERP · '+flow.erpStatus+(flow.erpRequest?' / '+flow.erpRequest:'');status.insertAdjacentHTML('beforeend',ed238Roles({schemeManager:flow.schemeManager,quoteAssistant:flow.assistant||'未安排'}));");
if(script.includes('<small>提交：')||script.includes(old)||!script.includes('ed238Roles(payload.source)'))throw Error('Role display replacement incomplete');
fs.writeFileSync(path.join(__dirname,'editor-v238.js'),script);
let html=fs.readFileSync(path.join(pub,'quote-editor-f0ee1a5f00d4.html'),'utf8').replace('<script>'+fs.readFileSync(path.join(__dirname,'editor-v237.js'),'utf8')+'</script>','<script>'+script+'</script>');
html=html.replace('</head>','<style>'+fs.readFileSync(path.join(__dirname,'editor-v238.css'),'utf8')+'</style></head>');
const name='quote-editor-'+crypto.createHash('sha256').update(html).digest('hex').slice(0,12)+'.html';fs.writeFileSync(path.join(pub,name),html);
const engine=path.join(root,'george-crm-react/src/compat/runtime/workflows.js');fs.writeFileSync(engine,fs.readFileSync(engine,'utf8').replace(/const WK_EDITOR_URL\s*=\s*['"][^'"]+['"]/,"const WK_EDITOR_URL='./"+name+"'"));fs.writeFileSync(path.join(__dirname,'v238-editor-build.json'),JSON.stringify({name},null,2));console.log(name);
