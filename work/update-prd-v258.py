from pathlib import Path
from datetime import datetime,timezone,timedelta
import json
r=Path(__file__).resolve().parents[1]
d=json.loads((r/'work/space-prd-v253-content.json').read_text(encoding='utf8'))
stamp=datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M')
d['version']='V2.04';d['updatedAt']=stamp
for m in d['modules']:
 for item in m.get('items',[]):
  if item['title']=='报价预览与分享':
   for n,s in enumerate(item['bullets']):
    if s.startswith('项目费用统一通过CRM创建。'):
     item['bullets'][n]='设计费、其他费用读取本项目CRM来源订单，按来源单号去重并记录来源版本；设计报价使用已发布金额或实际订单金额，不读取未发布工作稿。外贸费用独立手工填写，不按海运费、货柜费、国内运费等订单自动汇总，也不自动判断费用与外贸方式的对应关系。'
    elif s.startswith('外贸费、设计费和其他费按CRM来源订单金额自动汇总'):
     item['bullets'][n]='设计费、其他费用按CRM来源订单金额只读汇总，无来源时为0；需要调整时维护来源订单。外贸费用保留人工填写，首次为空、必填，明确填写0允许保存。设计减免费保留人工填写，用于线下约定的抵扣，在Summary中单独列示。重新读取来源费用只更新设计费及其他费用，保留已填外贸费用和设计减免。定金比例和收款账号首次无默认值。'
    elif s.startswith('当前对客设置中的旧手填外贸费、设计费及其他费'):
     item['bullets'][n]='当前设计费、其他费用以来源订单金额为准，旧手填值不覆盖来源金额；已有外贸费用及设计减免继续保留手填值。当前设置沿用项目已保存的外贸方式，旧独立选值不覆盖项目。项目外贸方式或来源设计费、其他费用在填写期间更新时，提示重新读取并核对后保存；生成过程中更新时停止交付，避免混用版本。保存保留修改记录，已交付历史快照保留当次方式及费用。币种转换不改变来源订单金额。'
   item['bullets'].insert(2,'外贸方式直接沿用项目创建及后续维护保存的「物流方式」，本表单不再提供选择。展示当前值并提示修改位置：项目详情 → 编辑项目 → 物流方式。缺失时提示先补充项目信息，不默认补成CIF；表单保存不回写项目外贸方式。项目维护入口见「创建与编辑项目」。')
   for row in item.get('table',{}).get('rows',[]):
    if row[0]=='外贸方式':
     row[1]='沿用项目已保存的物流方式，只读展示，不提供重复选择'
     row[2]='提示前往项目详情 → 编辑项目 → 物流方式修改；缺失时先补充项目。生成客户资料前核对当前项目值，历史交付快照保留原值。'
    elif row[0]=='外贸费 / 设计费 / 设计减免费 / 其他费':
     row[1]='外贸费手填、必填、首次为空；设计减免费保留手填；设计费和其他费按CRM来源订单只读汇总'
     row[2]='手填金额为不小于0的有限值，外贸费明确填写0允许保存。重新读取来源不覆盖手填值；设计费和其他费按来源单号去重，无来源为0，尾款不能小于0。'
  if item['title']=='Summary 在线汇总':
   item['bullets']=[('外贸方式使用本次保存时读取的项目值；外贸费及设计减免费使用本次保存的手填金额，设计费和其他费使用CRM来源订单汇总。内部预览、客户交付快照和合同导出使用同一已保存计价版本。' if s.startswith('外贸费、设计费和其他费使用CRM来源订单') else s) for s in item['bullets']]
for rev in d['revisions']['rows']:
 changes=[]
 for s in rev['changes']:
  if s.startswith('项目费用统一通过CRM创建，外贸费'):
   s='设计费和其他费按CRM来源订单只读汇总，费用调整回到来源订单处理。'
  elif s.startswith('设计减免费保留人工填写并单独抵扣；既有对客设置中的独立手填费用'):
   s='设计减免费保留人工填写并单独抵扣；设计费和其他费的旧手填值按来源金额校正，历史交付快照继续保留。'
  s=s.replace('外贸费、设计费和其他费统一按CRM来源订单只读汇总；设计减免费保留人工填写。','外贸费用保留人工填写；设计费和其他费按CRM来源订单只读汇总，设计减免费保留人工填写。')
  changes.append(s)
 rev['changes']=changes
d['revisions']['rows'].insert(0,{'time':stamp,'module':'「报价预览与分享」\n「Summary 在线汇总」','changes':['外贸方式沿用项目已保存的物流方式，取消重复选择，并提示项目中的修改位置。','外贸费用和设计减免费保留手填；设计费及其他费用继续按CRM来源订单只读汇总，重新读取不覆盖手填金额。'],'roles':'PM、客户、财务'})
(r/'work/space-prd-v258-content.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
s=(r/'work/render-prd-v253.py').read_text(encoding='utf8').replace('space-prd-v253-content.json','space-prd-v258-content.json').replace('V2.03','V2.04').replace('2026-11-03 22:14',stamp)
(r/'work/render-prd-v258.py').write_text(s,encoding='utf8')
p=r/'george-crm-react/src/features/prd/document-updates.json';j=json.loads(p.read_text(encoding='utf8'));j['space-quote']=stamp;p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
