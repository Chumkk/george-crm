from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]
d=json.loads((r/'work/space-prd-v246-content.json').read_text(encoding='utf8'))
d['version']='V2.03'
d['updatedAt']='2026-11-03 22:14'
for m in d['modules']:
 for item in m.get('items',[]):
  if item['title']=='报价预览与分享':
   item['bullets']=[s.replace('费用先读取该项目已创建的设计单和费用订单，按单号去重。','项目费用统一通过CRM创建。外贸费、设计费和其他费只读取该项目已创建的有效设计单和费用订单，按来源单号去重并保留来源版本。') for s in item['bullets']]
   item['bullets']=[('外贸费、设计费和其他费按CRM来源订单金额自动汇总，只读展示，无来源时为0；需要新增或调整费用时，须通过CRM创建或维护对应来源订单，不在报价预览与分享中另行录入或改写金额。设计减免费保留人工填写，用于线下约定的抵扣，在Summary中单独列示，不改写来源设计费。定金比例和收款账号首次无默认值，再次进入保留上次成功保存值。' if s.startswith('设计费、其他费用读取来源订单金额后允许调整展示值') else s) for s in item['bullets']]
   item['bullets'].insert(6,'当前对客设置中的旧手填外贸费、设计费及其他费不再作为有效金额；重新打开、保存、内部预览、生成新链接及导出时，统一读取来源订单金额，并保留旧设置的修改记录及已交付历史快照。来源费用在填写期间更新时，提示重新读取并核对后再保存；生成过程中更新时停止交付，避免混用费用版本。币种转换只改变展示计价，不改变来源订单原币金额。')
   for row in item.get('table',{}).get('rows',[]):
    if row[0]=='外贸费 / 设计费 / 设计减免费 / 其他费':
     row[1]='外贸费、设计费和其他费由CRM来源订单汇总，只读，无来源为0；设计减免费保留人工填写'
     row[2]='项目费用须通过CRM创建或维护来源订单。按来源单号去重；来源费用更新后重新核对。设计减免单列抵扣，金额为不小于0的有限值，尾款不能小于0。'
  if item['title']=='Summary 在线汇总':
   item['bullets'].insert(1,'外贸费、设计费和其他费使用CRM来源订单的汇总金额，不能在对客设置中独立修改；设计减免费按保存值单独抵扣。内部预览、客户交付快照和合同导出使用同一已保存的费用来源版本。')
for rev in d['revisions']['rows']:
 rev['changes']=[s.replace('收款账号、定金比例、外贸费用首次无默认值，外贸费用必填。设计单及费用订单金额自动带入并可调整。','收款账号、定金比例首次无默认值。外贸费、设计费和其他费统一按CRM来源订单只读汇总；设计减免费保留人工填写。') for s in rev['changes']]
d['revisions']['rows'].insert(0,{'time':'2026-11-03 22:14','module':'「报价预览与分享」\n「Summary 在线汇总」','changes':['项目费用统一通过CRM创建，外贸费、设计费和其他费按来源订单只读汇总；费用调整回到来源订单处理。','设计减免费保留人工填写并单独抵扣；既有对客设置中的独立手填费用按来源金额校正，历史交付快照继续保留。'],'roles':'PM、费用经办人、财务'})
(r/'work/space-prd-v253-content.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
s=(r/'work/render-prd-v246.py').read_text(encoding='utf8').replace('space-prd-v246-content.json','space-prd-v253-content.json').replace('V2.02','V2.03').replace('2026-11-03 12:09','2026-11-03 22:14')
(r/'work/render-prd-v253.py').write_text(s,encoding='utf8')
updates=r/'george-crm-react/src/features/prd/document-updates.json'
j=json.loads(updates.read_text(encoding='utf8'));j['space-quote']='2026-11-03 22:14'
updates.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
