// This separate entry reuses the published customer viewer. The standard
// client.html entry and its quotation-only behavior are not modified.
const initialHash=location.hash.toLowerCase();
document.documentElement.dataset.spatialInitialView=['#model','#3d'].includes(initialHash)?'model':['#quote','#list'].includes(initialHash)?'list':'plan';
const address=new URL(location.href);
address.searchParams.set('project','PJ0018011');
if(!address.searchParams.has('currency'))address.searchParams.set('currency','CNY');
if(!address.searchParams.has('rate'))address.searchParams.set('rate','1');
if(!address.searchParams.has('lang'))address.searchParams.set('lang','zh');
history.replaceState(history.state,'',address);
try{
  const base=new URL('./client.html',import.meta.url);
  const response=await fetch(base,{cache:'no-cache',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Customer viewer is unavailable');
  const page=new DOMParser().parseFromString(await response.text(),'text/html');
  const module=page.querySelector('script[type="module"][src]')?.getAttribute('src');
  if(!module)throw Error('Customer viewer entry was not found');
  for(const source of page.querySelectorAll('link[rel="stylesheet"],link[rel="modulepreload"],link[rel="preload"][as="script"]')){
    const link=source.cloneNode();link.href=new URL(source.getAttribute('href'),base).href;document.head.appendChild(link);
  }
  await import(new URL(module,base).href);
  await new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=new URL('./client-spatial-preview-runtime.js',import.meta.url).href;
    script.onload=resolve;script.onerror=()=>reject(Error('Spatial viewer is unavailable'));document.body.appendChild(script);
  });
  if(document.documentElement.dataset.spatialPreviewReady!=='true')throw Error('Spatial viewer could not initialize');
}catch(error){
  console.error(error);
  const panel=document.getElementById('react-startup')||document.body.appendChild(Object.assign(document.createElement('div'),{id:'react-startup'}));
  panel.setAttribute('role','alert');panel.replaceChildren();
  const message=document.createElement('p');message.textContent='空间方案暂时无法加载，请检查网络后重试。';
  const retry=document.createElement('button');retry.textContent='重新加载';retry.onclick=()=>location.reload();panel.append(message,retry);
}
