import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const core=read('work/product-image-core-v247-built.js'),runtime=read('work/product-image-runtime-v247.js'),editor=read('work/product-image-editor-v247.js'),audit=JSON.parse(read('work/v247-image-audit.json'));
const clone=x=>JSON.parse(JSON.stringify(x));
function setup(extra={}){const c={window:{},...extra};vm.createContext(c);vm.runInContext(core,c);return {c,refs:c.window.CRMProductImages247};}
test('all 180 seeded SKU types and 279 historical appearances resolve a matching local photo',()=>{
 const {refs}=setup(),demo=JSON.parse(read('george-crm-react/public/quotation-demo.json'));
 assert.equal(audit.products.length,180);assert.equal(Object.keys(refs.manifest).length,66);
 for(const p of [...audit.products,...demo.versions.flatMap(v=>v.spaces.flatMap(s=>s.products))]){
  const m=refs.resolve(p);assert.ok(m,p.sku+' '+p.name);assert.match(m.src,/^\.\/media-product-ref-[a-z-]+-[a-f0-9]{10}\.webp$/);
  const bytes=fs.readFileSync(new URL('../public/'+m.src.slice(2),import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
 assert.equal(refs.resolve({name:'没有型号也没有类型的新产品'}),null);
});
test('supplementing history uses fixed references and does not overwrite photos or mutate saved submissions',()=>{
 const {refs}=setup(),version={id:'V1',amount:300,submittedBy:'原提交人',spaces:[{name:'客厅',products:[{name:'休闲沙发',sku:'GAD-0002',images:[],amount:300}]}],confirmations:[{time:'旧时间'}]},before=JSON.stringify(version);
 const shown=refs.version(version);assert.match(shown.spaces[0].products[0].images[0].src,/lounge-sofa/);assert.equal(shown.spaces[0].products[0].images[0].label,'产品参考图');assert.equal(JSON.stringify(version),before);assert.equal(shown.amount,300);assert.deepEqual(shown.confirmations,version.confirmations);
 for(const photo of ['data:image/png;base64,AAAA','https://example.com/original.webp','./media-original.jpg']){const p={sku:'GAD-0002',name:'休闲沙发',images:[{src:photo,label:'原图'}]};assert.equal(refs.supplement(p),p);assert.match(refs.art(p),new RegExp(photo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));}
 const p={name:'休闲沙发',sku:'GAD-0002',images:[],image:'data:image/jpeg;base64,AAAA'};assert.equal(refs.supplement(p),p);assert.match(refs.art(p),/data:image\/jpeg/);
 const svg={name:'儿童床',images:[{src:'data:image/svg+xml;base64,AAAA',label:'尺寸图'}]};const enriched=refs.supplement(svg);assert.equal(enriched.images.length,2);assert.equal(enriched.images[1].label,'尺寸图');assert.equal(svg.images.length,1);
 assert.doesNotMatch(refs.art({name:'儿童床',image:'javascript:alert(1)'}),/src="javascript:/);
});
test('saved/reused row supplements preserve financial cells and original data',()=>{
 const {refs}=setup(),r={sku:'FUR-KD-011',type:'书桌椅',qty:4,price:500,amt:2000,productSnapshot:{name:'书桌椅'},_pims:{lineId:'L',cells:{quantity:4,uprice:500,amount:'=O3*P3',mainImg:[]},values:{quantity:4,uprice:500,amount:2000}}},before=JSON.stringify(r),shown=refs.row(r);
 assert.match(shown._pims.cells.mainImg[0].src,/study-desk/);assert.equal(shown._pims.cells.amount,'=O3*P3');assert.equal(shown._pims.lineId,'L');assert.equal(JSON.stringify(r),before);
 const actual=clone(r);actual._pims.cells.mainImg=[{src:'https://example.com/submitted.jpg'}];assert.equal(refs.row(actual),actual);
});
test('catalogue, public/history/reuse/client entry wrappers expose photos without persisting records',()=>{
 const raw={sku:'GAD-0002',name:'休闲沙发',images:[]},snapshot={versions:[{spaces:[{products:[raw]}]}]},reuse={rows:[{sku:raw.sku,productSnapshot:raw}],spaces:[{products:[raw]}]},c=setup({WK_CATALOG:[clone(raw)],quoteImgSvg:()=>'<svg/>',wkArt:()=>'',v15SyncCatalog(){this.WK_CATALOG.push({sku:'FUR-KD-011',name:'书桌椅'});},v46Public:()=>raw,v125PublicProduct:()=>raw,v129HistoryProductImages:v=>v,qaReuseSnapshot:()=>clone(reuse),cs212Install:s=>s}).c;
 const before=JSON.stringify({raw,snapshot,reuse});vm.runInContext(runtime,c);
 for(const p of [c.WK_CATALOG[0],c.v46Public([]),c.v125PublicProduct(),c.v129HistoryProductImages(snapshot.versions[0]).spaces[0].products[0],c.qaReuseSnapshot().spaces[0].products[0],c.cs212Install(snapshot).versions[0].spaces[0].products[0]])assert.match(p.images[0].src,/lounge-sofa/);
 const saved={...raw,publicQuote:{schemaVersion:63,images:[]}},row={_pims:{cells:{mainImg:[{src:'https://example.com/exact-submitted-photo.jpg'}]}}};assert.equal(c.v125PublicProduct(saved,row).images[0].src,'https://example.com/exact-submitted-photo.jpg');
 assert.match(c.wkArt(raw),/loading="lazy"/);assert.match(c.quoteImgSvg(raw.sku),/lounge-sofa/);assert.equal(JSON.stringify({raw,snapshot,reuse}),before);
});
test('editor picker, loaded grid and reuse source preserve existing photos and show local references',()=>{
 let renders=0;const c=setup({CATALOG:{'LT-STRIP-24V':{name:'灯带'}},PRODUCTS:{家具:[{sku:'FUR-KD-011',name:'书桌椅'}]},ED_SHARED:{catalog:[]},prodArt:()=>'<svg/>',e63Items:r=>r._pims?.cells.mainImg||[],ed15Snapshot:p=>clone(p),renderGrid:()=>renders++,renderProducts:()=>renders++}).c;
 vm.runInContext(editor,c);assert.equal(renders,2);assert.match(c.prodArt({sku:'LT-STRIP-24V',name:'灯带'}),/led-strip/);
 const row={sku:'FUR-KD-011',type:'书桌椅',_pims:{cells:{mainImg:[]}}},before=JSON.stringify(row);assert.match(c.e63Items(row,'mainImg')[0].src,/study-desk/);assert.equal(JSON.stringify(row),before);assert.equal(c.e63Items(row,'rendering').length,0);
 row._pims.cells.mainImg=[{src:'https://example.com/old.jpg'}];assert.equal(c.e63Items(row,'mainImg')[0].src,'https://example.com/old.jpg');assert.match(c.ed15Snapshot({sku:'LT-STRIP-24V',name:'灯带'}).images[0].src,/led-strip/);
});
test('reference photos survive real quotation normalization, safe source validation and historical galleries',()=>{
 const workflow=read('george-crm-react/src/compat/runtime/workflows.js'),start=workflow.indexOf('/* Shared by the template editor and customer preview.'),shared=workflow.slice(start,workflow.indexOf('})(globalThis);',start)+15),c={PIMS46:{normalize:()=>({})}};vm.createContext(c);vm.runInContext(shared,c);vm.runInContext(core,c);
 for(const m of Object.values(c.CRMProductImages247.manifest)){assert.equal(c.QUOTE63.safeSrc(m.src),m.src);assert.equal(c.QUOTE63.imageOnly([{src:m.src,label:'产品参考图'}])[0].src,m.src);}
 assert.equal(c.QUOTE63.safeSrc('javascript:alert(1)'), '');
 const build=JSON.parse(read('work/v247-editor-build.json')),html=read('george-crm-react/public/'+build.name);for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);assert.ok(html.includes(core));assert.ok(html.includes(editor));
 const loader=read('george-crm-react/src/compat/loadRuntime.js'),config=read('george-crm-react/vite.config.js');for(const text of [loader,config])assert.match(text,/"departmentQuotes", "productImages", (?:"todoScenario", )?"bridge"/);
});
