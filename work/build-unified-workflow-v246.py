"""One project, concurrent product and design opportunities, shared quotation path."""
from pathlib import Path
from html import escape
import json, re
from PIL import ImageFont
from workflow_layout import route, intersects
R=Path(__file__).resolve().parents[1]
ROLES=['运营人员','PM / 指定协调员','设计师 / GDS协调员','方案经理 SM / 报价助理','客户','总经办','财务']
WIDTHS=[212,424,636,424,424,212,212]
STARTS=[112]
for w in WIDTHS:STARTS.append(STARTS[-1]+w)
WIDTH=STARTS[-1];HEIGHT=2800
nodes=[];edges=[]
def n(key,num,col,y,title,lines,tone='task',slot=0,ports=()):
 nodes.append(dict(id=key,number=num,col=col,x=STARTS[col]+14+212*slot,y=y,w=184,h=132,title=title,lines=lines,tone=tone,ports=ports))
def e(a,b,label='',kind='business'):
 edges.append(dict(start=a,end=b,label=label,kind=kind,dashed=kind!='business'))
n('customer','01',0,126,'创建客户',['运营保存客户资料','PM 创建关联项目'],'action')
n('project','02',1,126,'创建项目',['项目信息含空间、图纸及附件','空间选填，PM 完善项目资料','保存生成 PM 分配商机任务'],'action')
n('allocation','03',1,314,'分配商机',['产品空间只读，原抽屉维护','设计选主管、期望时间和协调员','产品、设计商机可并行分配'])
n('spaces','03P',1,314,'区域内 / 跨区域分配',['只读项目空间，原抽屉维护','PM确认品类名称并查重','转介绍附原因及同意截图'],'action',slot=1)
n('acceptproduct','04P',3,502,'采购商机接单：承接',['无转介绍时 SM 确认或拒绝','确认生成产品商机和报价任务'])
n('approval','04C',5,502,'跨区域 / 转介绍审批',['核对接收 SM、原因和附件','通过生成产品商机和报价任务','驳回原申请，通知 PM'],'approval')
n('acceptdesign','04D',2,502,'设计商机接单：承接',['接收主管确认或拒绝本次邀请','核对期望时间、协调员安排','承接生成商机及报价任务'])
n('retry','R',1,502,'编辑原待办并重提',['拒绝 / 驳回通知原发起人','编辑同一申请，不另建待办','重提恢复待处理并通知接收人'],'action')
n('productquote','05P',3,690,'产品报价：创建报价',['SM及助理依ERP状态办理','复用最近提交到工作稿','统一总览品类名称'])
n('productsave','06P',3,690,'暂存产品报价',['暂存不发布、不传ERP','已提交后再暂存：激活原待办'],'action',slot=1)
n('productsubmit','07P',3,878,'提交产品报价并传 ERP',['校验空间，发布两端及历史','提交人实名，ERP请求及原待办完成','进入待下定，通知当前 PM'],'action',ports=('Q1','N1'))
# Retired internal confirmation node: n('productconfirm','08P',3,878,'产品报价：确认报价',['手动确认已提交报价','保存 ERP 请求并完成精确待办','进入待下定，通知当前 PM'],slot=1,ports=('N1',))
n('designquote','05D',2,690,'设计报价：创建设计单',['设计费用必填，附件备注选填','不做产品空间校验','提交成功后生成设计中任务'],slot=1)
n('designsave','06D',2,690,'暂存设计报价',['暂存不发布、不传ERP','已提交后再暂存：激活原待办'],'action',slot=2)
n('designsubmit','07D',2,878,'提交设计报价并传 ERP',['发布两端、ERP 请求并完成报价任务','待下定，同时生成 GDS 设计中','设计与产品业务并行'],'action',slot=1,ports=('Q1','N1'))
# Retired internal confirmation node: n('designconfirm','08D',2,878,'设计报价：确认报价',['手动确认已提交版本','保存 ERP 请求并完成精确待办','待下定，生成 GDS 设计中'],slot=2,ports=('N1',))
n('overview','Q1',1,878,'项目报价总览',['汇集产品、设计及加单报价','与客户共用同一提交版本','内部使用人民币原币展示'],'action',ports=('Q1',))
n('designresult','D1',2,1110,'设计中：GDS 交付',['携带已提交的设计单','带期望时间、协调员安排','可分批回图，GDS 决定任务完成'])
n('coordinator','D2G',2,1298,'GDS 协调员确认',['设计师安排协调员时','协调员在 GDS 确认图纸','回传结果，PM 在 CRM 同步'],'action',slot=1)
n('review','D2',1,1298,'设计定稿：图纸审核',['PM / 指定协调员逐图审核','仅被驳回图纸重提','全确认后手动同步，完成审核'])
n('notifypm','N1',1,1510,'PM 的业务通知',['承接、审批及驳回 / 重提','设计确认到达、报价提交','客户确认、报价完成、催办'],'notice',ports=('N1','Q2'))
n('notifydesign','N1',2,1510,'设计师的业务通知',['商机承接、设计及报价到达','审核驳回 / 重提、催办','打开精确关联的本次待办'],'notice',ports=('N1',))
n('notifysm','N1',3,1510,'SM 的业务通知',['商机邀请及报价任务到达','报价退回 / 更新、客户确认','移交、重提与催办'],'notice',ports=('N1','Q2'))
n('notifyoffice','N1',5,1510,'总经办的业务通知',['跨区域及转介绍申请到达 / 更新','审批催办','打开本次审批待办'],'notice',ports=('N1',))
n('remind','N',1,1698,'待办催办 / 通知入口',['发起人给他人：每 24 小时一次','驳回通知，原待办编辑重提','通知不自动完成业务待办'],'notice')
n('preview','P1',1,2000,'报价预览与分享',['填写客户、贸易、计价与费用','免密内部链接 / 密码客户链接','按原模板导出合同Word'],'action')
n('online','Q1',4,2000,'客户线上总览',['Summary / 报价清单','品类提示新报价，右侧确认','Summary列A/B价与收款资料'],'client',ports=('Q1',))
n('clientconfirm','Q2',4,2188,'客户密码链接确认',['验证密码后核对当前版本','记录版本和时间，通知PM/SM','产品备货必要条件之一'],'client',ports=('Q2',))
n('erp','09',6,2410,'ERP 收款及结果回传',['先完成报价，再收款','请求、实际回执与实收分开','提交报价后初始状态：未执行'],'erp')
n('stock','10P',1,2598,'待下单：产品备货',['实收≥20%：进入待下单','当前版本获客户确认且资料齐全','PM / SM 在 ERP 点击备货'],'erp')
n('delivery','11P',3,2598,'产品交付及状态回传',['实际备货进入交付中','正常交付结束：已完成','汇总关联项目状态'],'erp')
n('service','10D',2,2598,'待下单：设计履行',['该单 ERP 实收≥20%：待下单','GDS 确认收到款：交付中','GDS 完成设计中：已完成'],'erp')
e('customer','project');e('project','allocation');e('allocation','spaces','产品分配');e('spaces','acceptproduct','普通区域内');e('spaces','approval','跨区域 / 转介绍')
e('allocation','acceptdesign','设计服务，可与产品并行')
e('acceptproduct','retry','拒绝','return');e('approval','retry','驳回','return');e('acceptdesign','retry','拒绝','return');e('retry','allocation','编辑原申请重提','return')
e('acceptproduct','productquote');e('approval','productquote','审批通过');e('productquote','productsave');e('productsave','productsubmit');e('productsubmit','overview','发布 Q1')
e('acceptdesign','designquote','同时生成报价任务');e('designsubmit','designresult','提交成功生成设计中任务');e('designquote','designsave');e('designsave','designsubmit');e('designsubmit','overview','发布 Q1')
e('designresult','coordinator','设计师安排协调员');e('coordinator','review','已确认结果 / PM 同步');e('designresult','review','PM 或指定协调员审核');e('review','designresult','仅被驳回图纸由 GDS 重提','return')
e('overview','preview','PM维护对客信息');e('preview','online','填写保存后预览 / 分享')
e('online','clientconfirm','密码验证后客户确认');e('productsubmit','erp','产品报价提交');e('designsubmit','erp','设计报价提交');e('erp','stock','产品实收达到20%');e('clientconfirm','stock','当前版本确认，结合实收与资料校验','notice');e('stock','delivery');e('erp','service','设计单实收达到20%')
for node in nodes:
 if node['id'] in ['productsubmit','designsubmit']:node['w']=396
