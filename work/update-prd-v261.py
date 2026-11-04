from pathlib import Path
from datetime import datetime,timezone,timedelta
import json
r=Path(__file__).resolve().parents[1];previous=json.loads((r/'work/space-prd-v260-content.json').read_text(encoding='utf8'))
d=json.loads(json.dumps(previous));stamp=datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M')
removed=[];rows=[]
for row in d['revisions']['rows']:
 if row['time']=='2026-11-03 22:14':
  removed.extend(row['changes']);continue
 if row['time']=='2026-11-04 11:45':
  removed.extend(row['changes'][1:]);row['changes']=row['changes'][:1]
 rows.append(row)
d['revisions']['rows']=rows
assert len(removed)==3
assert d['modules']==previous['modules'], 'Requirements must remain unchanged'
assert d['revisions']['rows'][0]==previous['revisions']['rows'][0], 'Keep new fee notes entry'
d['version']='V2.07';d['date']=stamp[:10];d['updatedAt']=stamp
(r/'work/space-prd-v261-content.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
s=(r/'work/render-prd-v260.py').read_text(encoding='utf8').replace('space-prd-v260-content.json','space-prd-v261-content.json').replace('V2.06','V2.07').replace('2026-11-04 17:15',stamp)
(r/'work/render-prd-v261.py').write_text(s,encoding='utf8')
p=r/'george-crm-react/src/features/prd/document-updates.json';j=json.loads(p.read_text(encoding='utf8'));j['space-quote']=stamp;p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(r/'work/v261-revision-cleanup.json').write_text(json.dumps({'removedChanges':removed,'requirementsUnchanged':d['modules']==previous['modules'],'noNewRevisionEntries':len(rows)==len(previous['revisions']['rows'])-1,'notesEntryRetained':True,'originalFeeEntryRetained':any(x['time']=='2026-10-28 18:06' and any('外贸费用保留人工填写' in s for s in x['changes']) for x in rows)},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'removedChanges':len(removed),'removedRows':1,'version':d['version'],'updatedAt':stamp}))
