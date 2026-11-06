from pathlib import Path
import json,sys,re
r=Path(__file__).resolve().parents[1];previous=json.loads((r/'work/space-prd-v262-content.json').read_text(encoding='utf8'))
d=json.loads(json.dumps(previous));stamp=sys.argv[1];assert re.fullmatch(r'2026-11-05 \d{2}:\d{2}',stamp)
d['version']='V2.09';d['date']='2026-11-05';d['updatedAt']=stamp
module=next(m for m in d['modules'] if m['title']=='企业微信通知');items={item['title']:item for item in module['items']}
events=items['事件与接收人'];events['summary']='按成功保存的业务结果定向通知，同次报价提交给PM只发送一条结果。'
events['bullets'][1]='报价提交、发布两端报价、完成精确关联报价待办和记录ERP请求由同次提交完成。对同一成功提交版本的当前PM，只发送一条“报价已提交”结果通知，合并展示报价提交、待办完成及ERP请求已记录；PM同时为提交人或办理人时也须收到该结果。普通暂存不发送提交完成通知，同次提交重试不重复通知。客户确认、ERP实际接收回执及收款、执行结果仍按各自业务事件独立通知。'
rows=[]
for row in events['table']['rows']:
 if row[0]=='报价提交 / 重提':row=['报价提交 / 重提（合并报价待办完成与ERP请求记录）','当前PM、相关负责人；同一提交版本给PM只发一条','对应报价版本；PM进入精确报价待办，查看本次报价及处理记录']
 if row[0]=='提交报价与 ERP 传输':continue
 rows.append(row)
events['table']['rows']=rows
cards=items['通知卡片与精确入口']
cards['bullets'].insert(2,'PM的合并提交结果卡使用“报价已提交”标题，保留本次实际提交人、项目、品类或设计服务、报价版本及本次成功保存的结果。正文说明报价已提交、对应待办已完成、ERP传输请求已记录；ERP请求已记录不表述为ERP已接收。SM或授权助理提交时均记录实际操作人，按钮为“查看报价待办”。')
for i,s in enumerate(cards['bullets']):
 if s.startswith('报价通知定位项目及品类'):
  cards['bullets'][i]='PM的合并报价提交通知定位精确报价待办；其他报价通知定位项目及品类，订单结果定位对应订单。登录后保留原目标，重新校验当前权限、归属和状态，已完成不重复办理。'
dedupe=items['去重、发送结果与催办']
dedupe['bullets'].insert(1,'同一项目、同一报价、同一成功提交版本及同一PM作为一组提交结果通知。报价提交、报价待办完成、ERP请求记录不得因内部事件名称不同拆成多条PM消息；重试和重复回调沿用该组记录。再次成功提交形成新版本时发送新一条结果。业务记录分别保留各自事件、状态及历史，消息合并不删除或合并报价、待办、ERP请求记录。')
d['revisions']['rows'].insert(0,{'time':stamp,'module':'「事件与接收人」\n「通知卡片与精确入口」\n「去重、发送结果与催办」','changes':['同次报价提交给PM只发送一条结果通知，合并说明报价已提交、对应待办已完成及ERP请求已记录；保留实际提交人、报价版本并进入精确报价待办。客户确认及ERP后续结果仍独立通知，业务记录与历史分别保留。']})
for old,new in zip(previous['modules'],d['modules']):
 if old['title']!='企业微信通知':assert old==new,old['title']
(r/'work/space-prd-v264-content.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
s=(r/'work/render-prd-v262.py').read_text(encoding='utf8').replace('space-prd-v262-content.json','space-prd-v264-content.json').replace('V2.08','V2.09').replace('2026-11-04 21:12',stamp)
(r/'work/render-prd-v264.py').write_text(s,encoding='utf8')
p=r/'george-crm-react/src/features/prd/document-updates.json';j=json.loads(p.read_text(encoding='utf8'));j['space-quote']=stamp;p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'revision':d['version'],'updatedAt':stamp,'scope':'PRD notification requirement only; prototype event generation unchanged'}))
