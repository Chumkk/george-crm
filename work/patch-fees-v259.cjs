const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const file=path.join(root,'george-crm-react/src/compat/runtime/clientProposal.js');let s=fs.readFileSync(file,'utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing: '+a.slice(0,90));s=s.replace(a,b);}
replace("item.bucket==='designFee'||item.bucket==='otherFee'","item.bucket==='designFee'");
replace('// Delivered snapshots retain their originally shared amounts; active CRM\n  // presentation derives design/other fees and trade method from their sources.', '// Delivered snapshots retain their shared values. Active settings inherit the\n  // project trade method; source design fees are initial values, never overrides.');
replace('fees:{tradeFee:null,designReduction:0,...config.fees,designFee:source.fees.designFee,otherFee:source.fees.otherFee},feeSourceSchema:258,feeSourceKey:cxp258SourceKey(project)', "fees:{tradeFee:null,designFee:source.fees.designFee,designReduction:0,otherFee:0,...config.fees},feeNotes:{tradeFee:'',designFee:'',designReduction:'',otherFee:'',...config.feeNotes},feeSourceSchema:259,feeSourceKey:config.feeSourceKey??cxp258SourceKey(project)");
replace('function cxp208Defaults(project) {', `function cxp259ReloadDesignFee(project,config) {
  return cxp253SourceFees(project,{...config,fees:{...config.fees,designFee:cxp208FeeSources(project).fees.designFee},feeSourceKey:cxp258SourceKey(project)});
}
function cxp208Defaults(project) {`);
replace('fees:{...cxp208FeeSources(project).fees,tradeFee:null}',"fees:{tradeFee:null,designFee:cxp208FeeSources(project).fees.designFee,designReduction:0,otherFee:0},feeNotes:{tradeFee:'',designFee:'',designReduction:'',otherFee:''}");
replace("  const sourceKey=cxp258SourceKey(project);\n  if(input.feeSourceSchema>=258&&input.feeSourceKey!==sourceKey)throw Error('来源订单费用已更新，请重新读取费用后核对');\n",'');
replace("  if (cxp208Totals(rows,config).balance<0)",`  if(config.feeNotes!==undefined) {
    if(!config.feeNotes||Array.isArray(config.feeNotes)||typeof config.feeNotes!=='object'||Object.entries(config.feeNotes).some(([key,value])=>!['tradeFee','designFee','designReduction','otherFee'].includes(key)||typeof value!=='string'||value.length>1000))throw Error('费用备注格式无效，每项最多1000字');
  }
  if (cxp208Totals(rows,config).balance<0)`);
replace("fee.items=fee.items.filter(item=>item.bucket==='designFee'||item.bucket==='otherFee');","fee.items=fee.items.filter(item=>item.bucket==='designFee');");
replace("${['designFee','otherFee'].includes(key)?' readonly aria-readonly=\"true\"':key==='tradeFee'?' required':''}","${key==='tradeFee'?' required':''}");
replace("<span>${cxp208Code(d.currencyOption)}</span></span></label>`).join('')}","<span>${cxp208Code(d.currencyOption)}</span></span><span class=\"cxp-fee-note-title\">备注（客户可见，选填）</span><textarea name=\"fee-note-${key}\" rows=\"2\" maxlength=\"1000\" aria-label=\"${esc(label)}备注\" placeholder=\"说明此项费用包含的内容或约定\">${esc(d.feeNotes[key])}</textarea></label>`).join('')}");
replace('设计费和其他费用按CRM来源订单只读汇总；外贸费用与设计减免费按实际约定填写。','设计费首次读取CRM来源订单，可按约定修改；其他费用、外贸费用及设计减免费自行填写。每项备注将显示在客户Summary中。');
replace('费用来源（${fee.items.length}）','设计费来源（${fee.items.length}）');replace('>重新读取费用</button>','>重新读取设计费</button>');
replace("for(const key of ['tradeFee','designReduction']){","for(const key of ['tradeFee','designFee','designReduction','otherFee']){");
replace("    input.defaultValue=input.value;", "    input.defaultValue=input.value;\n    const note=form.elements['fee-note-'+key];if(note){d.feeNotes??={};d.feeNotes[key]=note.value;}");
replace("CXP208.draft=cxp253SourceFees(CXP208.project,CXP208.draft);cxp208RenderForm();return;", "CXP208.draft=cxp259ReloadDesignFee(CXP208.project,CXP208.draft);cxp208RenderForm();return;");
replace("[config.trade+' Fee',config.fees.tradeFee],['Design Fee',config.fees.designFee],['Design Fee Deducted',-config.fees.designReduction],['Other Fee',config.fees.otherFee]", "[config.trade+' Fee',config.fees.tradeFee,'tradeFee'],['Design Fee',config.fees.designFee,'designFee'],['Design Fee Deducted',-config.fees.designReduction,'designReduction'],['Other Fee',config.fees.otherFee,'otherFee']");
replace(".map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${cxp208Money(v,config)}</dd></div>`)",".map(([k,v,key])=>`<div><dt>${esc(k)}</dt><dd>${cxp208Money(v,config)}</dd>${key&&config.feeNotes?.[key]?.trim()?`<p class=\"cxp-fee-note\">${esc(config.feeNotes[key])}</p>`:''}</div>`)");
fs.writeFileSync(file,s);
const share=path.join(root,'george-crm-react/src/compat/runtime/clientShare.js');s=fs.readFileSync(share,'utf8');replace("'account','fees','invoiceDate'","'account','fees','feeNotes','invoiceDate'");fs.writeFileSync(share,s);
const css=path.join(root,'george-crm-react/public/prototype.css');fs.appendFileSync(css,`\n/* Fee remarks remain readable in the form, customer Summary and print. */
.cxp-field .cxp-fee-note-title{font-size:12px;color:#64748b;margin-top:4px}
.cxp-field textarea{width:100%;box-sizing:border-box;min-height:64px;padding:9px 11px;border:1px solid #d7e0e8;border-radius:6px;font:inherit;line-height:1.5;resize:vertical;background:#fff;color:#243c50}
.cxp-field textarea:focus{outline:2px solid #9ac9ef;outline-offset:1px}
.cxp-settlement dl>div{flex-wrap:wrap}
.cxp-settlement .cxp-fee-note{flex:0 0 100%;grid-column:1 / -1;margin:5px 0 0;font-size:12px;font-weight:400;line-height:1.6;color:#64748b;white-space:pre-line;overflow-wrap:anywhere;min-width:0}
@media print{.cxp-settlement .cxp-fee-note{display:block;color:#444;break-inside:avoid}}
`);
const demo=path.join(root,'george-crm-react/public/quotation-demo.json'),j=JSON.parse(fs.readFileSync(demo,'utf8'));
j.config.feeNotes={tradeFee:'包含约定范围内的运输费用，具体交付范围以双方确认为准。',designFee:'采购方案设计费用。',designReduction:'本次未约定设计费减免。',otherFee:'本次无其他费用。'};
fs.writeFileSync(demo,JSON.stringify(j));
console.log('v259 fee fields, notes, snapshot whitelist and demo updated');
