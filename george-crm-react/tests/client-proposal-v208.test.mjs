import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/compat/runtime/clientProposal.js',import.meta.url),'utf8');
const ref=fs.readFileSync(new URL('../src/compat/runtime/clientProposalData.js',import.meta.url),'utf8');
const clone=v=>JSON.parse(JSON.stringify(v));
function fixture(){
 const storage=new Map();let maintain=true,fail=false;
 const p=['PJ','空间项目','','','','英国','','客户','','PM'];
 const product={code:'Q1',id:'Q1:2',revision:2,current:true,submittedBy:'SM',categories:['家具'],amount:1000,spaces:[{name:'客厅',products:[{unitPrice:600,quantity:2,weight:3,cbm:.2}]}]};
 const order=(id,type,amount,kind='')=>{const a=[];a[0]=id;a[2]=type;a[10]=String(amount);a[15]='PJ';a[16]=kind;a[18]={};return a;};
 const c={location:{pathname:'/client.html',search:'?project=PJ&currencyOption=USD_GLOBAL'},URLSearchParams,Date,Intl,Number,Map,JSON,PROJECTS:[p],PROJECT_EXTRA:{PJ:{formData:{logisticsMethod:"CIF"}}},CUSTOMERS:[['CU','客户','','','','','','','','英国','123']],V69_CUSTOMERS:{CU:{address:'客户地址',email:'a@example.test'}},V3:{client:false,meta:{Q1:{submitted:{},opp:'BU1'},QD:{kind:'design',submitted:{}}}},OPPS:[['BU1','','','','PJ','','','SM']],ORDERS:[order('F1','费用订单',100,'海运费'),order('F2','费用订单',50,'安装费'),order('D1','设计单',200)],QUOTE_UI:{fx:{ccy:'CNY',rate:1}},v125QuoteHistory:()=>[clone(product),{...clone(product),id:'Q1:1',current:false,amount:900},{...clone(product),code:'QD',id:'QD:1',amount:200}],oqOrder:code=>[code+'-order'],dqDesign:o=>o?.[20]?.kind==='design',qNum:Number,v3DraftAmount:d=>d.amount??200,pql144NormalizeFx:v=>v,pql144ProjectFx:()=>({ccy:'CNY',rate:1}),wkRead:(k,f)=>clone(storage.has(k)?storage.get(k):f),wkWrite:(k,v)=>{if(fail)return false;storage.set(k,clone(v));return true;},v3Copy:clone,v3Stamp:()=> '2026-10-27 12:01',v17Owner:()=> 'PM',pql144CanSetPricing:()=>maintain,pql144SavePricing:()=>{},bs131Atomic:fn=>{const backup=new Map(storage);try{return fn();}catch(e){storage.clear();for(const [k,v]of backup)storage.set(k,v);throw e;}}};
 vm.createContext(c);vm.runInContext(ref+'\n'+source.slice(0,source.indexOf('function cxp208Money')),c);
 c.cxp208Defaults('PJ');const config=c.cxp208Defaults('PJ');config.deadline='2099-01-01';config.passport='test';config.deposit=50;config.account='gbuilder';config.fees.tradeFee=100;
 return {c,config,storage,fail:()=>fail=true,deny:()=>maintain=false};
}
test('Summary includes current product submissions once; design and historical versions excluded',()=>{
 const {c}=fixture(),rows=c.cxp208Products('PJ');assert.equal(rows.length,1);assert.equal(rows[0].amount,1000);assert.equal(rows[0].original,1200);assert.equal(rows[0].weight,6);assert.equal(rows[0].cbm,.4);
});
test('fees read exact project orders once and do not double-count design quotation in products',()=>{
 const {c,config}=fixture();c.ORDERS.push(clone(c.ORDERS[0]));const unrelated=clone(c.ORDERS[0]);unrelated[0]='OTHER';unrelated[15]='PJ-OTHER';c.ORDERS.push(unrelated);
 const f=c.cxp208FeeSources('PJ');assert.equal(f.items.length,3);assert.deepEqual(clone(f.fees),{tradeFee:0,designFee:200,designReduction:0,otherFee:50});
 config.fees.designReduction=20;const total=c.cxp208Totals(c.cxp208Products('PJ'),config);assert.deepEqual(clone(total),{products:1000,deposit:500,total:1280,balance:780,domestic:855});
});
test('all 16 currency options include two independent USD receiving profiles; rate CNY per unit',()=>{
 const {c,config}=fixture();assert.equal(vm.runInContext('CXP208_CURRENCIES.length',c),16);assert.equal(c.cxp208Code('USD_US'),'USD');assert.equal(c.cxp208Code('USD_GLOBAL'),'USD');assert.equal(c.cxp208Currency('USD_US')[2],c.cxp208Currency('USD_GLOBAL')[2]);
 config.currencyOption='THB';config.rate=.21;assert.equal(c.cxp208Fx(config).ccy,'THB');c.V3.client=true;c.location.search='?project=PJ&currency=USD&rate=7.2&currencyOption=USD_GLOBAL';assert.equal(c.cxp208Defaults('PJ').currencyOption,'USD_GLOBAL');
 c.location.search='?project=PJ&currency=THB&rate=.21&currencyOption=THB';assert.equal(c.cxp208Defaults('PJ').rate,.21);assert.equal(c.cxp208Defaults('PJ').currencyOption,'THB');c.location.search='?project=PJ&currency=USD&rate=.21&currencyOption=THB';assert.equal(c.cxp208UrlFx('PJ'),null);
});
test('preview contacts and manually agreed design/other fees save without changing source orders',()=>{
 const {c,config}=fixture(),before=JSON.stringify([c.CUSTOMERS,c.V69_CUSTOMERS,c.ORDERS]);config.customerName='展示名称';config.fees.designFee=999;
 const saved=c.cxp208Save('PJ',config,c.cxp208Token('PJ'));assert.equal(saved.revision,1);assert.equal(saved.path,'A');assert.equal(saved.fees.designFee,999);assert.equal(JSON.stringify([c.CUSTOMERS,c.V69_CUSTOMERS,c.ORDERS]),before);
 const again=c.cxp208Save('PJ',saved,c.cxp208Token('PJ'));assert.equal(again.revision,1);assert.equal(again.history.length,0);
});
test('invalid fields, stale revisions, unauthorized and failed saves preserve prior proposal',()=>{
 const {c,config,deny,storage}=fixture();const token=c.cxp208Token('PJ');config.deadline='2026-02-31';assert.throws(()=>c.cxp208Save('PJ',config,token),/截止时间/);assert.equal(storage.size,0);
 config.deadline='2099-01-01';c.cxp208Save('PJ',config,token);const before=JSON.stringify([...storage]);assert.throws(()=>c.cxp208Save('PJ',config,token),/已更新/);assert.equal(JSON.stringify([...storage]),before);deny();assert.throws(()=>c.cxp208Save('PJ',config,c.cxp208Token('PJ')),/项目经理/);
 const f=fixture();f.fail();assert.throws(()=>f.c.cxp208Save('PJ',f.config,f.c.cxp208Token('PJ')),/未保存/);assert.equal(f.storage.size,0);
});
test('handwritten signature is idempotent and bound to contract, Summary and exact product versions',()=>{
 const {c,config}=fixture();let saved=c.cxp208Save('PJ',config,c.cxp208Token('PJ')),key=c.cxp208Fingerprint('PJ',saved),before=JSON.stringify([c.V3,c.ORDERS]);
 const sign=c.cxp208Sign('PJ',key,'测试签名','data:image/png;base64,AAAA');assert.equal(sign.name,'测试签名');assert.ok(sign.signedAt);assert.equal(sign.contractSnapshot.quotes[0].version,'Q1:2');assert.equal(JSON.stringify([c.V3,c.ORDERS]),before);
 assert.equal(c.cxp208Sign('PJ',key,'测试签名','data:image/png;base64,AAAA').id,sign.id);assert.equal(c.cxp208Saved('PJ').signatures.length,1);
 saved=c.cxp208Saved('PJ');saved.phone='456';const revised=c.cxp208Save('PJ',saved,c.cxp208Token('PJ'));assert.equal(revised.revision,2);assert.equal(revised.signatures.length,1);assert.equal(c.cxp208CurrentSignature('PJ',revised),null);assert.throws(()=>c.cxp208Sign('PJ',key,'测试','data:image/png;base64,AAAA'),/已更新/);
});
test('blank and expired signatures rejected; original bilingual clauses and Summary terms retained',()=>{
 const {c,config}=fixture();const saved=c.cxp208Save('PJ',config,c.cxp208Token('PJ')),key=c.cxp208Fingerprint('PJ',saved);assert.throws(()=>c.cxp208Sign('PJ',key,'','data:image/png;base64,AAAA'),/签名/);assert.throws(()=>c.cxp208Sign('PJ',key,'测试','javascript:bad'),/签名/);
 saved.deadline='2000-01-01';c.cxp208Save('PJ',saved,c.cxp208Token('PJ'));const expired=c.cxp208Saved('PJ');assert.throws(()=>c.cxp208Sign('PJ',c.cxp208Fingerprint('PJ',expired),'测试','data:image/png;base64,AAAA'),/截止/);
 assert.match(ref,/A \| COMPANY EXPORT/);assert.match(ref,/B \| RMB/);assert.match(ref,/Annex I/);assert.doesNotMatch(ref,/65165461/);
});
test('contract maps trade and delivery period only at their variable fields, retaining fixed collection deadlines and examples',()=>{
 const {c,config}=fixture();config.trade='FOB';config.deliveryDays=45;config.deposit=40;
 const text=c.cxp208ContractParagraphs(config).join('\n');assert.match(text,/价格均为FOB价格/);assert.match(text,/are FOB price/);assert.match(text,/交货周期： 45 自然日/);assert.match(text,/Delivery period: 45 calendar days/);assert.match(text,/within 30 calendar days/);assert.match(text,/CIF \[Named Port of Destination\]/);assert.match(text,/\[40%\]/);assert.match(text,/按照附件一 Summary 中产品折后金额的/);assert.match(text,/deposit of \[40%\] of the after-discount product amount/);
 config.deliveryDays='';assert.match(c.cxp208ContractParagraphs(config).join('\n'),/Delivery period: ____ calendar days/);
});

