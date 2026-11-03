from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium,json,re
r=Path(__file__).resolve().parents[1]
p=r/'george-crm-react/public/space-quote-prd.pdf'
reader=PdfReader(p)
pages=[]
for i,page in enumerate(reader.pages):
 t=page.extract_text()
 if any(s in t for s in ['初始为未执行','ERP单据初始执行状态']):pages.append(i)
assert len(pages)>=2,pages
h=(r/'george-crm-react/public/space-quote-prd.html').read_text(encoding='utf8')
ids=set(re.findall(r'id="([^"]+)"',h))
missing=set(re.findall(r'href="#([^"]+)"',h))-ids
assert not missing,missing
assert 'V1.98' in h and '初始为未执行' in h and '未创建订单、未传输' not in h
out=r/'tmp/pdfs/v242';out.mkdir(parents=True,exist_ok=True)
doc=pdfium.PdfDocument(p)
for i in pages:doc[i].render(scale=1.3).to_pil().save(out/f'page-{i+1}.png')
print(json.dumps({'pages':len(reader.pages),'reviewPages':[i+1 for i in pages],'missingAnchors':len(missing)}))
