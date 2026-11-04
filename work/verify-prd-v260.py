from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium,json,re
r=Path(__file__).resolve().parents[1];p=r/'george-crm-react/public/space-quote-prd.pdf';reader=PdfReader(p)
texts=[re.sub(r'\s','',page.extract_text()) for page in reader.pages]
required=['外贸费用下方展示修改提示','保留已约定的金额和备注','费用备注直接显示在对应费用']
for phrase in required:assert any(phrase in text for text in texts),phrase
pages=sorted({0,*[i for i,text in enumerate(texts) if any(s in text for s in required)]})
h=(r/'george-crm-react/public/space-quote-prd.html').read_text(encoding='utf8');ids=set(re.findall(r'id="([^"]+)"',h));assert not(set(re.findall(r'href="#([^"]+)"',h))-ids)
for phrase in ['重新读取设计费','设计费和其他费按CRM来源订单只读汇总']:assert phrase not in h,phrase
for ext in ['html','pdf']:assert (r/f'george-crm-react/public/space-quote-prd.{ext}').read_bytes()==(r/f'outputs/空间报价PRD/敬城CRM空间报价PRD_V2.06_模块阅读版.{ext}').read_bytes()
previous=json.loads((r/'work/space-prd-v259-content.json').read_text(encoding='utf8'));source=json.loads((r/'work/space-prd-v260-content.json').read_text(encoding='utf8'));assert len(source['revisions']['rows'])==len(previous['revisions']['rows'])
release=json.loads((r/'george-crm-react/dist/app-release.json').read_text());assert release['documents']['space-quote-prd.html'] in h
out=r/'tmp/pdfs/v260';out.mkdir(parents=True,exist_ok=True);doc=pdfium.PdfDocument(p)
for i in pages:doc[i].render(scale=1.25).to_pil().save(out/f'page-{i+1}.png')
result={'revision':'V2.06','pages':len(reader.pages),'reviewPages':[i+1 for i in pages],'anchorsValid':True,'archiveMatched':True,'releaseMatched':True,'noNewRevisionEntries':True,'renderedBrowserVerified':False}
(r/'work/v260-prd-checks.json').write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps(result))
