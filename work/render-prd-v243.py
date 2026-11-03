from pathlib import Path
import json,re,html,math,shutil
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,Flowable,CondPageBreak,KeepTogether
R=Path(__file__).resolve().parents[1];D=json.loads((R/'work/space-prd-v243-content.json').read_text(encoding='utf8'))
OUT=R/'outputs/空间报价PRD';OUT.mkdir(exist_ok=True);STEM='敬城CRM空间报价PRD_V1.99_模块阅读版'
PUB=R/'george-crm-react/public'
FONT='PRD184';BOLD='PRD184Bold'
pdfmetrics.registerFont(TTFont(FONT,'C:/Windows/Fonts/msyh.ttc',subfontIndex=0))
pdfmetrics.registerFont(TTFont(BOLD,'C:/Windows/Fonts/msyhbd.ttc',subfontIndex=0))
pdfmetrics.registerFontFamily(FONT,normal=FONT,bold=BOLD,italic=FONT,boldItalic=BOLD)
W,H=A4;M=43;CW=W-2*M
BLUE='#2563a8';INK='#1f2329';GRAY='#646a73';LINE='#d9dce0'
targets={};titles={}
for mi,m in enumerate(D['modules'],1):
 m['number']=str(mi);m['id']=f'module-{mi}'
 for ii,x in enumerate(m['items'],1):
  x['number']=f'{mi}.2.{ii}';x['id']=x.get('anchor',f'item-{mi}-{ii}')
  titles[x['title']]=x['id']
  for key in x['refs']+x['codes']:targets.setdefault(key,(x['id'],x['title']))
for m in D['modules']:titles.setdefault(m['title'],m['id'])
titles['客户清单字段']=titles['客户清单字段与图片']
def esc(s):return html.escape(str(s),quote=True)
def rich(s,pdf=False):
 s=esc(s)
 def link(label,key):
  return f'<link href="#{key}" color="{BLUE}"><u>{label}</u></link>' if pdf else f'<a class="xref" href="#{key}">{label}</a>'
 for title,key in sorted(titles.items(),key=lambda kv:-len(kv[0])):
  s=s.replace('「'+title+'」',link('「'+title+'」',key))
 pattern=r'(?<![A-Za-z0-9])('+'|'.join(sorted(targets,key=len,reverse=True))+r')(?![A-Za-z0-9])'
 s=re.sub(pattern,lambda m:link(esc(targets[m[0]][1]),targets[m[0]][0]),s)
 return s.replace('\n','<br/>')
nodes=[
 (10,12,175,62,'运营：建立客户',['保存客户资料'],'item-1-1','plain'),
 (225,12,225,62,'PM：创建项目',['保存项目，生成分配商机任务'],'item-1-1','plain'),
 (500,12,480,62,'分配商机任务 / 项目详情：分配商机',['部门报价由 PM 确认品类名称'],'item-3-1','blue'),
 (10,132,285,74,'区域内普通分配：SM 接单',['按品类承接，生成商机与报价任务'],'item-3-1','plain'),
 (340,132,300,74,'跨区域 / 转介绍：总经办审批',['通过后直接生成商机与报价任务'],'item-3-2','plain'),
 (685,132,295,74,'设计服务：主管确认商机',['生成商机与报价任务'],'item-3-3','blue'),
 (10,280,590,80,'报价任务：SM / 报价助理办理',['按ERP状态编辑；可复用最近提交版本','仅保存不发布、不传 ERP、不完成待办'],'item-5-3','blue'),
 (685,432,295,80,'设计中任务：GDS 回传图纸',['回传生成审核，GDS 独立完成任务'],'item-9-1','plain'),
 (10,432,590,80,'提交报价：发布并传 ERP',['发布两端报价并完成原任务，通知 PM','产品：客户密码链接确认后才可备货；设计另行履约'],'item-5-4','blue'),
 (685,590,295,80,'设计定稿：PM 核对',['逐张确认后手动同步，完成审核','只重提被驳回图纸，保留其他结果'],'item-9-2','plain')]