test('new setup requires an explicit manual trade fee and permits deliberate zero',()=>{
 const {c,config}=fixture(),fresh=c.cxp208Defaults('PJ');assert.equal(fresh.account,'');assert.equal(fresh.deposit,'');assert.equal(fresh.fees.tradeFee,null);
 for(const [key,value,pattern] of [['account','',/收款账号/],['deposit','',/定金/]]){const bad=clone(config);bad[key]=value;assert.throws(()=>c.cxp208Validate(bad,c.cxp208Products('PJ')),pattern);}
 config.fees.tradeFee=null;assert.throws(()=>c.cxp208Save('PJ',config,c.cxp208Token('PJ')),/外贸费用/);config.fees.tradeFee=0;c.ORDERS=[];config.fees.designFee=c.cxp208Defaults('PJ').fees.designFee;const saved=c.cxp208Save('PJ',config,c.cxp208Token('PJ'));assert.equal(saved.fees.tradeFee,0);assert.equal(saved.fees.designFee,0);assert.equal(saved.fees.otherFee,0);
});
test('B price follows workbook H22 including selected editable rate and excluding other fees',()=>{
 const {c,config}=fixture();config.currencyOption='USD_GLOBAL';config.rate=6.722;config.deposit=50;
 config.fees={tradeFee:5000*6.722,designFee:2000*6.722,designReduction:50*6.722,otherFee:1500*6.722};
 const total=c.cxp208Totals([{amount:10000*6.722}],config);assert.equal(total.domestic,85369.4);
 config.fees.otherFee=999999;assert.equal(c.cxp208Totals([{amount:10000*6.722}],config).domestic,total.domestic);
 config.rate=7;assert.notEqual(c.cxp208Totals([{amount:10000*6.722}],config).domestic,total.domestic);
});
test('calendar validates real dates and leap years without local timezone shifting',()=>{
 const {c}=fixture();assert.equal(c.cxp209ValidDate('2028-02-29'),true);assert.equal(c.cxp209ValidDate('2027-02-29'),false);assert.equal(c.cxp209MonthDays(2028,1),29);assert.equal(c.cxp209MonthDays(2026,11),31);assert.equal(c.cxp209ValidDate('2026-13-01'),false);
});
test('correcting a cleared design reduction to explicit zero preserves zero without altering source fees',()=>{
 const {c,config}=fixture();const elements={rate:{value:'7.2'}};config.rate=7.2;
 for(const key of ['tradeFee','designFee','designReduction','otherFee'])elements['fee-'+key]={value:String(config.fees[key]/7.2),defaultValue:String(config.fees[key]/7.2)};
 c.document={getElementById:()=>({elements})};vm.runInContext('CXP208.draft='+JSON.stringify(config),c);
 vm.runInContext(source.slice(source.indexOf('function cxp208Capture'),source.indexOf('function cxp208RenderForm')),c);
 elements['fee-designReduction'].value='';c.cxp208Capture();assert.equal(vm.runInContext('CXP208.draft.fees.designReduction',c),null);
 elements['fee-designReduction'].value='0';c.cxp208Capture();assert.equal(vm.runInContext('CXP208.draft.fees.designReduction',c),0);assert.equal(vm.runInContext('CXP208.draft.fees.tradeFee',c),100);
 elements.rate.value='7.25';c.cxp208Capture();assert.equal(vm.runInContext('CXP208.draft.rate',c),7.25);
});