systems=[('CRM',82,1070),('CRM / GDS',1070,1470),('企业微信',1470,1960),('客户线上报价',1960,2370),('ERP',2370,HEIGHT)]
by={n['id']:n for n in nodes}
colors={'task':('#edf7fe','#69acda'),'action':('#fff','#99b5c8'),'approval':('#fcf5e9','#d4ad68'),'client':('#eff9f2','#8fb89b'),'notice':('#f2f4ff','#a5abd2'),'erp':('#f2f6f8','#99afbe')}
edgecolors={'business':'#6d8295','return':'#ab7945','notice':'#8186aa','optional':'#528e75'}
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',12);titlefont=ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc',14)
def wrap(s,heading=False,width=160):
 f=titlefont if heading else font;parts=[];line=''
 for c in s:
  if f.getlength(line+c)>width:parts.append(line);line=''
  line+=c
 return parts+[line] if line else parts
def axis():
 return '<svg viewBox="0 0 '+str(WIDTH)+' 82" width="'+str(WIDTH)+'" height="82" aria-label="系统与处理角色"><rect width="100%" height="82" fill="#183b52"/><text x="56" y="46" class="axis-title">系统</text>'+''.join(f'<text x="{STARTS[i]+WIDTHS[i]/2}" y="46" class="axis-title">{escape(role)}</text>' for i,role in enumerate(ROLES))+'</svg>'
