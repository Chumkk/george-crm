const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');const file=path.join(root,'george-crm-react/tests/client-proposal-v208.test.mjs');let s=fs.readFileSync(file,'utf8');
const rep=(a,b)=>{if(!s.includes(a))throw Error(a);s=s.replace(a,b);};
rep('total:1330,balance:830','total:1280,balance:780');
rep('preview contacts do not write back customer data and fee overrides are replaced by source orders','preview contacts and manually agreed design/other fees save without changing source orders');
rep("assert.equal(saved.fees.designFee,200);assert.equal(JSON.stringify", "assert.equal(saved.fees.designFee,999);assert.equal(JSON.stringify");
rep("config.fees.tradeFee=0;c.ORDERS=[];const saved=", "config.fees.tradeFee=0;c.ORDERS=[];config.fees.designFee=c.cxp208Defaults('PJ').fees.designFee;const saved=");
rep('manual trade fee and design reduction use the displayed rate while source-fee fields are ignored','all four editable fees use the displayed rate and unchanged values retain their stored precision');
rep("elements['fee-designReduction'].value='12.34';elements['fee-tradeFee'].value='123.45';", "elements['fee-designReduction'].value='12.34';elements['fee-tradeFee'].value='123.45';elements['fee-otherFee'].value='56.78';");
rep(" assert.equal(vm.runInContext('CXP208.draft.fees.designFee',c),config.fees.designFee);", " assert.equal(vm.runInContext('CXP208.draft.fees.designFee',c),config.fees.designFee);assert.equal(vm.runInContext('cxp208Round(CXP208.draft.fees.otherFee/CXP208.draft.rate)',c),56.78);");
rep('legacy active fee overrides are corrected on read without rewriting saved audit or source orders','legacy manually saved fees survive reopening and preserve raw history and source orders');
rep('{tradeFee:999,designFee:200,otherFee:50,designReduction:20}','{tradeFee:999,designFee:888,otherFee:777,designReduction:20}');
const a=s.indexOf("test('source order changes require"),b=s.indexOf("test('design fee uses",a);
s=s.slice(0,a)+`test('source changes never overwrite saved manual fees; explicit reread updates design only and retains notes',()=>{
 const {c,config}=fixture();let draft=c.cxp253SourceFees('PJ',config);draft.fees={tradeFee:123,designFee:345,designReduction:20,otherFee:67};draft.feeNotes={tradeFee:'运输范围',designFee:'按约定调整',designReduction:'抵扣',otherFee:'安装说明'};
 c.ORDERS.find(o=>o[0]==='F2')[10]='75';c.ORDERS.find(o=>o[0]==='D1')[10]='250';
 const saved=c.cxp208Save('PJ',draft,c.cxp208Token('PJ'));assert.deepEqual(clone(saved.fees),draft.fees);assert.deepEqual(clone(c.cxp208Saved('PJ').fees),draft.fees);
 draft=c.cxp259ReloadDesignFee('PJ',saved);assert.deepEqual(clone(draft.fees),{tradeFee:123,designFee:250,designReduction:20,otherFee:67});assert.deepEqual(clone(draft.feeNotes),saved.feeNotes);
 const reread=c.cxp208Save('PJ',draft,c.cxp208Token('PJ'));assert.equal(reread.history.at(-1).config.fees.designFee,345);assert.deepEqual(reread.history.at(-1).config.feeNotes,saved.feeNotes);
});

`+s.slice(b);
rep(" const saved=c.cxp208Save('PJ',config,c.cxp208Token('PJ'));assert.equal(saved.fees.designFee,180);", " config.fees.designFee=c.cxp208Defaults('PJ').fees.designFee;const saved=c.cxp208Save('PJ',config,c.cxp208Token('PJ'));assert.equal(saved.fees.designFee,180);");
s+=`
test('fee remarks survive capture, currency changes, save/reopen and immutable proposal history',()=>{
 const {c,config}=fixture();const elements={rate:{value:'1'}};
 for(const key of ['tradeFee','designFee','designReduction','otherFee']){elements['fee-'+key]={value:String(config.fees[key]),defaultValue:String(config.fees[key])};elements['fee-note-'+key]={value:key+'说明\\n第二行'};}
 c.document={getElementById:()=>({elements})};vm.runInContext('CXP208.draft='+JSON.stringify(config),c);vm.runInContext(source.slice(source.indexOf('function cxp208Capture'),source.indexOf('function cxp208RenderForm')),c);c.cxp208Capture();
 let draft=vm.runInContext('CXP208.draft',c),saved=c.cxp208Save('PJ',draft,c.cxp208Token('PJ'));assert.equal(c.cxp208Saved('PJ').feeNotes.otherFee,'otherFee说明\\n第二行');
 const prior=c.cxp208Fingerprint('PJ',saved);draft=c.cxp208Saved('PJ');draft.feeNotes.designFee='新约定';draft.currencyOption='USD_GLOBAL';draft.rate=7.2;
 const next=c.cxp208Save('PJ',draft,c.cxp208Token('PJ'));assert.notEqual(c.cxp208Fingerprint('PJ',next),prior);assert.equal(next.history.at(-1).config.feeNotes.designFee,'designFee说明\\n第二行');assert.equal(next.feeNotes.otherFee,saved.feeNotes.otherFee);
 assert.equal(next.fees.designFee,saved.fees.designFee);
});

test('customer Summary escapes plain-text fee remarks, shows each with its fee and omits empty remarks',()=>{
 const {c,config}=fixture();c.SKY={lang:'en'};c.companyLogo=()=>'';c.esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 vm.runInContext(source.slice(source.indexOf('function cxp208Money'),source.indexOf('function cxp208OpenSign')),c);
 config.feeNotes={tradeFee:'Shipping <img src=x onerror=alert(1)>',designFee:'Design scope\\nRoom plans',designReduction:'',otherFee:'Installation'};
 const html=c.cxp208Summary('PJ',config);assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;img src=x/);assert.equal((html.match(/class="cxp-fee-note"/g)||[]).length,3);
 assert.match(html,/Design Fee<\\/dt><dd>[^<]+<\\/dd><p class="cxp-fee-note">Design scope\\nRoom plans/);assert.match(html,/Other Fee<\\/dt><dd>[^<]+<\\/dd><p class="cxp-fee-note">Installation/);
 for(const feeNotes of [{otherFee:123},{unknown:'x'},{designFee:'x'.repeat(1001)},[]])assert.throws(()=>c.cxp208Validate({...config,feeNotes},c.cxp208Products('PJ')),/备注/);
 delete config.feeNotes;assert.doesNotThrow(()=>c.cxp208Validate(config,c.cxp208Products('PJ')));
});
`;
fs.writeFileSync(file,s);
const share=path.join(root,'george-crm-react/tests/client-share-v212.test.mjs');s=fs.readFileSync(share,'utf8');
s=s.replace("revision:3};storage", "feeNotes:{tradeFee:'运费约定',designFee:'设计范围',designReduction:'抵扣约定',otherFee:'安装费说明'},revision:3};storage");
s=s.replace("assert.equal(c.cxp208Config('PJ').rate,7.25);", "assert.equal(c.cxp208Config('PJ').rate,7.25);assert.equal(c.cxp208Config('PJ').feeNotes.otherFee,'安装费说明');");
s+=`\ntest('fee notes in shared snapshots are optional for old links and validated as bounded plain text',()=>{const {c}=fixture(),snapshot=c.cs212Snapshot('PJ'),old=copy(snapshot);delete old.config.feeNotes;assert.doesNotThrow(()=>c.cs212Validate(old,'PJ'));for(const notes of [null,[],{otherFee:5},{private:'x'},{designFee:'x'.repeat(1001)}]){const bad=copy(snapshot);bad.config.feeNotes=notes;assert.throws(()=>c.cs212Validate(bad,'PJ'),/备注/);}assert.equal(snapshot.config.feeNotes.designFee,'设计范围');});\n`;
fs.writeFileSync(share,s);
console.log('Fee behavior and snapshot regression checks updated');
