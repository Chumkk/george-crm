const fs=require('fs'),path=require('path'),crypto=require('crypto'),root=path.resolve(__dirname,'..'),pub=path.join(root,'george-crm-react/public');
let script=fs.readFileSync(path.join(__dirname,'editor-v240.js'),'utf8');
script=script.replace("button.textContent='复用已提交报价'", "button.textContent='复用报价'")
 .replace('<strong>复用已提交报价</strong>', '<strong>复用报价</strong>')
 .replace('<button class="btn" id="ed235Close">关闭</button>', '')
 .replace("document.getElementById('ed235Close').onclick=ed235Close;",'')
 .replace("dialog.showModal();", "let outsideStarted=false;const outside=event=>{const rect=dialog.getBoundingClientRect();return event.target===dialog&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom);};dialog.addEventListener('pointerdown',event=>{outsideStarted=outside(event);});dialog.addEventListener('pointerup',event=>{const dismiss=outsideStarted&&outside(event);outsideStarted=false;if(dismiss)ed235Close();});dialog.addEventListener('pointercancel',()=>{outsideStarted=false;});dialog.showModal();");
if(script.includes('ed235Close">关闭')||script.includes("button.textContent='复用已提交报价'"))throw Error('Drawer/button replacement failed');
fs.writeFileSync(path.join(__dirname,'editor-v241.js'),script);
const css='.ed224-native .actionbar .ed237-reuse-button{background:#1677ff;border-color:#1677ff;color:#fff}.ed224-native .actionbar .ed237-reuse-button:hover{background:#4096ff;border-color:#4096ff;color:#fff}';fs.writeFileSync(path.join(__dirname,'editor-v241.css'),css+'\n');
let html=fs.readFileSync(path.join(pub,'quote-editor-3459931cd052.html'),'utf8').replace('<script>'+fs.readFileSync(path.join(__dirname,'editor-v240.js'),'utf8')+'</script>','<script>'+script+'</script>').replace('</head>','<style>'+css+'</style></head>');
const name='quote-editor-'+crypto.createHash('sha256').update(html).digest('hex').slice(0,12)+'.html';fs.writeFileSync(path.join(pub,name),html);
const engine=path.join(root,'george-crm-react/src/compat/runtime/workflows.js');fs.writeFileSync(engine,fs.readFileSync(engine,'utf8').replace(/const WK_EDITOR_URL\s*=\s*['"][^'"]+['"]/,"const WK_EDITOR_URL='./"+name+"'"));fs.writeFileSync(path.join(__dirname,'v241-editor-build.json'),JSON.stringify({name},null,2));console.log(name);