out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 82 {WIDTH} {HEIGHT-82}" width="{WIDTH}" height="{HEIGHT-82}" role="img" aria-label="统一项目与并行商机流程">','<defs>'+''.join(f'<marker id="arrow-{k}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 Z" fill="{v}"/></marker>' for k,v in edgecolors.items())+'</defs>']
for index,(system,y,end) in enumerate(systems):
 out +=[f'<rect width="{WIDTH}" y="{y}" height="{end-y}" fill="{["#f7fafc","#f3f8fa"][index%2]}"/>',f'<rect width="112" y="{y}" height="{end-y}" fill="#e9f1f6"/><text x="56" y="{y+30}" class="system-label">{system}</text>']
 for x in STARTS:out.append(f'<line x1="{x}" x2="{x}" y1="{y}" y2="{end}" stroke="#dce6ed"/>')
labelboxes=[]
def clear(box):
 return not any(box[0]<x+w+3 and box[0]+box[2]>x-3 and box[1]<y+h+3 and box[1]+box[3]>y-3 for x,y,w,h in [(n['x'],n['y'],n['w'],n['h']) for n in nodes]+labelboxes)
for edge in edges:
 pts=route(by[edge['start']],by[edge['end']],nodes,edge['kind'],WIDTH);edge['points']=pts
 for a,b in zip(pts,pts[1:]):
  assert not any(intersects(a,b,(n['x'],n['y'],n['w'],n['h'])) for n in nodes),(edge['start'],edge['end'])
 path=' '.join(('M' if i==0 else 'L')+f'{x},{y}' for i,(x,y) in enumerate(pts));k=edge['kind']
 out.append(f'<path data-edge="{edge["start"]}-{edge["end"]}" d="{path}" fill="none" stroke="{edgecolors[k]}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" '+('stroke-dasharray="6 5" ' if edge['dashed'] else '')+f'marker-end="url(#arrow-{k})"/>')
 if edge['label']:
  tw=font.getlength(edge['label'])+12;options=[]
  for a,b in zip(pts,pts[1:]):
   if a[1]==b[1] and abs(a[0]-b[0])>=tw:
    for dy in (-8,22):
     x=(a[0]+b[0])/2;y=a[1]+dy;box=(x-tw/2,y-13,tw,19)
     if clear(box):options.append((abs(a[0]-b[0]),x,y,box))
  if options:
   _,x,y,box=max(options);labelboxes.append(box);edge['labelAt']=[x,y]
   out.append(f'<rect x="{x-tw/2}" y="{y-13}" width="{tw}" height="19" rx="3" fill="white"/><text x="{x}" y="{y}" class="edge-label" fill="{edgecolors[k]}">{escape(edge["label"])}</text>')
  else:edge['labelAt']=None