edges=[[(185,43),(225,43)],[(450,43),(500,43)],[(740,74),(740,103),(152,103),(152,132)],[(740,103),(490,103),(490,132)],[(740,103),(832,103),(832,132)],[(152,206),(152,280)],[(490,206),(490,242),(350,242),(350,280)],[(832,206),(832,240),(550,240),(550,280)],[(305,360),(305,432)],[(600,472),(685,472)],[(832,512),(832,590)]]
def svg():
 a=['<svg role="img" aria-label="项目分配、报价与设计并行的统一业务流程" viewBox="0 0 990 750" xmlns="http://www.w3.org/2000/svg"><defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#7f8fa3"/></marker></defs>']
 for pts in edges:a.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in pts)+'" fill="none" stroke="#7f8fa3" stroke-width="1.6" marker-end="url(#arrow)"/>')
 for x,y,w,h,title,lines,target,tone in nodes:
  a.append(f'<a href="#{target}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="'+('#edf3ff' if tone=='blue' else '#fafbfc')+'" stroke="#bfcddd"/>')
  a.append(f'<text x="{x+w/2}" y="{y+25}" text-anchor="middle" font-size="18" font-weight="600" fill="{INK}">{esc(title)}</text>')
  for i,line in enumerate(lines):a.append(f'<text x="{x+w/2}" y="{y+46+i*19}" text-anchor="middle" font-size="15" fill="{GRAY}">{esc(line)}</text>')
  a.append('</a>')
 a.append('</svg>');return ''.join(a)
