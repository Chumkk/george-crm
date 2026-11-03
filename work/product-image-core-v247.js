/* Reference photographs belong to a fixed prototype manifest, never the mutable catalogue. */
(function(root){
 const manifest=__PHOTO_MANIFEST__,bySku=__PHOTO_SKUS__,byName=__PHOTO_NAMES__;
 const normalize=value=>String(value||'').trim().replace(/\s+/g,' ');
 function media(value){if(!value)return [];if(typeof value==='string'){try{if(value.trim().startsWith('['))return media(JSON.parse(value));}catch{}return [{src:value}];}if(Array.isArray(value))return value.flatMap(media);return value.src?[value]:[];}
 function photo(value){return media(value).some(m=>/^(?:https?:\/\/|data:image\/(?:png|jpe?g|gif|webp)[;,]|\.\/?media-[\w.-]+$|\/media-[\w.-]+$|blob:)/i.test(m.src||''));}
 function resolve(p){if(typeof p==='string')p={sku:p};p=p||{};const key=byName[normalize(p.name||p.type)]||bySku[p.sku];return manifest[key]||null;}
 function references(p){const ref=resolve(p);return ref?[{src:ref.src,label:'产品参考图',field:'mainImg',reference:true,referenceKey:ref.key}]:[];}
 function supplement(p){if(!p)return p;const saved=p.images??p.image??p.fields?.mainImg;
  // A saved picture takes precedence, including user uploads and an old submission's photograph.
  if(photo(saved)||photo(p.image)||photo(p.fields?.mainImg))return p;
  const refs=references(p);return refs.length?{...p,images:[...refs,...media(saved)]}:p;
 }
 function version(v){return {...v,spaces:(v.spaces||[]).map(s=>({...s,products:(s.products||[]).map(supplement)}))};}
 function row(r){if(!r||r.kind==='space')return r;const snapshot=r.productSnapshot||{},p={...snapshot,sku:r.sku||snapshot.sku,name:snapshot.name||r.type||r._pims?.values?.name_en},refs=references(p);if(!refs.length)return r;
  const cells=r._pims?.cells,values=r._pims?.values;
  if(photo(cells?.mainImg)||photo(values?.mainImg)||photo(snapshot.images)||photo(snapshot.image)||photo(snapshot.fields?.mainImg))return r;
  const next={...r,productSnapshot:{...snapshot,images:[...refs,...media(snapshot.images||snapshot.image)]}};
  if(r._pims)next._pims={...r._pims,cells:{...cells,mainImg:[...refs,...media(cells?.mainImg)]},values:{...values,mainImg:[...refs,...media(values?.mainImg)]}};
  return next;
 }
 const escape=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function art(p){const q=supplement(p),m=[...media(q?.images),...media(q?.image),...media(q?.fields?.mainImg)].find(x=>photo(x));return m?'<img class="product-reference-image" src="'+escape(m.src)+'" alt="'+escape(p.name||p.sku)+'" title="'+escape(m.reference?'产品参考图':p.name||p.sku)+'" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain">':'';}
 root.CRMProductImages247=Object.freeze({manifest,bySku,byName,media,photo,resolve,references,supplement,version,row,art});
})(typeof window==='undefined'?globalThis:window);
