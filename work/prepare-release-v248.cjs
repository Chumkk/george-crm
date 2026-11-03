const fs=require('fs'),path=require('path'),crypto=require('crypto'),root=path.resolve(__dirname,'..'),rows=[];
const add=(local,remote=local)=>{const b=fs.readFileSync(path.join(root,local));rows.push({path:remote,local,size:b.length,sha:crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')});};
const intermediate=new Set(['quote-editor-481fe0a95093.html','quote-editor-def99ddf251c.html','quote-editor-20f8bd99ae66.html','quote-editor-7bee97a17521.html','quote-editor-58240901fdc6.html','quote-editor-52e8e5eccd92.html','quote-editor-ef3b6c714ef5.html','quote-editor-28ec46a435fb.html']);
for(const e of fs.readdirSync(path.join(root,'george-crm-react/dist'),{withFileTypes:true}))if(e.isFile()&&!intermediate.has(e.name))add('george-crm-react/dist/'+e.name,e.name);
for(const p of ['src/compat/runtime/todoScenario.js','src/compat/loadRuntime.js','vite.config.js','tests/product-images-v247.test.mjs','tests/todo-scenarios-v248.test.mjs'])add('george-crm-react/'+p);
add('work/prepare-release-v248.cjs');fs.writeFileSync(path.join(__dirname,'v248-manifest.json'),JSON.stringify(rows));console.log(JSON.stringify({files:rows.length}));
