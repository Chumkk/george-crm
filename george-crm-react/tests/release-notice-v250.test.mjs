import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {releaseVersion} from '../build/releaseVersion.mjs';
const source=fs.readFileSync(new URL('../src/updates/releaseNotice.js',import.meta.url),'utf8');
function boot(){const c={AbortController,URL,Date};vm.createContext(c);vm.runInContext(source,c);return c.CRMReleaseNotice;}
function environment(fetch){let time=Date.parse('2026-11-03T06:00:00Z'),interval;const events=new Map(),doc={hidden:true,addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:key=>events.delete(key)},win={addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:key=>events.delete(key)},timers={setTimeout:()=>1,clearTimeout(){},setInterval:fn=>{interval=fn;return 2;},clearInterval(){interval=null;}},updates=[];const watcher=boot().createReleaseWatcher({version:'a'.repeat(64),builtAt:'2026-11-03T04:00:00Z',url:'https://example.com/george-crm/app-release.json',onUpdate:r=>updates.push(r),fetch,document:doc,window:win,timers,now:()=>time});return {watcher,doc,events,updates,tick:()=>time+=60000,poll:()=>interval?.(),show:()=>{doc.hidden=false;},event:async key=>{await events.get(key)?.();await new Promise(resolve=>setTimeout(resolve,0));}};}
const response=(version='b'.repeat(64),builtAt='2026-11-03T05:00:00Z')=>({ok:true,json:async()=>({schema:1,version,builtAt})});
test('a newer deployment prompts once; checks never reload the page or touch business storage',async()=>{
 const requests=[],env=environment(async(...args)=>{requests.push(args);return response();});env.show();await env.watcher.check();assert.equal(env.updates.length,1);assert.ok(requests[0][0].includes('check='));assert.equal(requests[0][1].cache,'no-store');env.tick();await env.watcher.check();assert.equal(env.updates.length,1);assert.equal(requests.length,2);env.watcher.stop();assert.equal(env.events.size,0);
});
test('same version, stale CDN metadata, invalid JSON/version and offline responses do not produce false update notices',async()=>{
 for(const read of [async()=>response('a'.repeat(64)),async()=>response('b'.repeat(64),'2026-11-01T00:00:00Z'),async()=>({ok:false}),async()=>response('not-a-release'),async()=>{throw Error('offline');},async()=>({ok:true,json:async()=>{throw Error('HTML response');}})]){const env=environment(read);env.show();await env.watcher.check();assert.equal(env.updates.length,0);env.watcher.stop();}
});
test('hidden tabs pause checks, visibility/focus resume with throttling, and failed checks can retry',async()=>{
 let count=0;const env=environment(async()=>{count++;if(count===1)throw Error('offline');return response();});await env.watcher.check();assert.equal(count,0);env.show();await env.event('visibilitychange');assert.equal(count,1);await env.event('focus');assert.equal(count,1);env.tick();await env.poll();assert.equal(env.updates.length,1);env.watcher.stop();
});
test('cleanup prevents an in-flight response from displaying a notice after navigation',async()=>{
 let resolve;const env=environment(()=>new Promise(done=>resolve=done));env.show();const pending=env.watcher.check();env.watcher.stop();resolve(response());await pending;assert.equal(env.updates.length,0);
});
test('refresh is blocked while quotation edits or saves are pending, including a hidden editor tab',()=>{
 const api=boot();let status='有未保存的更改',editing=false;const editor={getElementById:()=>({textContent:status}),querySelector:()=>editing?{}:null},frame={contentDocument:editor,closest:()=>({hidden:true})},doc={getElementById:()=>frame};assert.equal(api.quotationNeedsSave(doc),true);status='正在保存…';assert.equal(api.quotationNeedsSave(doc),true);status='已保存 · 14:00';assert.equal(api.quotationNeedsSave(doc),false);editing=true;assert.equal(api.quotationNeedsSave(doc),true);assert.equal(api.quotationNeedsSave({getElementById:()=>null}),false);
});
test('later closes only the notice; refresh requires an explicit click and preserves a dirty quote',()=>{
 const api=boot(),buttons={},warning={hidden:true},nodes=new Map();let reloads=0,dirty=true,removed=false,opened=false;const handlers={};const box={setAttribute(){},appendChild(){},showModal(){opened=true;},addEventListener:(key,fn)=>handlers[key]=fn,close(){handlers.close();},remove(){removed=true;},querySelector:key=>key==='[data-release-warning]'?warning:(buttons[key]||={})};const doc={createElement:tag=>tag==='dialog'?box:{},getElementById:id=>id==='pimsFrame'?{contentDocument:{getElementById:()=>({textContent:dirty?'有未保存的更改':'已保存'}),querySelector:()=>null}}:nodes.get(id),body:{appendChild:node=>nodes.set(node.id,node)}};api.showNotice(doc,{location:{reload:()=>reloads++}});assert.equal(opened,true);assert.match(box.innerHTML,/立即刷新/);assert.equal(reloads,0);buttons['[data-release-refresh]'].onclick();assert.equal(reloads,0);assert.equal(warning.hidden,false);dirty=false;buttons['[data-release-refresh]'].onclick();assert.equal(reloads,1);buttons['[data-release-later]'].onclick();assert.equal(removed,true);
});
test('release identity is content based, includes stable PRD changes, and ignores build timestamps',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'crm-release-'));try{fs.mkdirSync(path.join(root,'src'));fs.mkdirSync(path.join(root,'public'));fs.writeFileSync(path.join(root,'src','app.js'),'initial');fs.writeFileSync(path.join(root,'public','space-quote-prd.html'),'first PRD');const a=releaseVersion(root,new Date('2026-11-03T01:00:00Z')),b=releaseVersion(root,new Date('2026-11-03T02:00:00Z'));assert.equal(a.version,b.version);assert.notEqual(a.builtAt,b.builtAt);fs.writeFileSync(path.join(root,'public','space-quote-prd.html'),'updated PRD');assert.notEqual(a.version,releaseVersion(root).version);assert.match(a.version,/^[a-f0-9]{64}$/);}finally{for(const p of ['src/app.js','public/space-quote-prd.html'])fs.unlinkSync(path.join(root,p));fs.rmdirSync(path.join(root,'src'));fs.rmdirSync(path.join(root,'public'));fs.rmdirSync(root);}
});
