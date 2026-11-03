import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const history=fs.readFileSync(new URL('../src/compat/runtime/quoteRevision.js',import.meta.url),'utf8');
const quotation=fs.readFileSync(new URL('../src/compat/runtime/opportunityQuotes.js',import.meta.url),'utf8');
test('商机报价历史严格按报价单过滤，同品类其他商机和加单不混入；项目历史仍显示全部',()=>{
 const records=[{code:'Q1',revision:1,categories:['家具']},{code:'Q1',revision:2,categories:['家具']},{code:'Q2',revision:1,categories:['家具'],addon:true},{code:'Q3',revision:1,categories:['灯饰']}];
 const c={v125QuoteHistory:()=>structuredClone(records)};vm.createContext(c);
 vm.runInContext(history.slice(history.indexOf('function v146ScopedQuoteHistory'),history.indexOf('function v125OpenHistory')),c);
 const before=JSON.stringify(records);assert.deepEqual(Array.from(c.v146ScopedQuoteHistory('P','Q1'),r=>r.code+':'+r.revision),['Q1:1','Q1:2']);
 assert.equal(c.v146ScopedQuoteHistory('P','Q2').length,1);assert.equal(c.v146ScopedQuoteHistory('P','UNKNOWN').length,0);assert.equal(c.v146ScopedQuoteHistory('P').length,4);assert.equal(JSON.stringify(records),before);
 assert.match(quotation,/pql144ProjectFx\(archiveProject\):null,button.dataset.code\|\|''/);
});
test('商机只列当前报价和已归档报价，不重复展示旧销售记录，展示不修改财务记录',()=>{
 const make=(id,type,meta)=>{const r=Array(19).fill('');r[0]=id;r[2]=type;r[10]='¥486,000';r[13]='¥216,000';r[15]='P';r[17]='O';r[18]=meta;return r;};
 const c={V3:{meta:{Q:{submitted:{}},QA:{submitted:{}}}},DRAFT_DATA:{},ORDERS:[make('OLD','销售订单',{}),make('NOW','报价单',{quoteCode:'Q'}),make('ARCHIVE','报价单',{quoteCode:'QA',legacyQuoteArchive:true})],orderRowsHtml:()=>'',orderOppOf:r=>r[17],oqOpp:()=>['O'],oqCanQuote:()=>false,oqLockReason:()=>'',oqStatus:()=> '已提交',tag:String,esc:String,ops:acts=>'<td>'+acts.map(a=>a.t).join(' / ')+'</td>',orderActs:()=>[{t:'查看订单'}]};
 vm.createContext(c);vm.runInContext(quotation.slice(quotation.indexOf('const oqRowsBase=orderRowsHtml'),quotation.indexOf('const oqOppPageBase')),c);
 const before=JSON.stringify(c.ORDERS),html=c.orderRowsHtml('P','O');assert.doesNotMatch(html,/销售订单|旧流程|OLD/);assert.match(html,/报价单（历史归档）/);assert.match(html,/历史归档/);assert.equal((html.match(/<tr /g)||[]).length,2);assert.equal(JSON.stringify(c.ORDERS),before);
});
