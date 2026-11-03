/* Supplement presentation only. Never rewrite stored submissions, confirmations or working data on load. */
(function(){
 const refs=window.CRMProductImages247;
 function catalog(){for(let i=0;i<WK_CATALOG.length;i++){const p=WK_CATALOG[i],q=refs.supplement(p);if(q!==p)WK_CATALOG[i]={...q,fields:{...p.fields,mainImg:q.images}};}}
 catalog();
 const previousArt=quoteImgSvg;quoteImgSvg=function(sku){const p=WK_CATALOG.find(p=>p.sku===sku)||{sku};return refs.art(p)||previousArt(sku);};
 const previousWk=wkArt;wkArt=function(p){return refs.art(p)||previousWk(p);};
 const previousSync=v15SyncCatalog;v15SyncCatalog=function(){const result=previousSync();catalog();return result;};
 const previousPublic=v46Public;v46Public=function(x){return refs.supplement(previousPublic(x));};
 const previousProduct=v125PublicProduct;v125PublicProduct=function(...args){const product=previousProduct(...args),[p={},row={}]=args,snapshot=row.productSnapshot||p.productSnapshot||{};
  if(refs.photo(product.images))return product;
  const saved=[p.publicQuote?.images,p.images,p.image,row._pims?.cells?.mainImg,row._pims?.values?.mainImg,snapshot.fields?.mainImg,snapshot.images,snapshot.image].find(refs.photo);
  return saved?{...product,images:refs.media(saved)}:refs.supplement(product);
 };
 const previousHistory=v129HistoryProductImages;v129HistoryProductImages=function(...args){return refs.version(previousHistory(...args));};
 const previousReuse=qaReuseSnapshot;qaReuseSnapshot=function(...args){const snapshot=previousReuse(...args);return {...snapshot,rows:snapshot.rows.map(refs.row),spaces:refs.version(snapshot).spaces};};
 const previousInstall=cs212Install;cs212Install=function(snapshot,...args){return previousInstall({...snapshot,versions:snapshot.versions.map(refs.version)},...args);};
})();
