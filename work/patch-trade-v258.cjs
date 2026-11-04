const fs=require('fs'),file='george-crm-react/src/compat/runtime/clientProposal.js';let source=fs.readFileSync(file,'utf8');
function replace(before,after){if(!source.includes(before))throw Error('Missing patch marker: '+before.slice(0,90));source=source.replace(before,after);}
replace("trade:'CIF'","trade:cxp258ProjectTrade(project)");
replace('fees:cxp208FeeSources(project).fees','fees:{...cxp208FeeSources(project).fees,tradeFee:null}');
replace('<label class="cxp-field">${title(\'外贸方式\')}<select name="trade">${[\'FOB\',\'CIF\',\'DDP\'].map(x=>`<option${x===d.trade?\' selected\':\'\'}>${x}</option>`).join(\'\')}</select></label>','<p class="cxp-trade-note full">外贸方式：${esc(d.trade||\'未填写\')}（沿用项目）。如需更改，请前往「项目详情 → 编辑项目 → 物流方式」。</p>');
replace("['tradeFee',d.trade+' 费用']","['tradeFee',(d.trade||'外贸')+' 费用']");
replace('${label}${key===\'tradeFee\'?\' <b>*</b>\':\'\'}','${esc(label)}${key===\'tradeFee\'?\' <b>*</b>\':\'\'}');
replace('${key!==\'designReduction\'?\' readonly aria-readonly="true"\':\'\'}','${[\'designFee\',\'otherFee\'].includes(key)?\' readonly aria-readonly="true"\':key===\'tradeFee\'?\' required\':\'\'}');
replace('外贸费用、设计费和其他费用按CRM来源订单自动汇总，只读展示；需调整请修改来源订单。无来源订单时为0。','设计费和其他费用按CRM来源订单只读汇总；外贸费用与设计减免费按实际约定填写。');
replace('<dt>${k}</dt>','<dt>${esc(k)}</dt>');
replace("  if(event.target.name==='trade'){cxp208Capture();cxp208RenderForm();}\n",'');
fs.writeFileSync(file,source);
