from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium,json,re
r=Path(__file__).resolve().parents[1];p=r/'george-crm-react/public/space-quote-prd.pdf';reader=PdfReader(p)
texts=[re.sub(r'\s','',page.extract_text()) for page in reader.pages]
h=(r/'george-crm-react/public/space-quote-prd.html').read_text(encoding='utf8');ids=set(re.findall(r'id="([^"]+)"',h));assert not(set(re.findall(r'href="#([^"]+)"',h))-ids)
previous=json.loads((r/'work/space-prd-v260-content.json').read_text(encoding='utf8'));d=json.loads((r/'work/space-prd-v261-content.json').read_text(encoding='utf8'));assert previous['modules']==d['modules'];assert len(d['revisions']['rows'])==len(previous['revisions']['rows'])-1
revisions='\n'.join(s for row in d['revisions']['rows'] for s in row['changes'])
for phrase in ['设计费首次读取CRM来源后允许修改，其他费人工填写；不回写来源订单。','设计减免费保留人工填写并单独抵扣；已有手填金额及历史交付快照继续保留。','外贸费用和设计减免费保留手填；设计费首次读取CRM来源后可修改，其他费用手填；保存保留手填金额。']:assert phrase not in revisions and phrase not in h
assert '四项费用分别提供客户可见备注' in revisions
assert sum('外贸费用保留人工填写' in s for row in d['revisions']['rows'] for s in row['changes'])==1
assert sum('设计减免费保留人工填写' in s for row in d['revisions']['rows'] for s in row['changes'])==1
assert any('CNY固定1' in text for text in texts)
for ext in ['html','pdf']:assert (r/f'george-crm-react/public/space-quote-prd.{ext}').read_bytes()==(r/f'outputs/空间报价PRD/敬城CRM空间报价PRD_V2.07_模块阅读版.{ext}').read_bytes()
release=json.loads((r/'george-crm-react/dist/app-release.json').read_text());assert release['documents']['space-quote-prd.html'] in h
pages=sorted({0,*[i for i,text in enumerate(texts) if '四项费用分别提供客户可见备注' in text or '2026-10-28' in text]})
out=r/'tmp/pdfs/v261';out.mkdir(parents=True,exist_ok=True);doc=pdfium.PdfDocument(p)
for i in pages:doc[i].render(scale=1.25).to_pil().save(out/f'page-{i+1}.png')
result={'revision':'V2.07','pages':len(reader.pages),'reviewPages':[i+1 for i in pages],'anchorsValid':True,'archiveMatched':True,'releaseMatched':True,'removedChanges':3,'removedRows':1,'requirementsUnchanged':True,'noNewRevisionEntries':True,'renderedBrowserVerified':False}
(r/'work/v261-prd-checks.json').write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps(result))
