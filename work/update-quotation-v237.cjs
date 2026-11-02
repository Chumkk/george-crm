const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),pub=path.join(root,'george-crm-react/public');
let html=fs.readFileSync(path.join(pub,'quote-editor-ff4bb732e032.html'),'utf8');
// New work never invents a placeholder space. Existing saved rows remain untouched.
html=html.replace("(spaces.length?spaces:['未确定空间']).forEach", "spaces.forEach")
 .replace("buildSpaceRows(['未确定空间'])",'buildSpaceRows([])')
 .replace("  if(!set.includes('未确定空间')) set.push('未确定空间');\n  return set;", "  return set.filter(name=>name&&name!=='未确定空间');")
 .replace("const sp=name.trim()||'未确定空间';", "const sp=name.trim();if(!sp)return toast('请输入空间名称');")
 .replace("if(!p)return;if(editing)commitEdit();pushHist();const hit=", "if(!p)return;if(!(opt.space||edTargetSpace||spaceNames()[0]))return toast('请先在项目中维护报价空间');if(editing)commitEdit();pushHist();const hit=");
html=html.replace('<script>'+fs.readFileSync(path.join(__dirname,'editor-v235.js'),'utf8')+'</script>','<script>'+fs.readFileSync(path.join(__dirname,'editor-v237.js'),'utf8')+'</script>');
if(!html.includes('function ed237Lines'))throw Error('Editor replacement failed');
html=html.replace('</head>','<style>'+fs.readFileSync(path.join(__dirname,'editor-v237.css'),'utf8')+'</style></head>');
const name='quote-editor-'+crypto.createHash('sha256').update(html).digest('hex').slice(0,12)+'.html';fs.writeFileSync(path.join(pub,name),html);
const engine=path.join(root,'george-crm-react/src/compat/runtime/workflows.js');fs.writeFileSync(engine,fs.readFileSync(engine,'utf8').replace(/const WK_EDITOR_URL\s*=\s*['"][^'"]+['"]/,"const WK_EDITOR_URL='./"+name+"'"));
fs.writeFileSync(path.join(__dirname,'v237-editor-build.json'),JSON.stringify({name},null,2));console.log(name);