test('all four editable fees use the displayed rate and unchanged values retain their stored precision',()=>{
 const {c,config}=fixture();config.rate=7.2;const elements={rate:{value:'7.25'}};
 for(const key of ['tradeFee','designFee','designReduction','otherFee'])elements['fee-'+key]={value:String(config.fees[key]/7.2),defaultValue:String(config.fees[key]/7.2)};
 elements['fee-designReduction'].value='12.34';elements['fee-tradeFee'].value='123.45';elements['fee-otherFee'].value='56.78';c.document={getElementById:()=>({elements})};vm.runInContext('CXP208.draft='+JSON.stringify(config),c);
 vm.runInContext(source.slice(source.indexOf('function cxp208Capture'),source.indexOf('function cxp208RenderForm')),c);c.cxp208Capture();
 assert.equal(vm.runInContext('CXP208.draft.rate',c),7.25);assert.equal(vm.runInContext('cxp208Round(CXP208.draft.fees.designReduction/CXP208.draft.rate)',c),12.34);assert.equal(vm.runInContext('cxp208Round(CXP208.draft.fees.tradeFee/CXP208.draft.rate)',c),123.45);
 assert.equal(vm.runInContext('CXP208.draft.fees.designFee',c),config.fees.designFee);assert.equal(vm.runInContext('cxp208Round(CXP208.draft.fees.otherFee/CXP208.draft.rate)',c),56.78);
});

