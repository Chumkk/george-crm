const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..'),stamp='2026-11-03 11:24';
const d=JSON.parse(fs.readFileSync(path.join(__dirname,'space-prd-v242-content.json'),'utf8'));d.version='V1.99';d.updatedAt=stamp;
const item=d.modules.flatMap(m=>m.items).find(i=>i.title==='列表、统计与详情');
const walk=x=>{if(Array.isArray(x))return x.map(walk);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,walk(v)]));return typeof x==='string'?x.replace('未保存报价及无可靠历史工作稿显示未记录；独立费用订单不套用报价保存金额。','报价首次成功保存或提交后进入项目详情和商机详情的订单列表；两处列表的报价状态显示已暂存、已提交、已确认，不显示待报价。新建但未成功保存或提交的报价仍可从商机和报价待办继续编辑。真实历史订单及归档记录保留；无可靠报价状态或工作稿时显示未记录，不推断为待报价。独立费用订单不套用报价保存金额。'):x;};
Object.assign(item,walk(item));
const historyText='历史报价沿用同一状态名称及真实客户确认结果；历史归档表示记录只读，不替代报价状态，不改写历史提交、金额及关联关系。';
if(Array.isArray(item.rules))item.rules.push(historyText);else{for(const key of Object.keys(item))if(Array.isArray(item[key])&&item[key].some(x=>typeof x==='string'&&x.includes('首次成功保存'))){item[key].push(historyText);break;}}
const revision=d.revisions.rows.find(r=>r.module.includes('列表、统计与详情'));
revision.changes[1]='商机详情、项目详情订单列表分别展示保存金额与最近提交的订单金额；报价首次成功保存或提交后进入列表，报价状态为已暂存、已提交、已确认。未保存的编辑占位不列入；真实历史订单及履行记录保留，缺失状态不推断为待报价。仅保存不改变对客内容、ERP金额和收款门槛。';
fs.writeFileSync(path.join(__dirname,'space-prd-v243-content.json'),JSON.stringify(d,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'render-prd-v243.py'),fs.readFileSync(path.join(__dirname,'render-prd-v242.py'),'utf8').replaceAll('space-prd-v242-content.json','space-prd-v243-content.json').replaceAll('V1.98','V1.99').replaceAll('2026-11-03 11:14',stamp));
const updates=path.join(root,'george-crm-react/src/features/prd/document-updates.json'),u=JSON.parse(fs.readFileSync(updates,'utf8'));u['space-quote']=stamp;fs.writeFileSync(updates,JSON.stringify(u,null,2)+'\n');
