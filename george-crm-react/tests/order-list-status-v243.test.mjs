import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,quote} from './helpers/quotation-runtime.mjs';
function boot(){const c=setup();Object.assign(c,{tag:s=>`<tag>${s}</tag>`,ops:()=>'<td>操作</td>',orderActs:()=>[]});return c;}
const both=c=>[c.orderRowsHtml('P'),c.orderRowsHtml('P','B')];
test('项目与商机订单列表从首次成功暂存或提交显示，仅有三个报价业务状态',()=>{
 const c=boot(),{code,data}=quote(c);c.actor='SM';
 for(const html of both(c)){assert.doesNotMatch(html,/<tag>待报价<\/tag>/);assert.match(html,/暂无订单记录/);}
 assert.equal(c.ORDERS.length,1);assert.equal(c.oqStatus(code),'待报价');
 c.v3QuickSave(data);for(const html of both(c))assert.match(html,/<tag>已暂存<\/tag>/);
 c.applyDraftSaved(data);for(const html of both(c))assert.match(html,/<tag>已提交<\/tag>/);
 c.V3.meta[code].confirmedCats=['家具'];for(const html of both(c))assert.match(html,/<tag>已确认<\/tag>/);
 const submitted=JSON.stringify(c.V3.meta[code].submitted);c.v3QuickSave(data);
 for(const html of both(c))assert.match(html,/<tag>已暂存<\/tag>/);
 assert.equal(JSON.stringify(c.V3.meta[code].submitted),submitted);assert.equal(c.TODOS[0].status,'已处理');
});
test('保存失败不展示未保存占位，跨商机与跨项目记录保持隔离',()=>{
 const c=boot(),{data}=quote(c);c.actor='SM';c.fail=true;c.v3QuickSave(data);
 for(const html of both(c))assert.match(html,/暂无订单记录/);
 c.fail=false;c.v3QuickSave(data);assert.equal(c.oqCurrentRows('P','B').length,1);
 assert.equal(c.oqCurrentRows('P','OTHER').length,0);assert.equal(c.oqCurrentRows('OTHER').length,0);
});
test('未保存占位不遮蔽真实旧订单，归档和缺少报价元数据的历史订单持续可查',()=>{
 const c=boot(),{code}=quote(c),placeholder=c.oqOrder(code);
 const legacy=JSON.parse(JSON.stringify(placeholder));legacy[0]='OLD';legacy[2]='销售订单';legacy[18]={legacySalesRecord:true};
 const archived=JSON.parse(JSON.stringify(placeholder));archived[0]='ARCHIVE';archived[18]={quoteCode:'ARCHIVE',legacyQuoteArchive:true};
 const missing=JSON.parse(JSON.stringify(placeholder));missing[0]='MISSING';missing[18]={quoteCode:'MISSING'};
 c.ORDERS.push(legacy,archived,missing);
 assert.deepEqual(Array.from(c.oqCurrentRows('P','B'),r=>r[0]),['OLD','ARCHIVE','MISSING']);
 for(const html of both(c)){assert.match(html,/历史归档/);assert.match(html,/未记录/);assert.doesNotMatch(html,/<tag>待报价<\/tag>/);}
 assert.equal(c.ORDERS.length,4);
});
test('历史暂存、历史提交与已确认报价统一用新名称，归档标识不替换报价状态且不改写历史',()=>{
 const c=boot(),{code,data}=quote(c),order=c.oqOrder(code);c.actor='SM';
 c.v3QuickSave(data);c.V3.meta[code].status='已保存';assert.equal(c.oqOrderListStatus(order),'已暂存');
 c.applyDraftSaved(data);c.V3.meta[code].status='已报价';order[18].legacyQuoteArchive=true;
 const before=JSON.stringify({meta:c.V3.meta,order});
 for(const html of both(c)){assert.match(html,/报价单（历史归档）/);assert.match(html,/<tag>已提交<\/tag>/);assert.doesNotMatch(html,/<tag>(已报价|已保存|待报价|历史归档)<\/tag>/);}
 assert.equal(JSON.stringify({meta:c.V3.meta,order}),before);
 c.V3.meta[code].confirmedCats=['家具'];assert.equal(c.oqOrderListStatus(order),'已确认');
 for(const html of both(c))assert.match(html,/<tag>已确认<\/tag>/);
});
