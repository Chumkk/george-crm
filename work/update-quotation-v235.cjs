const fs=require('fs'),path=require('path'),{createHash}=require('crypto');
const root=path.resolve(__dirname,'..'),pub=path.join(root,'george-crm-react/public');
const base=fs.readFileSync(path.join(pub,'quote-editor-a917f1234e3c.html'),'utf8');
const html=base.replace('</head>','<style>'+fs.readFileSync(path.join(__dirname,'editor-v235.css'),'utf8')+'</style></head>').replace('</body>','<script>'+fs.readFileSync(path.join(__dirname,'editor-v235.js'),'utf8')+'</script></body>');
const name='quote-editor-'+createHash('sha256').update(html).digest('hex').slice(0,12)+'.html';
fs.writeFileSync(path.join(pub,name),html);
const engine=path.join(root,'george-crm-react/src/compat/runtime/workflows.js');
fs.writeFileSync(engine,fs.readFileSync(engine,'utf8').replace(/const WK_EDITOR_URL\s*=\s*['"][^'"]+['"]/,"const WK_EDITOR_URL='./"+name+"'"));
console.log(name);
