const fs=require('fs'),path=require('path'),crypto=require('crypto'),root=path.resolve(__dirname,'..'),rows=[];
const add=(local,remote=local)=>{const b=fs.readFileSync(path.join(root,local));rows.push({path:remote,local,size:b.length,sha:crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')});};
const intermediate=new Set(['quote-editor-481fe0a95093.html','quote-editor-def99ddf251c.html','quote-editor-20f8bd99ae66.html','quote-editor-7bee97a17521.html','quote-editor-58240901fdc6.html','quote-editor-52e8e5eccd92.html','quote-editor-ef3b6c714ef5.html','quote-editor-28ec46a435fb.html']);
for(const e of fs.readdirSync(path.join(root,'george-crm-react/dist'),{withFileTypes:true}))if(e.isFile()&&!intermediate.has(e.name))add('george-crm-react/dist/'+e.name,e.name);
for(const p of ['src/compat/runtime/clientProposal.js','src/features/prd/document-updates.json','tests/client-proposal-v208.test.mjs','public/space-quote-prd.html','public/space-quote-prd.pdf'])add('george-crm-react/'+p);
for(const p of ['work/prepare-release-v253.cjs','work/update-prd-v253.py','work/space-prd-v253-content.json','work/render-prd-v253.py','work/v253-prd-checks.json'])add(p);
fs.writeFileSync(path.join(__dirname,'v253-manifest.json'),JSON.stringify(rows));console.log(JSON.stringify({files:rows.length}));