CSS='''
:root{--blue:#2563a8;--ink:#1f2329;--muted:#646a73;--line:#d9dce0;--nav:250px;color-scheme:light}*{box-sizing:border-box}html{scroll-behavior:auto;scroll-padding-top:94px}body{margin:0;color:var(--ink);background:#fff;font:15px/1.85 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif}a{color:var(--blue);text-decoration:none}a:hover{text-decoration:underline}button,input{font:inherit}button{cursor:pointer}.toolbar{position:fixed;z-index:20;inset:0 0 auto 0;height:62px;background:#fff;border-bottom:1px solid var(--line);display:flex;gap:14px;align-items:center;padding:0 24px}.toolbar strong{font-size:15px}.toolbar small{color:var(--muted)}.toolbar .actions{margin-left:auto;display:flex;gap:12px;align-items:center}.toolbar a,.toolbar button{font-size:13px}.toolbar button,.toolbar input{border:1px solid var(--line);border-radius:6px;background:white;padding:5px 10px}.toolbar input{width:180px}.sidebar{position:fixed;inset:62px auto 0 0;width:var(--nav);overflow:auto;padding:24px 12px 40px 20px;border-right:1px solid #eee;font-size:13px;line-height:1.55}.sidebar>p{font-size:12px;color:var(--muted);margin:0 8px 14px}.sidebar a{display:block;padding:6px 8px;color:#4b5058;border-radius:4px}.sidebar a.active{color:#2165d1;background:#edf3ff}.sidebar details{margin:2px 0}.sidebar summary{cursor:pointer;font-weight:600;padding:8px}.sidebar summary a{display:inline;padding:0;color:inherit}.sidebar .sub{padding-left:13px}.sidebar .item{padding-left:24px;font-size:12px}main{margin:62px 0 0 var(--nav);padding:46px 5vw 90px;max-width:1390px}h1{font-size:31px;line-height:1.4;margin:0 0 10px}h2{font-size:25px;line-height:1.5;margin:0}h3{font-size:20px;line-height:1.5;margin:30px 0 16px;padding:5px 0}h3.list-title{background:#eef1fe;padding:5px 10px;border-radius:4px}h4{font-size:17px;line-height:1.5;margin:28px 0 12px}p{margin:10px 0}.meta{display:flex;gap:18px;font-size:13px;color:var(--muted);margin-bottom:20px}.scope{max-width:950px;color:#4b5058}.module{margin-top:42px;border-top:1px solid #eceef1;padding-top:30px}.module>summary{display:flex;align-items:center;gap:12px;list-style:none;cursor:pointer}.module>summary::-webkit-details-marker{display:none}.module>summary:after{content:'⌄';font-size:20px;color:#9aa0a6;margin-left:auto}.module:not([open])>summary:after{content:'›'}.module>summary small{font-size:12px;color:var(--muted)}.table-wrap{overflow-x:auto;margin:14px 0 22px}table{border-collapse:collapse;width:100%;font-size:14px;line-height:1.7}th,td{border:1px solid var(--line);text-align:left;vertical-align:top;padding:9px 12px}th{background:#f4f5f6;font-weight:600}.requirement-list th:first-child,.requirement-list td:first-child{width:25%}.fields th:first-child,.fields td:first-child{width:25%}.fields td{font-size:13px}.entry{font-size:13px;line-height:1.8;color:#646a73;margin:0 0 12px}.entry b{font-weight:500;color:#454b54}ul{padding-left:22px;margin:8px 0 18px}li{padding-left:2px;margin:7px 0}li::marker{color:#3370ff;font-size:11px}.xref{border-bottom:1px solid #c6d8ed}.flow{border:1px solid #e4e8ed;border-radius:6px;padding:18px;margin:24px 0}.flow svg{display:block;width:100%;height:auto}.flow figcaption{font-size:12px;color:var(--muted);margin-top:8px}.flow h2{font-size:20px}.return-control{position:fixed;bottom:22px;left:24px;z-index:25;background:#fff;border:1px solid #bfcddd;border-radius:6px;padding:8px 12px;font-size:13px;color:var(--blue)}.return-control[hidden]{display:none}.search-results{border:1px solid #c9d7f0;background:#f6f9ff;padding:15px;margin-bottom:25px;border-radius:6px}.search-results{position:fixed;z-index:30;top:62px;right:24px;width:min(460px,calc(100vw - 32px));max-height:65vh;overflow:auto;box-shadow:0 8px 28px #26365320}.search-results a{display:block;padding:4px}.jump-highlight{outline:2px solid #9fbaf6;outline-offset:5px;animation:fade 2s forwards}@keyframes fade{to{outline-color:transparent}}.alias{display:block;height:0;overflow:hidden}footer{margin-top:45px;padding-top:18px;border-top:1px solid #eee;font-size:12px;color:var(--muted)}:focus-visible{outline:2px solid #527fe0;outline-offset:3px}@media(min-width:1600px){main{padding-left:7vw;padding-right:7vw}}@media(max-width:850px){:root{--nav:200px}.toolbar{padding:0 12px}.toolbar small,.toolbar input{display:none}main{padding:30px 24px 70px}.sidebar{padding-left:8px}.meta{flex-wrap:wrap;gap:8px 15px}}@media(max-width:600px){.sidebar{display:none}main{margin-left:0;padding:28px 18px 70px}.toolbar strong{font-size:13px}.toolbar .actions{gap:8px}.toolbar a,.toolbar button{font-size:12px}.module>summary small{display:none}h1{font-size:27px}h2{font-size:22px}h3{font-size:18px}.return-control{left:16px;bottom:12px}.table-wrap{margin-left:0}table{min-width:490px}.flow{padding:7px}.flow svg{min-width:650px}.flow{overflow-x:auto}}@media print{.toolbar,.sidebar,.return-control,.search-results{display:none!important}main{margin:0;padding:0;max-width:none}body{font-size:10pt;line-height:1.65}.module{margin-top:20pt;padding-top:12pt}.module>summary:after{display:none}.module-body{display:block!important}h1{font-size:24pt}h2{font-size:18pt}h3{font-size:14pt}h4{font-size:12pt;break-after:avoid}.entry{font-size:9pt}li{margin:4pt 0}.table-wrap{overflow:visible}table{font-size:9pt;min-width:0}tr{break-inside:avoid}thead{display:table-header-group}td,th{padding:5pt}a{color:inherit;text-decoration:none}.flow{break-inside:avoid}.flow svg{min-width:0}footer{font-size:8pt}@page{size:A4;margin:18mm}}
'''
aliases=set()
def anchor(keys):
 result=''
 for key in keys:
  if key not in aliases:result+=f'<span class="alias" id="{key}"></span>';aliases.add(key)
 return result
