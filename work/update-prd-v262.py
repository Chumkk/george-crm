from pathlib import Path
from datetime import datetime,timezone,timedelta
import json
r=Path(__file__).resolve().parents[1];previous=json.loads((r/'work/space-prd-v261-content.json').read_text(encoding='utf8'))
d=json.loads(json.dumps(previous));stamp=datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M')
d['version']='V2.08';d['date']=stamp[:10];d['updatedAt']=stamp
for row in d['revisions']['rows']:
 if row['time']=='2026-11-04 11:45':row['module']='「报价预览与分享」'
 row.pop('roles',None)
d['revisions']['headers']=['变更时间','功能模块 / 入口','修订内容']
todo=next(m for m in d['modules'] if m['title']=='待办中心')['items'][0]
todo['bullets'].extend([
 '卡片以“下一步”一句话说明下一项办理动作及其负责人员或角色。需等待本任务完成的动作注明“接单后”“审批通过后”“提交后”等条件；由其他人员、客户或系统办理时明确标注，不默认由当前查看人办理，不绑定具体沟通渠道。按精确关联业务的当前状态展示，后继事项已完成或取消时不再提示重复办理。',
 '产品报价的待处理提示为：提交后，报价将更新至客户链接并发起ERP传输；备货前须由客户确认报价。（保存仅暂存，不发布、不传ERP）。已提交但未确认时提示备货前须由客户确认报价；已确认时提示PM／SM跟进订单执行。该提示解释现有业务规则，不增加内部确认步骤，也不将客户确认作为提交、记录ERP请求或完成报价待办的前提。',
 '已提交报价再次暂存、PM调整项目空间或采购品类使原报价需重新提交时，在待处理卡片显示对应的“重新激活原因”；尚未完成的任务因空间或品类变更需处理时显示“待处理原因”。原因与原变更及处理历史对应，首次创建或首次暂存不标为重新激活。卡片保留简短原因，实际操作人、时间及详细变化从「待办处理记录」查看，历史缺值不编造。',
 '下一步及原因提示仅帮助理解办理顺序和责任，不生成新待办、不完成业务、不扩大查看或操作权限。产品报价助理仍办理同一报价和原待办，SM负责人的身份不因提示或实际助理提交而改变。',
])
todo['table']['rows'].extend([
 ['下一步','一句话展示办理动作及负责人员／角色；未来动作注明触发条件','区分当前查看人、其他人员、客户及系统。与精确关联任务当前状态一致，不列完整流程，不要求重复办理已完成事项。'],
 ['重新激活原因 / 待处理原因','已提交报价再次暂存、项目空间调整或采购品类调整','只显示实际发生的原因；首次暂存不冒用重新激活。实际处理人、时间及变化见「待办处理记录」，不改变原提交、确认或订单历史。'],
])
d['revisions']['rows'].insert(0,{'time':stamp,'module':'「分类、列表与搜索」','changes':['待办卡片用一句话说明下一步由谁办理什么，并注明必要的触发条件；区分当前办理人、其他人员、客户与系统。','报价待办显示与原处理历史对应的重新激活或待处理原因，区分再次暂存、空间调整及品类调整。']})
for old,new in zip(previous['modules'],d['modules']):
 if old['title']!='待办中心':assert old==new,old['title']
(r/'work/space-prd-v262-content.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
s=(r/'work/render-prd-v261.py').read_text(encoding='utf8').replace('space-prd-v261-content.json','space-prd-v262-content.json').replace('V2.07','V2.08').replace('2026-11-04 20:42',stamp)
s=s.replace('<col style="width:15%"><col style="width:19%"><col style="width:51%"><col style="width:15%">','<col style="width:15%"><col style="width:22%"><col style="width:63%">')
s=s.replace("+'</td><td class=\"revision-roles\">'+rich(r['roles'])",'')
s=s.replace('.revision-module,.revision-roles{','.revision-module{').replace('.revision-date,.revision-module,.revision-roles{','.revision-date,.revision-module{').replace('.revision-roles{color:#5b6470}','')
s=s.replace("'\\n'.join(str(j)+'. '+v for j,v in enumerate(r['changes'],1)),r['roles']]", "'\\n'.join(str(j)+'. '+v for j,v in enumerate(r['changes'],1))]")
s=s.replace("h=table['headers'];widths=([.25,.75]", "h=table['headers'];widths=([.15,.22,.63] if len(h)==3 and h[0]=='变更时间' else [.25,.75]")
assert "r['roles']" not in s
(r/'work/render-prd-v262.py').write_text(s,encoding='utf8')
p=r/'george-crm-react/src/features/prd/document-updates.json';j=json.loads(p.read_text(encoding='utf8'));j['space-quote']=stamp;p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
# Remove two stale descriptions of the retired manual quotation-confirm action.
p=r/'george-crm-react/src/features/notifications/roles.json';roles=json.loads(p.read_text(encoding='utf8'))
for row in roles:
 row['events']=row['events'].replace('设计单确认报价后','设计报价提交成功后')
 row['entry']=row['entry'].replace('不代替负责人确认报价','不重复触发ERP请求或完成待办')
p.write_text(json.dumps(roles,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'revision':d['version'],'updatedAt':stamp,'revisionColumns':len(d['revisions']['headers']),'nextStepAndReactivationCauseDocumented':True,'notificationRequirementsUnchanged':True}))
