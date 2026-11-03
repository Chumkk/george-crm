from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium,json,re
from workflow_layout import intersects
r=Path(__file__).resolve().parents[1];p=r/'george-crm-react/public/space-quote-prd.pdf';reader=PdfReader(p)
pages=[i for i,page in enumerate(reader.pages) if any(s in re.sub(r'\s','',page.extract_text()) for s in ['成功暂存后原报价待办直接恢复待处理','已提交报价再暂存，原待办恢复待处理'])]
assert len(pages)>=2
h=(r/'george-crm-react/public/space-quote-prd.html').read_text(encoding='utf8');ids=set(re.findall(r'id="([^"]+)"',h));missing=set(re.findall(r'href="#([^"]+)"',h))-ids
assert not missing and 'V2.02' in h and '保存金额' not in h and '已完成报价待办不因普通保存重新激活' not in h
for ext in ['html','pdf']:assert (r/f'george-crm-react/public/space-quote-prd.{ext}').read_bytes()==(r/f'outputs/空间报价PRD/敬城CRM空间报价PRD_V2.02_模块阅读版.{ext}').read_bytes()
out=r/'tmp/pdfs/v246';out.mkdir(parents=True,exist_ok=True);doc=pdfium.PdfDocument(p)
for i in pages:doc[i].render(scale=1.3).to_pil().save(out/f'page-{i+1}.png')
d=json.loads((r/'work/new-workflow-v246-layout.json').read_text(encoding='utf8'))['unified'];nodes=d['nodes'];lookup={n['id']:n for n in nodes}
for i,a in enumerate(nodes):
 for b in nodes[i+1:]:assert not(a['x']<b['x']+b['w'] and a['x']+a['w']>b['x'] and a['y']<b['y']+b['h'] and a['y']+a['h']>b['y'])
for e in d['edges']:
 assert e['start'] in lookup and e['end'] in lookup
 for a,b in zip(e['points'],e['points'][1:]):assert not any(intersects(a,b,(n['x'],n['y'],n['w'],n['h'])) for n in nodes)
for key in ['productsave','designsave']:assert '已提交后再暂存：激活原待办' in lookup[key]['lines']
print(json.dumps({'pages':len(reader.pages),'reviewPages':[i+1 for i in pages],'missingAnchors':len(missing),'workflowNodes':len(nodes),'workflowEdges':len(d['edges']),'noDiagramOcclusion':True}))