def htmltable(table,kind='fields'):
 return '<div class="table-wrap"><table class="'+kind+'"><thead><tr>'+''.join('<th>'+rich(h)+'</th>' for h in table['headers'])+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+rich(c)+'</td>' for c in row)+'</tr>' for row in table['rows'])+'</tbody></table></div>'
revision=D['revisions']
revisionGroups={}
for r in revision['rows']:revisionGroups.setdefault(r['time'][:10],[]).append(r)
revisionHtml='<section class="revisions" aria-labelledby="revision-history"><h2 id="revision-history">修订说明</h2><p class="revision-note">'+esc(revision['note'])+'</p><div class="table-wrap"><table class="revision-table"><colgroup><col style="width:15%"><col style="width:19%"><col style="width:51%"><col style="width:15%"></colgroup><thead><tr>'+''.join('<th>'+esc(h)+'</th>' for h in revision['headers'])+'</tr></thead>'
for day,rows in revisionGroups.items():
 revisionHtml+='<tbody data-revision-date="'+day+'">'
 for i,r in enumerate(rows):
  revisionHtml+='<tr>'+(('<td class="revision-date" rowspan="'+str(len(rows))+'">'+day+'</td>') if i==0 else '')+'<td class="revision-module">'+rich(r['module'])+'</td><td class="revision-copy">'+rich('\n'.join(str(j)+'. '+t for j,t in enumerate(r['changes'],1)))+'</td><td class="revision-roles">'+rich(r['roles'])+'</td></tr>'
 revisionHtml+='</tbody>'
revisionHtml+='</table></div></section>'
CSS+=''' .revisions{margin:34px 0 40px}.revisions h2{font-size:24px}.revision-note{font-size:12px;color:var(--muted);margin:7px 0 14px}.revision-table{table-layout:fixed;font-size:13px;line-height:1.75}.revision-table td{padding:13px 12px;overflow-wrap:anywhere}.revision-date{font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:#45576b;background:#f8fafc;white-space:nowrap}.revision-module,.revision-roles{font-size:12px}.revision-roles{color:#5b6470}.revision-table tbody+tbody tr:first-child td{border-top:2px solid #becbd9}@media print{.revision-table{font-size:9pt}.revision-table td{padding:7pt}.revision-date,.revision-module,.revision-roles{font-size:8pt}}'''

toc=['<a href="#overview">空间报价 PRD</a><a href="#business-flow">业务流程</a>'];body=[]
for m in D['modules']:
 n=m['number'];mid=m['id']
 toc.append(f'<details open><summary><a href="#{mid}">{n}. {esc(m["title"])}</a></summary><a class="sub" href="#{mid}-list">{n}.1 需求列表</a><a class="sub" href="#{mid}-details">{n}.2 需求明细</a>')
 for x in m['items']:toc.append(f'<a class="item" href="#{x["id"]}">{x["number"]} {esc(x["title"])}</a>')
 toc.append('</details>')
 body.append(f'<details class="module" id="{mid}" open><summary><h2>{n}. {esc(m["title"])}</h2><small>{len(m["items"])} 项需求</small></summary><div class="module-body">')
 body.append('<p class="entry"><b>入口位置：</b>'+esc(m['entry'])+'</p>')
 body.append(f'<h3 class="list-title" id="{mid}-list">{n}.1 需求列表</h3>')
 body.append('<div class="table-wrap"><table class="requirement-list"><thead><tr><th>需求项</th><th>需求说明</th></tr></thead><tbody>')
 for x in m['items']:body.append(f'<tr><td><a href="#{x["id"]}">{esc(x["title"])}</a></td><td>{esc(x["summary"])}</td></tr>')
 body.append(f'</tbody></table></div><h3 id="{mid}-details">{n}.2 需求明细</h3>')
 for x in m['items']:
  body.append(anchor(x['refs']+x['codes']))
  body.append(f'<article class="requirement" id="{x["id"]}" data-search="{esc(x["title"]+x["entry"]+" ".join(x["bullets"])+json.dumps(x.get("table",{}),ensure_ascii=False))}"><h4>{x["number"]} {esc(x["title"])}</h4><p class="entry"><b>入口：</b>{esc(x["entry"])}<br><b>操作人：</b>{esc(x["actor"])}</p><ul>'+''.join('<li>'+rich(s)+'</li>' for s in x['bullets'])+'</ul>')
  if 'table'in x:body.append(htmltable(x['table']))
  body.append('</article>')
 body.append('</div></details>')
