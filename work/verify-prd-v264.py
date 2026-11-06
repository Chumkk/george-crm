from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium,json,re
r=Path(__file__).resolve().parents[1];p=r/'george-crm-react/public/space-quote-prd.pdf';reader=PdfReader(p)
texts=[re.sub(r'\s','',page.extract_text()) for page in reader.pages]
previous=json.loads((r/'work/space-prd-v262-content.json').read_text(encoding='utf8'));d=json.loads((r/'work/space-prd-v264-content.json').read_text(encoding='utf8'))
for old,new in zip(previous['modules'],d['modules']):
 if old['title']!='企业微信通知':assert old==new,old['title']
assert d['revisions']['headers']==['变更时间','功能模块 / 入口','修订内容'];assert all('roles' not in row for row in d['revisions']['rows'])
module=next(m for m in d['modules'] if m['title']=='企业微信通知');events=module['items'][0]
assert sum('报价提交' in row[0] for row in events['table']['rows'])==1
assert not any(row[0]=='提交报价与 ERP 传输' for row in events['table']['rows'])
required=['只发送一条“报价已提交”结果通知','不得因内部事件名称不同拆成多条PM消息','客户确认、ERP实际接收回执及收款、执行结果','按钮为“查看报价待办”']
for phrase in required:assert any(phrase in t for t in texts),phrase
h=(r/'george-crm-react/public/space-quote-prd.html').read_text(encoding='utf8');assert '成功完成后须独立通知当前 PM' not in h
ids=set(re.findall(r'id="([^"]+)"',h));assert not(set(re.findall(r'href="#([^"]+)"',h))-ids)
for ext in ['html','pdf']:assert (r/f'george-crm-react/public/space-quote-prd.{ext}').read_bytes()==(r/f'outputs/空间报价PRD/敬城CRM空间报价PRD_V2.09_模块阅读版.{ext}').read_bytes()
release=json.loads((r/'george-crm-react/dist/app-release.json').read_text());assert release['documents']['space-quote-prd.html'] in h
pages=sorted({0,*[i for i,t in enumerate(texts) if any(s in t for s in required)]})
out=r/'tmp/pdfs/v264';out.mkdir(parents=True,exist_ok=True);doc=pdfium.PdfDocument(p)
for i in pages:doc[i].render(scale=1.25).to_pil().save(out/f'page-{i+1}.png')
audit=json.loads((r/'work/v264-current-notification-verification.json').read_text(encoding='utf8'))
assert len(audit['submittedQuoteMessages'])==len(audit['directResubmission'])==len(audit['resubmissionAfterSave'])==1 and not audit['sameRequestRetry']
result={'revision':'V2.09','pages':len(reader.pages),'reviewPages':[i+1 for i in pages],'revisionColumns':3,'onePmSubmissionRequirement':True,'duplicateEventTableRowRemoved':True,'customerAndErpReceiptEventsSeparate':True,'businessHistoriesPreserved':True,'otherRequirementModulesUnchanged':True,'anchorsValid':True,'archiveMatched':True,'releaseMatched':True,'prototypeMergedNotificationVerified':True,'renderedBrowserVerified':False}
(r/'work/v264-prd-checks.json').write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps(result))
