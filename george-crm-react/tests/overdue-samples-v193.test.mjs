import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/compat/runtime/designScenario.js',import.meta.url),'utf8').split('function ds193OverdueSeed(')[1].split("if(typeof window")[0];
function fixture(){
 const c={Date,document:{documentElement:{dataset:{}}},v21SuperAdmin:()=>true,PROJECT_EXTRA:{'PJ-MOCK-187A':{scenario187:true}},TODOS:[],tfExpected:d=>d+'T23:59:59.999+08:00',tfRelativeDate:(days,now)=>new Date(now+days*86400000).toISOString().slice(0,10)};
 c.bs131Atomic=change=>{const before=JSON.stringify([c.TODOS,c.PROJECT_EXTRA]);try{const r=change();if(c.fail)throw Error('save failed');return r;}catch(e){[c.TODOS,c.PROJECT_EXTRA]=JSON.parse(before);throw e;}};
 vm.createContext(c);vm.runInContext('function ds193OverdueSeed('+source,c);return c;
}
test('补充多种真实逾期样例，只修改预留未办理数据并且只执行一次',()=>{
 const c=fixture(),base={project:'PJ-MOCK-187A',scenario187:true,status:'待处理',expectedCompletionAt:'2026-11-01'};
 c.TODOS=[{...base,type:'设计待办'},{...base,type:'设计确认待办'},{...base,type:'确认商机',designOpportunity:true},{...base,status:'已处理',type:'设计待办'},{...base,project:'PJ-REAL',type:'设计待办'},{...base,type:'设计待办',lifecycle192:[{kind:'edited'}]}];
 assert.equal(c.ds193OverdueSeed(Date.parse('2026-10-19T12:00:00Z')),true);for(const t of c.TODOS.slice(0,3))assert.ok(Date.parse(t.expectedCompletionAt)<Date.parse('2026-10-19'));
 for(const t of c.TODOS.slice(3))assert.equal(t.expectedCompletionAt,'2026-11-01');const before=JSON.stringify(c.TODOS);assert.equal(c.ds193OverdueSeed(),false);assert.equal(JSON.stringify(c.TODOS),before);
});
test('样例保存失败不留下修改或完成标记；客户端不生成内部样例',()=>{
 const c=fixture();c.TODOS=[{project:'PJ-MOCK-187A',scenario187:true,status:'待处理',type:'设计待办',expectedCompletionAt:'2026-11-01'}];c.fail=true;assert.throws(()=>c.ds193OverdueSeed(),/save failed/);assert.equal(c.TODOS[0].expectedCompletionAt,'2026-11-01');assert.equal(c.PROJECT_EXTRA['PJ-MOCK-187A'].overdue193,undefined);
 c.fail=false;c.document.documentElement.dataset.entry='client';assert.equal(c.ds193OverdueSeed(),false);
});