test('legacy manually saved fees survive reopening and preserve raw history and source orders',()=>{
 const {c,config,storage}=fixture();const old={...config,revision:4,contentKey:'legacy',fees:{tradeFee:999,designFee:888,otherFee:777,designReduction:20},history:[],signatures:[]};storage.set('crm-client-proposals-v208',{PJ:clone(old)});const before=JSON.stringify([...storage]),orders=JSON.stringify(c.ORDERS);
 const effective=c.cxp208Saved('PJ');assert.deepEqual(clone(effective.fees),{tradeFee:999,designFee:888,otherFee:777,designReduction:20});assert.equal(JSON.stringify([...storage]),before);assert.equal(JSON.stringify(c.ORDERS),orders);
 const saved=c.cxp208Save('PJ',effective,c.cxp208Token('PJ'));assert.equal(saved.revision,5);assert.equal(saved.history[0].config.fees.designFee,888);assert.equal(saved.fees.designReduction,20);assert.equal(JSON.stringify(c.ORDERS),orders);
});

test('source changes never overwrite saved manual fees; explicit reread updates design only and retains notes',()=>{
 const {c,config}=fixture();let draft=c.cxp253SourceFees('PJ',config);draft.fees={tradeFee:123,designFee:345,designReduction:20,otherFee:67};draft.feeNotes={tradeFee:'运输范围',designFee:'按约定调整',designReduction:'抵扣',otherFee:'安装说明'};
 c.ORDERS.find(o=>o[0]==='F2')[10]='75';c.ORDERS.find(o=>o[0]==='D1')[10]='250';
 const saved=c.cxp208Save('PJ',draft,c.cxp208Token('PJ'));assert.deepEqual(clone(saved.fees),draft.fees);assert.deepEqual(clone(c.cxp208Saved('PJ').fees),draft.fees);
 draft=c.cxp259ReloadDesignFee('PJ',saved);assert.deepEqual(clone(draft.fees),{tradeFee:123,designFee:250,designReduction:20,otherFee:67});assert.deepEqual(clone(draft.feeNotes),clone(saved.feeNotes));
 const reread=c.cxp208Save('PJ',draft,c.cxp208Token('PJ'));assert.equal(reread.history.at(-1).config.fees.designFee,345);assert.deepEqual(clone(reread.history.at(-1).config.feeNotes),clone(saved.feeNotes));
});