for node in nodes:
 x,y=node['x'],node['y'];bg,stroke=colors[node['tone']];head=wrap(node['title'],True,node['w']-24);body=[line for s in node['lines'] for line in wrap(s,width=node['w']-24)]
 bodyy=y+43+len(head)*20+3
 assert bodyy+(len(body)-1)*17<=y+125,(node['id'],head,body)
 out.append(f'<g data-node="{node["id"]}"><rect x="{x}" y="{y}" width="{node['w']}" height="132" rx="7" fill="{bg}" stroke="{stroke}" stroke-width="1.4"/><text x="{x+12}" y="{y+22}" class="number">{node["number"]}</text>')
 for i,s in enumerate(head):out.append(f'<text x="{x+12}" y="{y+43+20*i}" class="node-title">{escape(s)}</text>')
 for i,s in enumerate(body):out.append(f'<text x="{x+12}" y="{bodyy+17*i}" class="node-copy">{escape(s)}</text>')
 for i,p in enumerate(node['ports']):out.append(f'<text x="{x+node['w']-12-30*(len(node["ports"])-i)}" y="{y+22}" class="number port">{p}</text>')
 out.append('</g>')
out.append('</svg>')
rules=json.loads((R/'george-crm-react/src/features/notifications/roles.json').read_text(encoding='utf8'))
guide='<details class="role-notifications"><summary>各角色接收哪些企微通知</summary><table><thead><tr><th>角色</th><th>接收通知</th><th>点击后的去向</th></tr></thead><tbody>'+''.join('<tr><th>'+escape(row['role'])+'</th><td>'+escape(row['events'])+'</td><td>'+escape(row['entry'])+'</td></tr>' for row in rules)+'</tbody></table></details>'
html='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>新流程图 · 敬城 CRM</title><script>if(new URLSearchParams(location.search).get('embedded')==='1')document.documentElement.classList.add('embedded');</script><style>
*{box-sizing:border-box}body{margin:0;background:#f3f7fa;color:#183b52;font:14px/1.7 'Microsoft YaHei',Arial,sans-serif}header{padding:20px 28px;background:white;border-bottom:1px solid #dce6ed}h1{font-size:25px;margin:0}header p{margin:5px 0 0;color:#657e90}nav{display:flex;gap:10px;align-items:center;padding:12px 28px;background:#fff;border-bottom:1px solid #dce6ed;position:sticky;top:0;z-index:4;min-width:max-content}nav strong{margin-right:auto}button,a.control{font:inherit;border:1px solid #bfd6e5;background:white;color:#1e658c;padding:8px 14px;border-radius:5px;cursor:pointer;text-decoration:none}.zoom-readout{min-width:45px;text-align:center}main{padding:18px 28px 24px}.caption{background:#fff;border:1px solid #dce6ed;padding:12px 16px;border-radius:7px}.caption p{margin:0 0 5px}.legend{display:flex;flex-wrap:wrap;gap:20px;color:#657e90;font-size:12px}.key{display:inline-block;width:22px;height:11px;background:#edf7fe;border:1px solid #69acda;margin-right:5px}.linekey{display:inline-block;width:25px;border-top:2px solid #6d8295;margin:0 6px 4px 0}.linekey.return{border-top-style:dashed;border-color:#ab7945}.role-notifications{border:1px solid #dce6ed;background:#fff;border-radius:7px;margin:12px 0}.role-notifications summary{padding:10px 16px;font-weight:600;cursor:pointer}.role-notifications table{width:100%;border-collapse:collapse;font-size:12px}.role-notifications th,.role-notifications td{padding:10px 14px;border-top:1px solid #e3ecf2;text-align:left;vertical-align:top}.diagram-scroll{overflow:visible;max-height:none;background:#fff;border:1px solid #cfdee8;border-radius:7px;width:max-content;min-width:100%}.role-header{position:sticky;top:var(--nav-height,64px);z-index:2;background:#183b52;width:max-content;min-width:100%;line-height:0}.role-header svg,.svg-holder svg{display:block}.svg-holder{width:max-content}.axis-title{font-size:16px;fill:white;text-anchor:middle;font-weight:bold}.system-label{font-size:13px;fill:#31566d;text-anchor:middle;font-weight:bold}.number{font-size:12px;fill:#2586b8;font-weight:bold}.port{fill:#637f89}.node-title{font-size:14px;fill:#183b52;font-weight:bold}.node-copy{font-size:12px;fill:#4b6578}.edge-label{font-size:12px;text-anchor:middle}.embedded header{display:none}@media(max-width:700px){header,main{padding:14px}nav{padding:10px 14px}nav strong{display:none}}@media print{@page{size:A3 landscape;margin:10mm}body{background:white}header{padding:0 0 12px}nav,.role-notifications{display:none}main{padding:0}.caption{border:0}.diagram-scroll,.role-header,.svg-holder{width:100%!important;min-width:0}.role-header{position:static}.diagram-scroll svg{width:100%!important;height:auto!important}}
</style></head><body><header><h1>新流程图</h1><p>一个项目可同时分配产品与设计商机；产品报价可由SM或授权助理办理，跨品类部门使用PM确认的品类名称。</p></header><nav aria-label="新流程图"><strong>统一项目与商机流程</strong><button data-zoom="out" aria-label="缩小流程图">−</button><span class="zoom-readout">100%</span><button data-zoom="in" aria-label="放大流程图">＋</button><button data-zoom="fit">适应宽度</button><a class="control" href="workflow-comparison.html" target="_blank" rel="noopener">旧流程图 ↗</a><button id="print">打印 / 保存 PDF</button></nav><main><div class="caption"><p>创建项目 → 分配商机任务分配商机；同一项目可以分别分配区域内 SM、跨区域 SM 和设计师主管。区域内有转介绍人、跨区域申请均交总经办审批；普通区域内分配由 SM 接单。已提交报价再次暂存后激活原报价待办，提交新版本后完成；暂存期间两端与ERP仍使用上次提交。采购与设计提交报价后均待下定，各自订单 ERP 实收达到20%后待下单。产品分配只读项目统一空间，缺项在同一抽屉编辑项目，保存成功后返回分配；空间增删改名保存前核对影响并二次确认；仅排序同步两端总览及新报价预设顺序，不影响已提交报价。客户预览前由 PM 维护展示资料、计价和订单费用，客户在 Summary、报价清单间切换；新报价提示和历史查阅独立于客户报价确认及 ERP 收款。产品报价不等待设计成果；设计商机承接后生成报价任务，设计单提交成功后同步生成 GDS 设计中任务，回图生成设计定稿；PM 或指定协调员全确认后手动同步，设计中任务由 GDS 独立完成。</p><div class="legend"><span><i class="key"></i>待办办理节点</span><span><i class="linekey"></i>业务流转</span><span><i class="linekey return"></i>拒绝 / 驳回重提</span><span>Q1：两端同版报价；Q2：客户确认；N1：精确关联待办通知</span></div></div>__GUIDE__<section id="unified"><div class="diagram-scroll"><div class="role-header">__AXIS__</div><div class="svg-holder">__FLOW__</div></div></section></main><script>(()=>{let zoom=1,fit=false;const svg=document.querySelector('.svg-holder svg'),axis=document.querySelector('.role-header svg');function apply(){if(fit)zoom=Math.max(.4,(document.documentElement.clientWidth-58)/svg.viewBox.baseVal.width);svg.style.width=svg.viewBox.baseVal.width*zoom+'px';svg.style.height=svg.viewBox.baseVal.height*zoom+'px';axis.style.width=svg.viewBox.baseVal.width*zoom+'px';axis.style.height=82*zoom+'px';document.documentElement.style.setProperty('--nav-height',document.querySelector('nav').offsetHeight+'px');document.querySelector('.zoom-readout').textContent=Math.round(zoom*100)+'%';}document.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{fit=b.dataset.zoom==='fit';if(!fit)zoom=Math.max(.4,Math.min(2,zoom+(b.dataset.zoom==='in'?.1:-.1)));apply();});window.addEventListener('resize',apply);document.getElementById('print').onclick=()=>window.print();apply();requestAnimationFrame(apply);})();</script></body></html>'''.replace('__AXIS__',axis()).replace('__FLOW__',''.join(out)).replace('__GUIDE__',guide)
from document_update_stamp import stamp_html
html=stamp_html(html,'new-workflow','新流程图')
pub=R/'george-crm-react/public';(pub/'new-workflow.html').write_text(html,encoding='utf8')
archive=R/'outputs/新流程图';archive.mkdir(exist_ok=True);(archive/'敬城CRM新流程图_2026-11-03_暂存重激活.html').write_text(html.replace('href="workflow-comparison.html','href="https://chumkk.github.io/george-crm/workflow-comparison.html'),encoding='utf8')
record={'unified':dict(nodes=nodes,edges=edges,systems=systems,width=WIDTH,height=HEIGHT,widths=WIDTHS)}
(R/'work/new-workflow-v246-layout.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'flow':'unified','nodes':len(nodes),'edges':len(edges),'width':WIDTH,'height':HEIGHT}))
