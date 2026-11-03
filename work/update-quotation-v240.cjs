const fs=require('fs'),path=require('path'),crypto=require('crypto'),root=path.resolve(__dirname,'..'),pub=path.join(root,'george-crm-react/public');
let script=fs.readFileSync(path.join(__dirname,'editor-v239.js'),'utf8');
script=script.replace('[s.code,s.name,s.project,s.schemeManager,s.quoteAssistant,s.author]','[s.orderNo,s.projectCode,s.code,s.name,s.project,s.schemeManager,s.quoteAssistant,s.author]')
 .replace("esc(s.project)+' · '+esc(s.code)+' · V'", "esc(s.project)+' · '+esc(s.orderNo||'单号未记录')+' · V'")
 .replace("+'</h3>'+'<p>'+ed238Submission(payload.source)","+'</h3><p>'+esc(payload.source.project)+' · '+esc(payload.source.orderNo||'单号未记录')+'</p><p>'+ed238Submission(payload.source)");
if(script.includes("esc(s.code)+' · V'")||!script.includes('esc(payload.source.orderNo'))throw Error('Display number replacement failed');
fs.writeFileSync(path.join(__dirname,'editor-v240.js'),script);
let html=fs.readFileSync(path.join(pub,'quote-editor-d9bd951cccb5.html'),'utf8').replace('<script>'+fs.readFileSync(path.join(__dirname,'editor-v239.js'),'utf8')+'</script>','<script>'+script+'</script>');
const name='quote-editor-'+crypto.createHash('sha256').update(html).digest('hex').slice(0,12)+'.html';fs.writeFileSync(path.join(pub,name),html);
const engine=path.join(root,'george-crm-react/src/compat/runtime/workflows.js');fs.writeFileSync(engine,fs.readFileSync(engine,'utf8').replace(/const WK_EDITOR_URL\s*=\s*['"][^'"]+['"]/,"const WK_EDITOR_URL='./"+name+"'"));fs.writeFileSync(path.join(__dirname,'v240-editor-build.json'),JSON.stringify({name},null,2));console.log(name);
