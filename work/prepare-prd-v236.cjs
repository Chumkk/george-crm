const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
let d=JSON.parse(fs.readFileSync(path.join(__dirname,'space-prd-v235-content.json'),'utf8'));
const oldTime=d.updatedAt,time=new Date(Date.now()+8*3600000).toISOString().slice(0,16).replace('T',' ');
d=JSON.parse(JSON.stringify(d).replaceAll('客户报价名称','品类名称').replaceAll('部门报价客户名称','部门报价品类名称'));d.version='V1.96';d.updatedAt=time;
const item=d.modules[2].items.find(x=>x.anchor==='department-quotation-name');
item.title='部门报价品类名称';item.summary='PM确认项目与客户总览共用的品类名称，默认部门名称，同项目校验重名。';
item.bullets[0]='选择Sourcing、SinoChina等跨品类部门后，品类名称默认带入对应部门名称，PM可修改。输入框提示“用于项目、客户报价总览的品类展示”。去除首尾空格后不能为空，最多80字；名称只用于展示，不限制实际报价内容，也不改变产品实际品类。';
item.bullets[1]='项目报价总览、客户Summary及客户报价清单使用同一已提交品类名称，不在项目总览品类名称后另行拼接部门。部门身份、负责人及产品实际品类独立保存，内部部门仍在原有商机和订单信息中查阅。';
item.bullets[2]=item.bullets[2].replace(/^客户名称/,'品类名称');
item.bullets.push('同一项目内检查品类名称是否重复，覆盖已有关联产品商机、当前有效提交、待接单与待审批申请，以及本次同时分配的各项名称；普通品类名称也参与查重。比较时统一全半角、忽略首尾空格和英文大小写，连续空格归一。不同项目可重名，同一业务的原单及加单不因名称相同冲突。重名提示具体名称并保留输入，修改后重新提交；失败不得生成商机、申请或下游任务。');
for(const m of d.modules)for(const x of m.items){x.bullets=x.bullets.map(s=>s.replace('内部同时保留归属部门和负责人。','品类名称在项目与客户总览保持一致；部门与负责人保留在原有业务资料中。').replace('内部项目报价总览保留品类名称、部门及负责人；客户总览以品类名称识别该报价业务','项目及客户总览使用同一品类名称识别该报价业务').replace('内部保留部门及负责人','部门及负责人独立保留'));}
d.revisions.rows[0].module=d.revisions.rows[0].module.replace('部门报价客户名称','部门报价品类名称');d.revisions.rows[0].changes[2]='跨品类部门不限制报价内容；PM分配时确认品类名称，默认部门名称，同项目校验重名。项目总览、客户Summary及报价清单显示同一名称，实际产品品类、部门及负责人独立保留。';
fs.writeFileSync(path.join(__dirname,'space-prd-v236-content.json'),JSON.stringify(d,null,2));
let renderer=fs.readFileSync(path.join(__dirname,'render-prd-v235.py'),'utf8').replaceAll('space-prd-v235-content.json','space-prd-v236-content.json').replaceAll('V1.95','V1.96').replaceAll(oldTime,time).replaceAll('客户报价名称','品类名称');fs.writeFileSync(path.join(__dirname,'render-prd-v236.py'),renderer);
let flow=fs.readFileSync(path.join(__dirname,'build-unified-workflow-v235.py'),'utf8').replaceAll('客户报价名称','品类名称').replaceAll('客户名称与实际品类分开','统一总览品类名称').replaceAll('跨品类部门确认品类名称','PM确认品类名称并查重').replaceAll('v235-layout','v236-layout').replaceAll('助理与部门报价.html','助理与部门品类.html');fs.writeFileSync(path.join(__dirname,'build-unified-workflow-v236.py'),flow);
const stamp=path.join(root,'george-crm-react/src/features/prd/document-updates.json'),updates=JSON.parse(fs.readFileSync(stamp,'utf8'));updates['space-quote']=time;updates['new-workflow']=time;fs.writeFileSync(stamp,JSON.stringify(updates,null,2)+'\n');console.log(JSON.stringify({version:d.version,time}));
