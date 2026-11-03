from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium,json,re
r=Path(__file__).resolve().parents[1];p=r/'george-crm-react/public/space-quote-prd.pdf';reader=PdfReader(p)
pages=[i for i,page in enumerate(reader.pages) if '均增加“暂存金额”' in re.sub(r'\s','',page.extract_text())]
assert pages
h=(r/'george-crm-react/public/space-quote-prd.html').read_text(encoding='utf8');ids=set(re.findall(r'id="([^"]+)"',h));missing=set(re.findall(r'href="#([^"]+)"',h))-ids
assert not missing and 'V2.01' in h and '保存金额' not in h
for ext in ['html','pdf']:assert (r/f'george-crm-react/public/space-quote-prd.{ext}').read_bytes()==(r/f'outputs/空间报价PRD/敬城CRM空间报价PRD_V2.01_模块阅读版.{ext}').read_bytes()
out=r/'tmp/pdfs/v245';out.mkdir(parents=True,exist_ok=True);doc=pdfium.PdfDocument(p)
for i in pages:doc[i].render(scale=1.3).to_pil().save(out/f'page-{i+1}.png')
print(json.dumps({'pages':len(reader.pages),'reviewPages':[i+1 for i in pages],'missingAnchors':len(missing)}))
