from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium,json,re
r=Path(__file__).resolve().parents[1];p=r/'george-crm-react/public/space-quote-prd.pdf';reader=PdfReader(p)
pages=[i for i,page in enumerate(reader.pages) if any(s in re.sub(r'\s','',page.extract_text()) for s in ['不按同项目、同商机','不以当前查看人或校正时间代替'])]
assert len(pages)>=2
h=(r/'george-crm-react/public/space-quote-prd.html').read_text(encoding='utf8');ids=set(re.findall(r'id="([^"]+)"',h));missing=set(re.findall(r'href="#([^"]+)"',h))-ids
assert not missing and 'V2.00' in h and '历史待处理报价由当前负责人打开核对并重新提交' not in h
out=r/'tmp/pdfs/v244';out.mkdir(parents=True,exist_ok=True);doc=pdfium.PdfDocument(p)
for i in pages:doc[i].render(scale=1.3).to_pil().save(out/f'page-{i+1}.png')
print(json.dumps({'pages':len(reader.pages),'reviewPages':[i+1 for i in pages],'missingAnchors':len(missing)}))