test('design fee uses its published version while working edits, duplicate and other-project orders cannot inflate fees',()=>{
 const {c,config}=fixture(),design=c.ORDERS.find(o=>o[0]==='D1');design[18].quoteCode='QD';design[10]='999';c.V3.meta.QD.submitted={amount:180};c.V3.meta.QD.workingSaved=true;c.V3.meta.QD.currentQuoteVersion='QD:3';c.DRAFT_DATA={QD:{amount:999}};c.ORDERS.push(clone(design));const other=clone(design);other[0]='D2';other[15]='OTHER';c.ORDERS.push(other);
 config.fees.designFee=c.cxp208Defaults('PJ').fees.designFee;const saved=c.cxp208Save('PJ',config,c.cxp208Token('PJ'));assert.equal(saved.fees.designFee,180);assert.match(saved.feeSourceKey,/QD:3/);assert.equal(c.V3.meta.QD.submitted.amount,180);assert.equal(design[10],'999');
});

test('an already delivered customer snapshot retains its original historical fees independently of local CRM orders',()=>{
 const {c,config,storage}=fixture();c.V3.client=true;config.fees={tradeFee:5,designFee:8,otherFee:7,designReduction:2};storage.set('crm-client-proposals-v208',{PJ:clone(config)});const before=JSON.stringify([...storage]);assert.deepEqual(clone(c.cxp208Saved('PJ').fees),config.fees);assert.equal(JSON.stringify([...storage]),before);
});

test('project trade method is authoritative and changes during editing require review without losing manual fees',()=>{
 const {c,config,storage}=fixture();c.PROJECT_EXTRA.PJ.formData.logisticsMethod='FOB';let draft=c.cxp253SourceFees('PJ',config);draft.trade='DDP';draft.fees.tradeFee=450;draft.fees.designReduction=25;
 let saved=c.cxp208Save('PJ',draft,c.cxp208Token('PJ'));assert.equal(saved.trade,'FOB');assert.equal(saved.fees.tradeFee,450);draft=c.cxp208Saved('PJ');const token=c.cxp208Token('PJ'),before=JSON.stringify([...storage]);c.PROJECT_EXTRA.PJ.formData.logisticsMethod='DPU';assert.throws(()=>c.cxp208Save('PJ',draft,token),/项目外贸方式已更新/);assert.equal(JSON.stringify([...storage]),before);
 draft=c.cxp253SourceFees('PJ',draft);saved=c.cxp208Save('PJ',draft,token);assert.equal(saved.trade,'DPU');assert.equal(saved.fees.tradeFee,450);assert.equal(saved.fees.designReduction,25);assert.equal(saved.history.at(-1).config.trade,'FOB');
});

test('shipping reference order changes do not supply or overwrite the manually entered trade fee',()=>{
 const {c,config}=fixture();const draft=c.cxp253SourceFees('PJ',config);draft.fees.tradeFee=456;draft.fees.designReduction=12;c.ORDERS[0][10]='98765';const reread=c.cxp253SourceFees('PJ',draft);assert.equal(reread.fees.tradeFee,456);assert.equal(reread.fees.designReduction,12);const saved=c.cxp208Save('PJ',draft,c.cxp208Token('PJ'));assert.equal(saved.fees.tradeFee,456);assert.doesNotMatch(saved.feeSourceKey,/98765|海运费/);
});

