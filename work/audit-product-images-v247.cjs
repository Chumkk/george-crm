const fs=require('fs'),vm=require('vm'),path=require('path'),root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),crm=read('george-crm-react/src/compat/runtime/crm.js'),workflow=read('george-crm-react/src/compat/runtime/workflows.js');
const start=crm.indexOf('function defaultProjectQuotes(){'),end=crm.indexOf('\n}',start)+2,ctx={};vm.createContext(ctx);vm.runInContext(crm.slice(start,end)+';result=defaultProjectQuotes();',ctx);
const demo=JSON.parse(read('george-crm-react/public/quotation-demo.json'));
const base=ctx.result.flatMap(s=>s.products.map(p=>({sku:p[3],name:p[0],cat:p[1]})));
const a=crm.indexOf('const MALL_ITEMS='),z=crm.indexOf('];',a)+2;vm.runInContext(crm.slice(a,z)+';mall=MALL_ITEMS;',ctx);
const miami=JSON.parse(read('work/v247-miami-source.json'));
const editor=read('george-crm-react/public/quote-editor-fb045b4fa33c.html');
for(const key of ['CATALOG','PRODUCTS']){const a=editor.indexOf('const '+key+' = {'),z=editor.indexOf('\n};',a)+3;vm.runInContext(editor.slice(a,z)+';editor'+key+'='+key+';',ctx);}
const editorItems=Object.entries(ctx.editorCATALOG).map(([sku,p])=>({sku,...p})).concat(Object.entries(ctx.editorPRODUCTS).flatMap(([cat,ps])=>ps.map(p=>({...p,cat}))));
const items=[...base,...ctx.mall.map(p=>({...p,cat:'石材'})),...miami.items.map(p=>({sku:p.sku,name:p.name,cat:p.cat||p.category,images:p.images,image:p.image})),...editorItems];
const bySku=[...new Map(items.map(p=>[p.sku,p])).values()],byName=[...new Map(bySku.map(p=>[p.name,p])).values()];
const versions=demo.versions.flatMap(v=>v.spaces.flatMap(s=>s.products)),n=workflow.indexOf('V37_MIAMI');
const report={catalog:bySku.length,productTypes:byName.length,demoProducts:demo.products.length,historyProducts:versions.length,historyMissing:versions.filter(p=>!p.images?.length&&!p.image).length,products:bySku,types:byName.map(({sku,name,cat})=>({sku,name,cat}))};
fs.writeFileSync(path.join(__dirname,'v247-image-audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,products:undefined,types:report.types},null,2));console.log('miami source: '+workflow.slice(n-30,n+150));
