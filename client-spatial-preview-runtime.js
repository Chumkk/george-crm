/* Opt in to the preserved spatial presentation in this standalone page only.
 * No project, quotation, attachment or shared business record is rewritten. */
(()=>{
  if(document.documentElement.dataset.spatialPreview!=='true')return;
  if(archiveProject!=='PJ0018011')throw Error('The spatial example requires PJ0018011');
  cql143QuoteOnly=function(){return false;};
  const view=document.documentElement.dataset.spatialInitialView||'plan';
  const language=new URL(location.href).searchParams.get('lang');SKY.lang=V49_LANGS.some(item=>item[0]===language)?language:'zh';
  V29_CLIENT.project=archiveProject;V29_CLIENT.list=view==='list';SKY.mode=view==='model'?'model':'plan';
  document.getElementById('clientQuoteView')?.classList.remove('cql143-quote-only');
  openClientQuoteView();v29SetView(view);q66SyncSidebar();
  const address=new URL(location.href);address.hash=view==='list'?'quote':view;history.replaceState(history.state,'',address);
  document.title='空间报价演示项目 · 平面与3D总览';
  document.documentElement.dataset.spatialPreviewReady='true';
})();
