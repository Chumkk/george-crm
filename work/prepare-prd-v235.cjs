const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const d=JSON.parse(fs.readFileSync(path.join(__dirname,'space-prd-v230-content.json'),'utf8'));
const time=new Date(Date.now()+8*3600000).toISOString().slice(0,16).replace('T',' ');d.version='V1.95';d.date='2026-11-02';d.updatedAt=time;
const item=(m,title)=>d.modules[m].items.find(x=>x.title===title);
const permissions=item(1,'办理权限与完成条件');permissions.actor='当前负责人；产品报价的授权助理；发起人按编辑权限操作';permissions.bullets[0]=permissions.bullets[0].replace('查看权限不代表代办权限。','查看权限不代表办理权限；产品报价助理须有该精确待办的有效协助授权。');permissions.table.rows.find(r=>r[0]==='产品 / 设计报价')[1]='产品：当前SM或该待办授权的报价助理创建、编辑、保存、提交；设计：当前设计负责人；PM：按既有规则催办';
item(1,'分类、列表与搜索').bullets.push('产品报价待办直接展示报价状态、精确关联订单的ERP执行状态及传输状态，并标明报价助理。未创建订单、未传输、等待回执、实际执行分别显示，不借用其他品类、部门或加单订单的状态。存在未提交修改时，已保存工作稿与最近发布版本、客户确认分别展示。助理在“我负责”范围内办理同一待办，不生成重复任务。');
item(1,'待办处理记录').bullets.push('记录报价助理的安排、更换和取消，保留原助理、新助理、安排人及时间。助理编辑、保存和提交均记录实际操作人，不替换为SM；协助本身不转移商机或待办负责人，不重置原到达时间、期限及历史。');
d.modules[1].items.push({title:'助理报价',summary:'SM为产品报价待办选择助理，助理按相同报价权限处理原报价和原待办。',entry:'产品报价待办 → 助理报价 / 管理报价助理',actor:'当前SM安排协助；SM及授权助理办理报价',anchor:'quotation-assistance',refs:['ASSIST01'],codes:['E51'],bullets:['SM可在待处理的产品报价待办中选择、调整或取消报价助理；候选来自现有有效人员。商机及待办负责人仍为SM，协助授权仅适用于精确关联的本项目、本商机和本报价，不扩大其他业务权限。','助理与SM具有相同的报价创建、编辑、保存和提交权限。提交成功发布两端报价总览、记录精确报价版本的ERP请求并完成同一待办；不增加内部确认步骤。客户确认独立于提交。','助理遵守与SM一致的ERP状态、备货锁定、空间、版本及业务校验；不因协助授权放开已备货报价。授权被取消、人员失效或负责人变更后，旧授权不能继续保存或提交；失败保留输入，不改变提交历史和订单。','安排、更换、取消及实际报价操作按「待办处理记录」保存；普通保存不发布、不传ERP、不完成待办。催办仍遵循「催办」的既有角色与24小时限制，协助授权不替代发起人权限。']});
const product=item(4,'产品报价单');product.actor='当前商机SM或精确报价待办的授权助理';product.bullets[1]='带入项目当前全部空间，在所需空间录入本次产品，其余空间保留空产品列表。普通品类商机保持本品类校验；Sourcing、SinoChina等跨品类部门商机不限制报价内容，保留每项产品的实际品类。产品选择、模板字段和计算沿用现有报价能力。';
item(4,'提交报价与 ERP 传输').actor='当前商机SM、产品报价授权助理或设计负责人';item(4,'提交报价与 ERP 传输').bullets[2]+=' 产品报价可由该待办授权助理提交，提交人、任务办理人和ERP请求操作人均记录实际助理。';
d.modules[4].items.push({title:'复用已提交报价',summary:'在当前编辑页预览并复用来源报价最近一次成功提交的内容。',entry:'产品报价编辑页 → 复用已提交报价',actor:'有当前报价编辑权限且有来源报价查看权限的SM或授权助理',anchor:'quotation-reuse',refs:['REUSE01'],codes:['E52'],bullets:['候选仅来自有权查看的已提交产品报价；每张来源报价读取后端保存的最近一次成功提交快照，包括产品、规格、数量、价格、图片、报价所需材料与公式信息。来源后续仅编辑保存的工作内容不参与复用。例如V3已提交后又保存修改，复用仍读取V3。','选择来源后展示报价、项目、提交版本、提交人、时间、金额及产品预览；历史缺失作者或时间显示未记录，不编造来源。来源在选择后再次提交时，导入前提示重新读取最近版本。','将来源空间明确对应到当前报价空间，可跳过不采购的来源空间。追加产品前明确提示保留当前已有内容；为导入行生成新的明细身份，不复制来源客户、项目、商机、订单、确认、ERP状态和待办关系。','复用只改变当前工作稿，支持撤销，不自动保存、提交或覆盖来源报价。相同模板可追加；空白工作稿可沿用来源模板。已填写工作稿与来源模板或材料辅助表冲突时提示核对，不静默覆盖已有内容。','来源报价已备货不影响其已提交版本作为只读来源；目标报价仍按自身ERP、授权、当前空间或加单范围及现有报价规则校验。无可编辑历史明细、无访问权限或读取失败时提示原因并可重新选择，当前工作稿保留。']});
const mapping=item(2,'部门品类映射');mapping.summary='按稳定部门ID识别普通品类或跨品类部门业务，PM确认部门报价的客户展示名称。';mapping.bullets[0]='原有32个父级部门映射继续保留；Sourcing父级ID为222，其业务归属为跨品类部门。SinoChina及后续部门使用组织服务的实际稳定ID配置，不编造或按名称模糊匹配。';mapping.bullets.push('Sourcing、SinoChina等跨品类部门在分配时由PM确认“客户报价名称”，例如“家具与灯饰采购方案”。区域内、跨区域及转介绍保存时使用同一字段校验，随原申请、承接及商机保留；内部部门身份与客户名称分别保存，名称不用于限制实际选品。','跨品类部门可与家具、灯饰等普通品类商机并存，也可包含相同实际产品品类；按各自报价身份、版本及原单/加单范围独立发布、客户确认和传ERP。既有单一当前负责人及申请重复限制按原业务归属分别校验，不因产品实际品类相同占用另一业务的负责人名额。');
d.modules[2].items.push({title:'部门报价客户名称',summary:'PM确认便于客户理解的采购方案名称，内部部门与产品实际品类分别保留。',entry:'分配商机 → 选择跨品类部门方案经理 → 客户报价名称',actor:'有商机分配权限的PM',anchor:'department-quotation-name',refs:['DEPTQUOTE01'],codes:['E53'],bullets:['选择Sourcing、SinoChina等跨品类部门后，PM填写并确认客户报价名称，不能为空。名称用于说明本次采购方案，如“家具与灯饰采购方案”；它不替代实际产品品类，也不限制报价内容。普通家具等品类沿用原有名称与品类规则。','内部项目报价总览保留客户报价名称、部门及负责人；客户总览以客户报价名称识别该报价业务，明细标注实际产品品类及空间。客户可看到具体购买内容，不只看到内部部门名。','客户名称随成功提交保存至报价及历史版本；后续资料维护或工作稿保存不改写已发布内容和历史确认。原有部门报价历史继续保留，不为补充新名称覆盖旧提交。','一张部门报价可能包含家具、灯饰等多种实际品类。总览按该报价业务展示名称、金额和确认状态；实际品类属于明细信息，不能因此拆成重复报价、重复金额或重复ERP请求。客户确认仍绑定精确报价、当前版本及原单/加单范围。']});
item(6,'报价清单与筛选').bullets.push('跨品类部门报价按「部门报价客户名称」展示，内部同时保留归属部门和负责人。普通品类、跨品类部门及设计报价按精确提交记录汇总，不因实际产品品类相同合并报价或重复统计。');
item(7,'客户清单与空间筛选').bullets.push('跨品类部门业务使用PM确认并随提交保存的客户报价名称，例如“家具与灯饰采购方案”；产品明细保留实际品类与空间。报价业务名称作为原有报价分组的展示名称，其内部身份不变，空间联动、金额统计、原单/加单及确认仍按精确报价范围处理。');
item(7,'客户直接确认').bullets.push('跨品类部门的确认按钮使用客户报价名称，并确认该业务报价完整适用空间及精确版本，不按明细中实际品类重复确认同一报价。内部部门身份、报价版本及确认范围同时保留。');
for(const key of ['ASSIST01','REUSE01','DEPTQUOTE01'])if(!d.sourceRequirements.includes(key))d.sourceRequirements.push(key);for(const key of ['E51','E52','E53'])if(!d.entrances.includes(key))d.entrances.push(key);
d.revisions.rows.unshift({time,module:'「助理报价」\n「复用已提交报价」\n「部门报价客户名称」',changes:['产品报价待办支持SM安排助理；助理与SM同等编辑、保存、提交，保留实际操作人并遵守ERP限制。待办同步显示报价与精确订单ERP状态。','报价编辑页复用最近一次成功提交快照，预览并对应空间后追加工作稿；提交后仅保存的修改不参与复用，不自动保存或提交。','跨品类部门不限制报价内容，PM分配时确认客户报价名称；客户按采购方案名称识别报价、明细保留实际品类，内部保留部门及负责人。'],roles:'PM、SM、报价助理、客户'});
fs.writeFileSync(path.join(__dirname,'space-prd-v235-content.json'),JSON.stringify(d,null,2));
let renderer=fs.readFileSync(path.join(__dirname,'render-prd-v230.py'),'utf8').replaceAll('space-prd-v230-content.json','space-prd-v235-content.json').replaceAll('V1.94','V1.95').replaceAll('2026-10-29 17:19',time);
renderer=renderer.replace("['区域内 / 跨区域 / 设计服务，可并行']","['部门报价由 PM 确认客户报价名称']").replace("'报价任务：保存工作稿'","'报价任务：SM / 报价助理办理'").replace('产品按项目空间校验；可一键比价后核对','按ERP状态编辑；可复用最近提交版本');
fs.writeFileSync(path.join(__dirname,'render-prd-v235.py'),renderer);
let flow=fs.readFileSync(path.join(__dirname,'build-unified-workflow-v229.py'),'utf8').replace("'方案经理 SM'","'方案经理 SM / 报价助理'")
.replace("['按完整项目空间创建报价','只在需要的空间放产品','同商机保留唯一报价及历史']","['SM及助理依ERP状态办理','复用最近提交到工作稿','客户名称与实际品类分开']")
.replace("['只读项目空间，原抽屉维护','产品分配须已有完整命名空间','转介绍附原因及同意截图']","['只读项目空间，原抽屉维护','跨品类部门确认客户报价名称','转介绍附原因及同意截图']")
.replace('同次保存 ERP 请求并完成报价任务','提交人实名，ERP请求及原待办完成')
.replace('一个项目可同时分配产品与设计商机，两类业务按各自待办并行推进。','一个项目可同时分配产品与设计商机；产品报价可由SM或授权助理办理，跨品类部门使用PM确认的客户报价名称。')
.replace('new-workflow-v229-layout.json','new-workflow-v235-layout.json').replace('敬城CRM新流程图_2026-10-28_提交报价与ERP.html','敬城CRM新流程图_2026-11-02_助理与部门报价.html');
fs.writeFileSync(path.join(__dirname,'build-unified-workflow-v235.py'),flow);
const stamp=path.join(root,'george-crm-react/src/features/prd/document-updates.json'),updates=JSON.parse(fs.readFileSync(stamp,'utf8'));updates['space-quote']=time;updates['new-workflow']=time;fs.writeFileSync(stamp,JSON.stringify(updates,null,2)+'\n');
console.log(JSON.stringify({version:d.version,updatedAt:time}));
