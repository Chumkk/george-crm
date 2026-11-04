from pathlib import Path
from datetime import datetime,timezone,timedelta
import json
r=Path(__file__).resolve().parents[1]
d=json.loads((r/'work/space-prd-v258-content.json').read_text(encoding='utf8'))
stamp=datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M')
d['version']='V2.05';d['date']=stamp[:10];d['updatedAt']=stamp
for m in d['modules']:
 for item in m.get('items',[]):
  if item['title']=='报价预览与分享':
   for n,s in enumerate(item['bullets']):
    if s.startswith('设计费、其他费用读取本项目CRM来源订单'):
     item['bullets'][n]='设计费首次读取本项目CRM来源订单，按来源单号去重；设计报价使用已发布金额或实际订单金额，不读取未发布工作稿。带出后允许修改并保存约定金额，不回写来源订单。其他费用独立人工填写，首次为0。外贸费用独立手工填写，不按海运费、货柜费、国内运费等订单自动汇总，也不自动判断费用与外贸方式的对应关系。'
    elif s.startswith('设计费、其他费用按CRM来源订单金额只读汇总'):
     item['bullets'][n]='外贸费用首次为空、必填，明确填写0允许保存；设计减免费保留人工填写，在Summary中单独列示并抵扣。设计费无来源时初始化为0；重新读取设计费仅更新该项金额，保留其他手填费用及全部备注。重新打开、切换币种或保存时保留已约定的金额，不自动用来源金额覆盖。定金比例和收款账号首次无默认值。'
    elif s.startswith('当前设计费、其他费用以来源订单金额为准'):
     item['bullets'][n]='已有对客设置保留已保存的费用金额。当前设置沿用项目已保存的外贸方式，旧独立选值不覆盖项目。项目外贸方式在填写期间更新时，提示重新核对后保存；客户资料生成过程中报价或设置更新时停止交付，避免混用版本。保存保留修改记录，已交付历史快照保留当次方式、费用及备注。币种转换不改变来源订单金额。'
   item['bullets'].append('外贸费、设计费、设计减免费、其他费各提供独立的客户可见备注，选填纯文本，保留换行。备注与对应费用一起保存、重新打开及记录版本；改备注属于对客内容变更，不修改产品报价、费用来源订单或其处理状态。对客链接内容见「Summary 在线汇总」。')
   for row in item.get('table',{}).get('rows',[]):
    if row[0]=='外贸费 / 设计费 / 设计减免费 / 其他费':
     row[1]='外贸费手填、必填、首次为空；设计费首次读取来源后允许修改；设计减免费、其他费手填'
     row[2]='金额为不小于0的有限值，外贸费明确填写0允许保存。设计费无来源初始化为0，其他费首次为0；重新读取设计费保留其余金额及备注，尾款不能小于0。'
   item['table']['rows'].append(['费用备注','四项费用分别选填客户可见备注','与费用一一对应；随已保存计价版本和交付快照保留。换行正常显示，空备注不占展示位置。'])
  if item['title']=='Summary 在线汇总':
   item['bullets']=[('外贸方式使用本次保存时读取的项目值；四项费用使用本次保存的约定金额。内部预览、客户交付快照和合同导出使用同一已保存计价版本，不重复叠加来源订单金额。' if s.startswith('外贸方式使用本次保存时读取的项目值') else s) for s in item['bullets']]
   item['bullets'].insert(2,'费用备注直接显示在对应费用的名称、金额下方，使用较小正文并保留换行；无备注时不显示。客户通过链接打开Summary即可阅读，手机与打印保持可见，不依赖悬停或点击符号。交付快照保存当次费用与备注，后续修改不覆盖历史快照；旧版本无备注时按空备注兼容。备注只展示文本，不作为HTML执行，也不参与金额计算。')
# Correct existing wording in place: restored editing rules do not create another revision item.
for rev in d['revisions']['rows']:
 for n,s in enumerate(rev['changes']):
  s=s.replace('设计费及其他费用继续按CRM来源订单只读汇总，重新读取不覆盖手填金额。','设计费首次读取CRM来源后可修改，其他费用手填；重新读取设计费保留其他手填金额。')
  s=s.replace('设计费和其他费按CRM来源订单只读汇总，费用调整回到来源订单处理。','设计费首次读取CRM来源后允许修改，其他费人工填写；不回写来源订单。')
  s=s.replace('设计费和其他费的旧手填值按来源金额校正，历史交付快照继续保留。','已有手填金额及历史交付快照继续保留。')
  s=s.replace('设计费和其他费按CRM来源订单只读汇总，设计减免费保留人工填写。','设计费首次读取来源后允许修改，其他费和设计减免费保留人工填写。')
  rev['changes'][n]=s
d['revisions']['rows'].insert(0,{'time':stamp,'module':'「报价预览与分享」\n「Summary 在线汇总」','changes':['四项费用分别提供客户可见备注，随费用保存并保留版本；客户Summary在对应费用下直接展示备注，兼容手机和打印阅读。'],'roles':'PM、客户'})
(r/'work/space-prd-v259-content.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
s=(r/'work/render-prd-v258.py').read_text(encoding='utf8').replace('space-prd-v258-content.json','space-prd-v259-content.json').replace('V2.04','V2.05').replace('2026-11-04 11:45',stamp)
(r/'work/render-prd-v259.py').write_text(s,encoding='utf8')
p=r/'george-crm-react/src/features/prd/document-updates.json';j=json.loads(p.read_text(encoding='utf8'));j['space-quote']=stamp;p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(stamp)
