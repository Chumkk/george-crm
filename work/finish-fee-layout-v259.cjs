const fs=require('fs'),path=require('path'),file=path.resolve(__dirname,'../george-crm-react/src/compat/runtime/clientProposal.js');let s=fs.readFileSync(file,'utf8');
s=s.replace(".map(([key,label])=>`<label class=\"cxp-field\"><span", ".map(([key,label])=>`<div class=\"cxp-field cxp-fee-field\"><label class=\"cxp-fee-amount-label\"><span");
s=s.replace('<span class="cxp-fee-note-title">备注（客户可见，选填）</span>', '</label><label class="cxp-fee-note-label"><span class="cxp-fee-note-title">备注（客户可见，选填）</span>');
s=s.replace("${esc(d.feeNotes[key])}</textarea></label>`", "${esc(d.feeNotes[key])}</textarea></label></div>`");fs.writeFileSync(file,s);
fs.appendFileSync(path.resolve(__dirname,'../george-crm-react/public/prototype.css'),'\n.cxp-fee-amount-label,.cxp-fee-note-label{display:flex;flex-direction:column;gap:8px;min-width:0}\n');
let inspect=fs.readFileSync(path.resolve(__dirname,'inspect-form-v258.cjs'),'utf8').replaceAll('258','259');
inspect=inspect.replace("sourceFeesReadonly:['designFee','otherFee'].every(key=>/readonly/.test(input(key)))", "allFeesEditable:['tradeFee','designFee','designReduction','otherFee'].every(key=>input(key)&&!/readonly/.test(input(key))),fourNoteInputs:['tradeFee','designFee','designReduction','otherFee'].every(key=>html.includes('name=\"fee-note-'+key+'\"')),clientVisibilityLabel:html.includes('备注（客户可见，选填）')");
fs.writeFileSync(path.resolve(__dirname,'inspect-form-v259.cjs'),inspect);
