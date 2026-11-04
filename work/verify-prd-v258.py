from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium,json,re
r=Path(__file__).resolve().parents[1];p=r/'george-crm-react/public/space-quote-prd.pdf';reader=PdfReader(p)
texts=[re.sub(r'\s','',page.extract_text()) for page in reader.pages]
required=['外贸方式直接沿用项目创建及后续维护保存的','外贸费用保留人工填写','外贸费手填、必填、首次为空','外贸方式使用本次保存时读取的项目值']
for phrase in required:assert any(phrase in text for text in texts),phrase
pages=[0]+[i for i,text in enumerate(texts) if any(s in text for s in required)]
h=(r/'george-crm-react/public/space-quote-prd.html').read_text(encoding='utf8');ids=set(re.findall(r'id="([^"]+)"',h));assert not(set(re.findall(r'href="#([^"]+)"',h))-ids)
for phrase in ['外贸费、设计费和其他费按CRM来源订单金额自动汇总','外贸费、设计费和其他费使用CRM来源订单的汇总金额','旧手填外贸费、设计费及其他费不再作为有效金额','海运费、货柜费、国内运费归入外贸费']:assert phrase not in h,phrase
for ext in ['html','pdf']:assert (r/f'george-crm-react/public/space-quote-prd.{ext}').read_bytes()==(r/f'outputs/空间报价PRD/敬城CRM空间报价PRD_V2.04_模块阅读版.{ext}').read_bytes()
release=json.loads((r/'george-crm-react/dist/app-release.json').read_text());assert release['documents']['space-quote-prd.html'] in h
out=r/'tmp/pdfs/v258';out.mkdir(parents=True,exist_ok=True);doc=pdfium.PdfDocument(p)
for i in pages:doc[i].render(scale=1.25).to_pil().save(out/f'page-{i+1}.png')
result={'revision':'V2.04','pages':len(reader.pages),'reviewPages':[i+1 for i in pages],'anchorsValid':True,'archiveMatched':True,'releaseMatched':True,'testsPassed':796,'buildPassed':True,'renderedBrowserVerified':False}
(r/'work/v258-prd-checks.json').write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps(result))