legacy={'section1':'overview','section2':'business-flow','section3':'module-2','section4':'module-7','section5':'module-8','section6':'module-10','section7':'module-5','section8':'overview'}
JS='''
(()=>{const $=s=>document.querySelector(s),stack=[],back=$('#return'),toc=$('.sidebar'),links=[...toc.querySelectorAll('a')],search=$('#search'),results=$('#results');const legacy=LEGACY;
function find(id){return document.getElementById(legacy[id]||id)}
function reveal(target){let n=target;while(n){if(n.tagName==='DETAILS')n.open=true;n=n.parentElement}}
function go(id,remember=true){const t=find(id);if(!t)return;if(remember)stack.push({y:window.scrollY,hash:location.hash});reveal(t);history.replaceState(null,'','#'+id);const y=t.getBoundingClientRect().top+scrollY-88;window.scrollTo({top:Math.max(0,y),behavior:'auto'});const h=t.matches('.alias')?t.nextElementSibling:t;h?.classList.add('jump-highlight');setTimeout(()=>h?.classList.remove('jump-highlight'),2000);back.hidden=!stack.length;update()}
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const id=decodeURIComponent(a.hash.slice(1));if(!find(id))return;e.preventDefault();go(id);if(a.closest('#results'))results.hidden=true});
back.onclick=()=>{const p=stack.pop();if(!p)return;history.replaceState(null,'',p.hash||location.pathname);window.scrollTo({top:p.y,behavior:'auto'});back.hidden=!stack.length;update()};
function update(){const hs=[...document.querySelectorAll('main h2,main h3,main article')].filter(h=>h.getBoundingClientRect().height>0&&(!h.closest('.module:not([open])')||h.parentElement.tagName==='SUMMARY'));let current='overview';for(const h of hs){if(h.getBoundingClientRect().top<=126)current=h.tagName==='H2'?(h.closest('.module')?.id||h.closest('figure')?.id||h.id||current):h.id||current;else break}for(const a of links)a.classList.toggle('active',a.hash==='#'+current);}
let queued=false;window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;update()})}},{passive:true});
search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();results.replaceChildren();results.hidden=!q;if(!q)return;const rows=[...document.querySelectorAll('.requirement')].filter(x=>x.dataset.search.toLowerCase().includes(q));const label=document.createElement('strong');label.textContent=rows.length?'找到 '+rows.length+' 项需求':'未找到匹配需求';results.append(label);for(const x of rows){const a=document.createElement('a');a.href='#'+x.id;a.textContent=x.querySelector('h4').textContent;results.append(a)}});
search.addEventListener('keydown',e=>{if(e.key==='Escape')results.hidden=true});
$('#collapse').onclick=()=>{const modules=[...document.querySelectorAll('main .module')],close=modules.some(d=>d.open);modules.forEach(d=>d.open=!close);$('#collapse').textContent=close?'展开模块':'收起模块'};
$('#print').onclick=()=>{document.querySelectorAll('main .module').forEach(d=>d.open=true);window.print()};window.addEventListener('beforeprint',()=>document.querySelectorAll('main .module').forEach(d=>d.open=true));
if(location.hash)requestAnimationFrame(()=>go(decodeURIComponent(location.hash.slice(1)),false));update();})();
'''.replace('LEGACY',json.dumps(legacy))
intro='本期围绕项目、商机及待办串联产品报价、设计协作、费用订单和客户确认。各模块先列需求项，再说明入口、操作人、字段校验及完成后的流转。'
htmltext='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>空间报价 PRD · V1.99 模块阅读版</title><style>'+CSS+'</style></head><body><header class="toolbar"><strong>空间报价 PRD</strong><small>V1.99 · 更新时间：2026-11-03 11:24（北京时间）</small><div class="actions"><input id="search" type="search" aria-label="搜索需求" placeholder="搜索字段、入口、规则"><button id="collapse">收起模块</button><a href="space-quote-prd.pdf">下载 PDF ↗</a><button id="print">打印</button></div></header><nav class="sidebar" aria-label="文档目录"><p>内容目录</p><a href="#revision-history">修订说明</a>'+''.join(toc)+'</nav><main><div id="results" class="search-results" hidden></div><header id="overview"><h1>空间报价 PRD</h1><div class="meta"><span>V1.99</span><span>更新时间：2026-11-03 11:24（北京时间）</span><span>功能需求说明</span></div><p class="scope">'+intro+'</p></header>'+revisionHtml+'<figure class="flow" id="business-flow"><h2>业务流程</h2>'+svg()+'<figcaption>设计单提交成功后生成 GDS 设计中任务，采购、设计提交报价→待下定→对应订单 ERP 实收≥20%待下单。采购实际备货进入交付中。设计由 GDS 确认收到款进入交付中，设计中任务完成进入已完成；图纸审核与同步独立办理。费用订单独立办理，计入金额，阶段仍按产品或设计主业务推进。点击节点可定位需求。</figcaption></figure>'+''.join(body)+'<footer>敬城 CRM · 空间报价需求 · V1.99 · 更新时间：2026-11-03 11:24（北京时间）</footer></main><button id="return" class="return-control" hidden>← 返回阅读位置</button><script>'+JS+'</script></body></html>'
(OUT/(STEM+'.html')).write_text(htmltext,encoding='utf8')

