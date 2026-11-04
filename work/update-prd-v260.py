from pathlib import Path
from datetime import datetime,timezone,timedelta
import json
r=Path(__file__).resolve().parents[1];d=json.loads((r/'work/space-prd-v259-content.json').read_text(encoding='utf8'))
stamp=datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M')
d['version']='V2.06';d['date']=stamp[:10];d['updatedAt']=stamp
replacements={
 '重新读取设计费仅更新该项金额，保留其他手填费用及全部备注。':'',
 '重新打开、切换币种或保存时保留已约定的金额，':'重新打开、切换币种或保存时保留已约定的金额和备注，',
 '重新读取设计费保留其余金额及备注，尾款不能小于0。':'保存保留约定金额及备注，尾款不能小于0。',
 '；重新读取设计费保留其他手填金额。':'；保存保留手填金额。',
 '展示当前值并提示修改位置：项目详情 → 编辑项目 → 物流方式。':'外贸费用下方展示修改提示：项目详情 → 编辑项目 → 物流方式。',
}
def update(value):
 if isinstance(value,str):
  for before,after in replacements.items():value=value.replace(before,after)
  return value
 if isinstance(value,list):return [update(x) for x in value]
 if isinstance(value,dict):return {k:update(v) for k,v in value.items()}
 return value
d=update(d)
(r/'work/space-prd-v260-content.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
s=(r/'work/render-prd-v259.py').read_text(encoding='utf8').replace('space-prd-v259-content.json','space-prd-v260-content.json').replace('V2.05','V2.06').replace('2026-11-04 14:37',stamp)
(r/'work/render-prd-v260.py').write_text(s,encoding='utf8')
p=r/'george-crm-react/src/features/prd/document-updates.json';j=json.loads(p.read_text(encoding='utf8'));j['space-quote']=stamp;p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(stamp)
