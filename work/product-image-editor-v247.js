(function(){
 const refs=window.CRMProductImages247;
 for(const [sku,p] of Object.entries(CATALOG))CATALOG[sku]=refs.supplement({...p,sku});
 for(const items of Object.values(PRODUCTS))for(let i=0;i<items.length;i++)items[i]=refs.supplement(items[i]);
 const previousArt=prodArt;prodArt=function(p,...args){const saved=ED_SHARED.catalog.find(x=>x.sku===p.sku);return refs.art(saved||p)||previousArt(p,...args);};
 const previousItems=e63Items;e63Items=function(r,field){const items=previousItems(r,field);if(field!=='mainImg'||refs.photo(items))return items;const saved=r.productSnapshot||{},p={...saved,sku:r.sku||saved.sku,name:saved.name||r._pims?.values?.name_en||r.type},reference=refs.references(p);return reference.length?[...reference,...items.filter(m=>m.kind!=='catalog')]:items;};
 const previousSnapshot=ed15Snapshot;ed15Snapshot=function(p){return refs.supplement(previousSnapshot(p));};
 renderGrid();renderProducts();
})();