# PDF and HTML consume the same module/item records and the same diagram.
styles={
 'title':ParagraphStyle('title',fontName=BOLD,fontSize=24,leading=34,spaceAfter=8,wordWrap='CJK'),
 'meta':ParagraphStyle('meta',fontName=FONT,fontSize=9,leading=15,textColor=colors.HexColor(GRAY),spaceAfter=10,wordWrap='CJK'),
 'h2':ParagraphStyle('h2',fontName=BOLD,fontSize=18,leading=27,spaceBefore=20,spaceAfter=10,keepWithNext=True,wordWrap='CJK'),
 'h3':ParagraphStyle('h3',fontName=BOLD,fontSize=13,leading=20,spaceBefore=13,spaceAfter=8,keepWithNext=True,wordWrap='CJK'),
 'h4':ParagraphStyle('h4',fontName=BOLD,fontSize=11,leading=18,spaceBefore=11,spaceAfter=6,keepWithNext=True,wordWrap='CJK'),
 'p':ParagraphStyle('p',fontName=FONT,fontSize=9.6,leading=16,spaceAfter=7,wordWrap='CJK',allowWidows=0,allowOrphans=0),
 'bullet':ParagraphStyle('bullet',fontName=FONT,fontSize=9.6,leading=16,leftIndent=9,firstLineIndent=-9,spaceAfter=6,wordWrap='CJK',allowWidows=0,allowOrphans=0),
 'entry':ParagraphStyle('entry',fontName=FONT,fontSize=8.6,leading=14,textColor=colors.HexColor(GRAY),spaceAfter=7,wordWrap='CJK',keepWithNext=True),
 'cell':ParagraphStyle('cell',fontName=FONT,fontSize=8.4,leading=13.4,wordWrap='CJK'),
 'thead':ParagraphStyle('thead',fontName=BOLD,fontSize=8.6,leading=13.5,wordWrap='CJK'),
 'toc':ParagraphStyle('toc',fontName=FONT,fontSize=9,leading=16,wordWrap='CJK',spaceAfter=3),
}
def para(text,kind='p'):return Paragraph(rich(text,True),styles[kind])
class Diagram(Flowable):
 def __init__(self):super().__init__();self.width=CW;self.height=750*CW/990
 def draw(self):
  c=self.canv;c.saveState();c.scale(CW/990,CW/990);c.setStrokeColor(colors.HexColor('#7f8fa3'));c.setLineWidth(1.6)
  for pts in edges:
   path=c.beginPath();path.moveTo(pts[0][0],750-pts[0][1])
   for x,y in pts[1:]:path.lineTo(x,750-y)
   c.drawPath(path);x,y=pts[-1];px,py=pts[-2];ang=math.atan2(y-py,x-px);p=c.beginPath();p.moveTo(x,750-y)
   for xx,yy in [(x-8*math.cos(ang)+4*math.sin(ang),y-8*math.sin(ang)-4*math.cos(ang)),(x-8*math.cos(ang)-4*math.sin(ang),y-8*math.sin(ang)+4*math.cos(ang))]:p.lineTo(xx,750-yy)
   p.close();c.setFillColor(colors.HexColor('#7f8fa3'));c.drawPath(p,fill=1,stroke=0)
  for x,y,w,h,title,lines,target,tone in nodes:
   c.setFillColor(colors.HexColor('#edf3ff' if tone=='blue' else '#fafbfc'));c.setStrokeColor(colors.HexColor('#bfcddd'));c.roundRect(x,750-y-h,w,h,6,fill=1,stroke=1)
   c.setFillColor(colors.HexColor(INK));c.setFont(BOLD,19);c.drawCentredString(x+w/2,750-y-25,title)
   c.setFont(FONT,16);c.setFillColor(colors.HexColor(GRAY))
   for j,line in enumerate(lines):c.drawCentredString(x+w/2,750-y-46-j*19,line)
   c.linkRect('',target,(x,750-y-h,x+w,750-y),relative=1,thickness=0)
  c.restoreState()
