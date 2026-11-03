from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium,json,re
r=Path(__file__).resolve().parents[1];p=r/'george-crm-react/public/space-quote-prd.pdf'
reader=PdfReader(p);pages=[i for i,page in enumerate(reader.pages) if '报价首次成功保存或提交' in page.extract_text()]
assert pages
h=(r/'george-crm-react/public/space-quote-prd.html').read_text(encoding='utf8');ids=set(re.findall(r'id="([^"]+)"',h));missing=set(re.findall(r'href="#([^"]+)"',h))-ids
assert not missing and 'V1.99' in h and '不显示待报价' in h
archive=r/'outputs/空间报价PRD/敬城CRM空间报价PRD_V1.99_模块阅读版'
assert p.read_bytes()==Path(str(archive)+'.pdf').read_bytes()
assert h==Path(str(archive)+'.html').read_text(encoding='utf8')
out=r/'tmp/pdfs/v243';out.mkdir(parents=True,exist_ok=True);doc=pdfium.PdfDocument(p)
for i in pages:doc[i].render(scale=1.3).to_pil().save(out/f'page-{i+1}.png')
print(json.dumps({'pages':len(reader.pages),'reviewPages':[i+1 for i in pages],'missingAnchors':len(missing)}))
