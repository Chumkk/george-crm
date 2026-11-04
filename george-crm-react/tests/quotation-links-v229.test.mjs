import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync(new URL('../src/compat/runtime/quotationDelivery.js',import.meta.url),'utf8');
function context(){const c={crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,atob,btoa,URL,URLSearchParams,JSON,Number,V3:{client:true},archiveProject:'P',esc:x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),cs212Encode:async x=>Buffer.from(JSON.stringify(x)).toString('base64url'),cs212Decode:async(x,project)=>{const s=JSON.parse(Buffer.from(x,'base64url').toString());if(s.project!==project)throw Error('project');return s;}};vm.createContext(c);vm.runInContext(source.slice(0,source.indexOf('function qd225PasswordField')),c);return c;}
test('compact customer envelope is shorter, password protected and reads alongside legacy links',async()=>{
 const c=context(),s={project:'P',deliveryAccess:'customer',config:{name:'DEMO'.repeat(300)},versions:[{code:'Q',id:'Q:1',current:true}]},pass='Sample229Pass';
 const old=await c.qd225Protect(s,pass),compact=await c.qd229Protect(s,pass);
 assert.ok(compact.length<old.length*.65);
 assert.deepEqual(JSON.parse(JSON.stringify(await c.qd229Unprotect(compact,pass,'P'))),s);
 assert.deepEqual(JSON.parse(JSON.stringify(await c.qd229Unprotect(old,pass,'P'))),s);
 await assert.rejects(c.qd229Unprotect(compact,'Wrong229Password','P'));
 await assert.rejects(c.qd229Unprotect(compact,pass,'OTHER'));
 const parts=compact.split('.');parts[3]=(parts[3][0]==='A'?'B':'A')+parts[3].slice(1);await assert.rejects(c.qd229Unprotect(parts.join('.'),pass,'P'));
});
test('passwordless internal links force read-only mode even if their snapshot requests customer access',async()=>{
 const c=context(),s={project:'P',deliveryAccess:'customer',versions:[{code:'Q',id:'Q:1',current:true}]};
 const events={};let reloads=0;
 const encoded=await c.cs212Encode(s);c.window={__CRM_SHARE_ENTRY__:'https://example.com/client.html?project=P#summary&internal='+encoded,addEventListener:(type,fn)=>events[type]=fn};c.cs212Install=()=>{};c.location={href:c.window.__CRM_SHARE_ENTRY__,hash:'#summary&internal='+encoded,reload:()=>reloads++};c.qd225Initialize=()=>{throw Error('wrong initialization');};
 vm.runInContext(source.slice(source.indexOf('window.cs212Initialize=async'),source.indexOf('const qd225OpenClient=')),c);
 await c.window.cs212Initialize();assert.equal(c.qd225CustomerCanConfirm('P'),false);
 assert.equal(vm.runInContext('QD225.access.mode',c),'internal');assert.equal(vm.runInContext('QD225.locked',c),false);
 events.hashchange();assert.equal(reloads,0);c.location.hash='#summary&protected=another-snapshot';events.hashchange();assert.equal(reloads,1);
});
test('share content has named rich links, readable plain text and no internal password',()=>{
 const c=context();vm.runInContext("QD225.link='https://example.com/client.html#payload';QD225.linkName='空间演示项目';QD225.project='P';QD225.password='Sample229Pass';QD225.linkMode='internal'",c);
 let message=c.qd229ShareMessage();assert.match(message.plain,/内部报价预览｜空间演示项目\n\n/);assert.doesNotMatch(message.plain,/密码|Sample229Pass/);assert.match(message.html,/>查看内部报价 ↗<\/a>/);
 vm.runInContext("QD225.linkMode='customer'",c);message=c.qd229ShareMessage();assert.match(message.plain,/访问密码：Sample229Pass/);assert.match(message.html,/>查看报价与 Summary ↗<\/a>/);
});
