const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..'),stamp='2026-11-03 11:58';
const file=path.join(root,'george-crm-react/src/compat/runtime/opportunityQuotes.js');let source=fs.readFileSync(file,'utf8');source=source.replaceAll('保存金额','暂存金额').replaceAll('最近一次保存的报价金额','最近一次暂存的报价金额');fs.writeFileSync(file,source);
const test=path.join(root,'george-crm-react/tests/opportunity-quotes.test.mjs');fs.writeFileSync(test,fs.readFileSync(test,'utf8').replaceAll('保存金额','暂存金额'));
const d=JSON.parse(fs.readFileSync(path.join(__dirname,'space-prd-v244-content.json'),'utf8').replaceAll('保存金额','暂存金额').replaceAll('报价最近一次成功保存的工作稿金额','报价最近一次成功暂存的工作稿金额'));d.version='V2.01';d.updatedAt=stamp;
fs.writeFileSync(path.join(__dirname,'space-prd-v245-content.json'),JSON.stringify(d,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'render-prd-v245.py'),fs.readFileSync(path.join(__dirname,'render-prd-v244.py'),'utf8').replaceAll('space-prd-v244-content.json','space-prd-v245-content.json').replaceAll('V2.00','V2.01').replaceAll('2026-11-03 11:40',stamp));
const updates=path.join(root,'george-crm-react/src/features/prd/document-updates.json'),u=JSON.parse(fs.readFileSync(updates,'utf8'));u['space-quote']=stamp;fs.writeFileSync(updates,JSON.stringify(u,null,2)+'\n');