test('legacy project trade values are inherited, custom logistics are retained and missing trade never defaults to CIF',()=>{
 const {c,config,storage}=fixture();c.PROJECT_EXTRA.PJ={logistics:'DDP'};assert.equal(c.cxp253SourceFees('PJ',config).trade,'DDP');c.PROJECT_EXTRA.PJ.formData={logisticsMethod:'其他',logisticsOther:'CIP'};assert.equal(c.cxp253SourceFees('PJ',config).trade,'CIP');c.PROJECT_EXTRA.PJ={logisticsMethod:'其他',logistics:'CIP'};assert.equal(c.cxp253SourceFees('PJ',config).trade,'CIP');c.PROJECT_EXTRA.PJ.formData={logisticsMethod:null};assert.equal(c.cxp208Config('PJ').trade,'');assert.throws(()=>c.cxp208Save('PJ',config,c.cxp208Token('PJ')),/项目详情.*物流方式/);assert.equal(storage.size,0);
});

test('fee remarks survive capture, currency changes, save/reopen and immutable proposal history',()=>{
 const {c,config}=fixture();const elements={rate:{value:'1'}};
 for(const key of ['tradeFee','designFee','designReduction','otherFee']){elements['fee-'+key]={value:String(config.fees[key]),defaultValue:String(config.fees[key])};elements['fee-note-'+key]={value:key+'说明\n第二行'};}
 c.document={getElementById:()=>({elements})};vm.runInContext('CXP208.draft='+JSON.stringify(config),c);vm.runInContext(source.slice(source.indexOf('function cxp208Capture'),source.indexOf('function cxp208RenderForm')),c);c.cxp208Capture();
 let draft=vm.runInContext('CXP208.draft',c),saved=c.cxp208Save('PJ',draft,c.cxp208Token('PJ'));assert.equal(c.cxp208Saved('PJ').feeNotes.otherFee,'otherFee说明\n第二行');
 const prior=c.cxp208Fingerprint('PJ',saved);draft=c.cxp208Saved('PJ');draft.feeNotes.designFee='新约定';draft.currencyOption='USD_GLOBAL';draft.rate=7.2;
 const next=c.cxp208Save('PJ',draft,c.cxp208Token('PJ'));assert.notEqual(c.cxp208Fingerprint('PJ',next),prior);assert.equal(next.history.at(-1).config.feeNotes.designFee,'designFee说明\n第二行');assert.equal(next.feeNotes.otherFee,saved.feeNotes.otherFee);
 assert.equal(next.fees.designFee,saved.fees.designFee);
});

test('customer Summary escapes plain-text fee remarks, shows each with its fee and omits empty remarks',()=>{
 const {c,config}=fixture();c.SKY={lang:'en'};c.companyLogo=()=>'';c.esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 vm.runInContext(source.slice(source.indexOf('function cxp208Money'),source.indexOf('function cxp208OpenSign')),c);
 config.feeNotes={tradeFee:'Shipping <img src=x onerror=alert(1)>',designFee:'Design scope\nRoom plans',designReduction:'',otherFee:'Installation'};
 const html=c.cxp208Summary('PJ',config);assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;img src=x/);assert.equal((html.match(/class="cxp-fee-note"/g)||[]).length,3);
 assert.match(html,/Design Fee<\/dt><dd>[^<]+<\/dd><p class="cxp-fee-note">Design scope\nRoom plans/);assert.match(html,/Other Fee<\/dt><dd>[^<]+<\/dd><p class="cxp-fee-note">Installation/);
 for(const feeNotes of [{otherFee:123},{unknown:'x'},{designFee:'x'.repeat(1001)},[]])assert.throws(()=>c.cxp208Validate({...config,feeNotes},c.cxp208Products('PJ')),/备注/);
 delete config.feeNotes;assert.doesNotThrow(()=>c.cxp208Validate(config,c.cxp208Products('PJ')));
});
