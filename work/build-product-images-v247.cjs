const fs=require('fs'),path=require('path'),crypto=require('crypto'),root=path.resolve(__dirname,'..'),pub=path.join(root,'george-crm-react/public'),runtime=path.join(root,'george-crm-react/src/compat/runtime');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8'),audit=JSON.parse(read('v247-image-audit.json')),groups=JSON.parse(read('product-image-groups-v247.json')),photos=JSON.parse(read('v247-product-photo-downloads.json'));
if(photos.some(p=>p.status!=='ready'))throw Error('Unfinished image downloads');
const manifest=Object.fromEntries(photos.map(p=>[p.key,{key:p.key,src:p.src,width:p.width,height:p.height}])),bySku={},byName={...groups};
for(const p of audit.products){const key=groups[p.name];if(!manifest[key])throw Error('Missing photo: '+p.sku+' '+p.name);bySku[p.sku]=key;}
Object.assign(bySku,{'H210-DR-MIA-03':'window-install-kit','H210-DR-MIA-01':'cabinet-install-kit','H210-DR-MIA-09':'light-install-kit'});
let core=read('product-image-core-v247.js').replace('__PHOTO_MANIFEST__',JSON.stringify(manifest)).replace('__PHOTO_SKUS__',JSON.stringify(bySku)).replace('__PHOTO_NAMES__',JSON.stringify(byName));
fs.writeFileSync(path.join(__dirname,'product-image-core-v247-built.js'),core);
fs.writeFileSync(path.join(runtime,'productImages.js'),core+'\n'+read('product-image-runtime-v247.js'));
for(const name of ['george-crm-react/src/compat/loadRuntime.js','george-crm-react/vite.config.js']){const file=path.join(root,name);let s=fs.readFileSync(file,'utf8');if(!s.includes('"productImages"'))s=s.replace('"departmentQuotes", "bridge"','"departmentQuotes", "productImages", "bridge"');fs.writeFileSync(file,s);}
let html=fs.readFileSync(path.join(pub,'quote-editor-fb045b4fa33c.html'),'utf8');
html=html.replace('<script>','<script>'+core+'</script>\n<script>');
html=html.replace('</body>','<script>'+read('product-image-editor-v247.js')+'</script>\n</body>');
const name='quote-editor-'+crypto.createHash('sha256').update(html).digest('hex').slice(0,12)+'.html';fs.writeFileSync(path.join(pub,name),html);
const file=path.join(runtime,'workflows.js');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/const WK_EDITOR_URL\s*=\s*['"][^'"]+['"]/,"const WK_EDITOR_URL='./"+name+"'"));
fs.writeFileSync(path.join(__dirname,'v247-editor-build.json'),JSON.stringify({name,catalog:audit.catalog,photoCount:photos.length,bytes:photos.reduce((n,p)=>n+p.bytes,0)},null,2));
// Keep human-readable provenance beside the product reference assets, without runtime network requests.
fs.writeFileSync(path.join(pub,'product-reference-sources.json'),JSON.stringify(photos.map(({key,src,title,page,image,width,height})=>({key,src,title,page,image,width,height})),null,2));
console.log(JSON.stringify({name,catalog:audit.catalog,photoCount:photos.length}));
