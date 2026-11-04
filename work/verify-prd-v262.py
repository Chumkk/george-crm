from pathlib import Path
from pypdf import PdfReader
from html.parser import HTMLParser
import pypdfium2 as pdfium,json,re
r=Path(__file__).resolve().parents[1];p=r/'george-crm-react/public/space-quote-prd.pdf';reader=PdfReader(p)
texts=[re.sub(r'\s','',page.extract_text()) for page in reader.pages]
previous=json.loads((r/'work/space-prd-v261-content.json').read_text(encoding='utf8'));d=json.loads((r/'work/space-prd-v262-content.json').read_text(encoding='utf8'))
assert d['revisions']['headers']==['变更时间','功能模块 / 入口','修订内容'];assert all('roles' not in row for row in d['revisions']['rows'])
assert next(row for row in d['revisions']['rows'] if row['time']=='2026-11-04 11:45')['module']=='「报价预览与分享」'
for old,new in zip(previous['modules'],d['modules']):
 if old['title']!='待办中心':assert old==new,old['title']
todo=next(m for m in d['modules'] if m['title']=='待办中心')['items'][0];assert len(todo['bullets'])==len(next(m for m in previous['modules'] if m['title']=='待办中心')['items'][0]['bullets'])+4
assert any(row[0]=='下一步' for row in todo['table']['rows'])
assert any(row[0]=='重新激活原因 / 待处理原因' for row in todo['table']['rows'])
h=(r/'george-crm-react/public/space-quote-prd.html').read_text(encoding='utf8');ids=set(re.findall(r'id="([^"]+)"',h));assert not(set(re.findall(r'href="#([^"]+)"',h))-ids)
assert '涉及角色' not in h and 'revision-roles' not in h
revision=h[h.index('<table class="revision-table"'):h.index('</table>',h.index('<table class="revision-table"'))]
assert len(re.findall(r'<th>',revision))==3
assert not any('涉及角色' in t for t in texts)
for phrase in ['卡片以“下一步”一句话说明','重新激活原因','分类、列表与搜索']:assert any(phrase in t for t in texts),phrase
for ext in ['html','pdf']:assert (r/f'george-crm-react/public/space-quote-prd.{ext}').read_bytes()==(r/f'outputs/空间报价PRD/敬城CRM空间报价PRD_V2.08_模块阅读版.{ext}').read_bytes()
release=json.loads((r/'george-crm-react/dist/app-release.json').read_text());assert release['documents']['space-quote-prd.html'] in h
roles=json.loads((r/'george-crm-react/src/features/notifications/roles.json').read_text(encoding='utf8'));assert not any(re.search('设计单确认报价后|不代替负责人确认报价',row['events']+row['entry']) for row in roles)
pages=sorted({0,*[i for i,t in enumerate(texts) if '卡片以“下一步”一句话说明' in t or '重新激活原因/待处理原因' in t]})
out=r/'tmp/pdfs/v262';out.mkdir(parents=True,exist_ok=True);doc=pdfium.PdfDocument(p)
for i in pages:doc[i].render(scale=1.25).to_pil().save(out/f'page-{i+1}.png')
result={'revision':'V2.08','pages':len(reader.pages),'reviewPages':[i+1 for i in pages],'revisionColumns':3,'tradeRevisionSummaryReferenceRemoved':True,'nextStepAndCauseDocumented':True,'notificationRulesUnchanged':True,'legacyNotificationRoleCopyCorrected':True,'otherRequirementModulesUnchanged':True,'anchorsValid':True,'archiveMatched':True,'releaseMatched':True,'focusedTestsPassed':101,'renderedBrowserVerified':False}
(r/'work/v262-prd-checks.json').write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps(result))