class Doc(SimpleDocTemplate):
 def afterFlowable(self,f):
  key=getattr(f,'key',None)
  if key:
   self.canv.bookmarkHorizontalAbsolute(key,self.frame._y+f.height)
   for alias in getattr(f,'aliases',[]):self.canv.bookmarkHorizontalAbsolute(alias,self.frame._y+f.height)
   self.canv.addOutlineEntry(f.getPlainText(),key,level=f.level,closed=True)
def heading(text,key,style,level,aliases=None):
 p=para(text,style);p.key=key;p.level=level;p.aliases=aliases or [];return p
def table(table,summary=False):
 h=table['headers'];widths=([.25,.75] if len(h)==2 else [.25,.19,.56] if len(h)==3 and h[0]=='字段' else [.22,.40,.38] if len(h)==3 and h[1]=='选项 / 填写' else [.29,.24,.47])
 if len(h)==4:widths=[.14,.19,.52,.15]
 rows=[[para(t,'thead') for t in h]]
 for row in table['rows']:rows.append([para(t,'cell') for t in row])
 t=Table(rows,colWidths=[CW*w for w in widths],repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#f1f2f4')),('GRID',(0,0),(-1,-1),.4,colors.HexColor(LINE)),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
 return t
def revisionPdfTables():
 result=[]
 for day,rows in revisionGroups.items():
  records=[[day if i==0 else '',r['module'],'\n'.join(str(j)+'. '+v for j,v in enumerate(r['changes'],1)),r['roles']] for i,r in enumerate(rows)]
  t=table({'headers':revision['headers'],'rows':records})
  t.setStyle(TableStyle([('SPAN',(0,1),(0,len(rows))),('BACKGROUND',(0,1),(0,len(rows)),colors.HexColor('#f8fafc'))]))
  height=t.wrap(CW,10000)[1]
  assert height<H-86,(day,height)
  result.append(KeepTogether([t,Spacer(1,10)]))
 return result

def decorate(c,doc):
 c.saveState();c.setFont(FONT,8);c.setFillColor(colors.HexColor(GRAY));c.drawString(M,H-25,'敬城 CRM  /  空间报价 PRD');c.drawRightString(W-M,25,f'V1.99  |  更新时间：2026-11-03 11:24（北京时间）  |  {doc.page}');c.restoreState()
story=[heading('空间报价 PRD','overview','title',0),para('V1.99  ·  更新时间：2026-11-03 11:24（北京时间）  ·  功能需求说明','meta'),para(intro),heading('修订说明','revision-history','h2',0),para(revision['note'],'meta'),*revisionPdfTables(),CondPageBreak(240),para('内容目录','h3')]
for m in D['modules']:story.append(Paragraph(f'<link href="#{m["id"]}" color="{BLUE}">{m["number"]}. {esc(m["title"])}</link>',styles['toc']))
story.extend([heading('业务流程','business-flow','h3',0),Diagram(),para('采购、设计提交报价后待下定，对应订单 ERP 实收≥20%进入待下单。设计同时发起 GDS 任务；费用只计金额，不推进主业务阶段。','meta')])
pdfaliases=set()
for m in D['modules']:
 n=m['number'];story.append(heading(f'{n}. {m["title"]}',m['id'],'h2',0));story.append(para('入口位置：'+m['entry'],'entry'))
 story.append(heading(f'{n}.1 需求列表',m['id']+'-list','h3',1))
 summary={'headers':['需求项','需求说明'],'rows':[[f'<link href="#{x["id"]}">{x["title"]}</link>',x['summary']] for x in m['items']]}
 # Summary links are kept as actual PDF links rather than escaped markup.
 rows=[[para(t,'thead') for t in summary['headers']]]+[[Paragraph(f'<link href="#{x["id"]}" color="{BLUE}">{esc(x["title"])}</link>',styles['cell']),para(x['summary'],'cell')]for x in m['items']]
 t=table({'headers':summary['headers'],'rows':[]});t=Table(rows,colWidths=[CW*.25,CW*.75],repeatRows=1)
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#f1f2f4')),('GRID',(0,0),(-1,-1),.4,colors.HexColor(LINE)),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]));story+=[t,Spacer(1,6),heading(f'{n}.2 需求明细',m['id']+'-details','h3',1)]
 for x in m['items']:
  aa=[a for a in x['refs']+x['codes'] if a not in pdfaliases];pdfaliases.update(aa)
  story.extend([CondPageBreak(94),heading(x['number']+' '+x['title'],x['id'],'h4',2,aa),para('入口：'+x['entry']+'\n操作人：'+x['actor'],'entry')])
  for text in x['bullets']:story.append(Paragraph('<font color="#3370ff">•</font> '+rich(text,True),styles['bullet']))
  if 'table'in x:story.extend([table(x['table']),Spacer(1,8)])
pdf=OUT/(STEM+'.pdf')
Doc(str(pdf),pagesize=A4,leftMargin=M,rightMargin=M,topMargin=44,bottomMargin=42,title='空间报价 PRD V1.99 模块阅读版',author='敬城 CRM').build(story,onFirstPage=decorate,onLaterPages=decorate)
shutil.copyfile(OUT/(STEM+'.html'),PUB/'space-quote-prd.html');shutil.copyfile(pdf,PUB/'space-quote-prd.pdf')
for ext in ['html','pdf']:shutil.copyfile(PUB/('space-quote-prd.'+ext),OUT/('space-quote-prd.'+ext))
from pypdf import PdfReader
print(json.dumps({'html':str(OUT/(STEM+'.html')),'pdf':str(pdf),'pages':len(PdfReader(pdf).pages),'htmlBytes':len(htmltext.encode()),'requirements':len(D['sourceRequirements']),'entrances':len(D['entrances'])},ensure_ascii=False))

