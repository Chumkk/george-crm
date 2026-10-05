/* Loaded in the head, before any of the original app markup or scripts. */
(()=>{
 const root=document.documentElement;
 if(/^\/client(?:\.html)?\/?$/.test(location.pathname)||new URLSearchParams(location.search).get('view')==='client'||location.hash==='#client')root.dataset.entry='client';
 let ready=false,failed=false;
 function showError(){
  if(ready)return;
  failed=true;root.dataset.crmBoot='error';
  const message=document.getElementById('crmBootMessage');
  if(message){message.textContent='页面暂未加载完成，请刷新后重试。';message.setAttribute('role','alert');}
  document.getElementById('crmBootProgress')?.setAttribute('hidden','');
  document.getElementById('crmBootRetry')?.removeAttribute('hidden');
 }
 const onError=event=>{if(event.error||event.message)showError();};
 window.addEventListener('error',onError);
 const slow=setTimeout(()=>{if(ready||failed)return;const message=document.getElementById('crmBootMessage');if(message)message.textContent='加载时间较长，请检查网络或重试。';document.getElementById('crmBootRetry')?.removeAttribute('hidden');},30000);
 document.addEventListener('DOMContentLoaded',()=>{if(failed)showError();},{once:true});
 window.crmBootReady=()=>{
  const reveal=()=>{
   if(ready)return;
   ready=true;failed=false;clearTimeout(slow);window.removeEventListener('error',onError);
   root.dataset.crmBoot='ready';document.getElementById('crmBoot')?.remove();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',reveal,{once:true});else reveal();
 };
})();
