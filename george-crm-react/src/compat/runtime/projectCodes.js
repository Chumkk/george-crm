/* Correct legacy sample business-number presentation without re-keying saved records or links. */
const PC249={key:'crm-project-display-codes-v249',aliases:typeof wkRead==='function'?wkRead('crm-project-display-codes-v249',{}):{},documents:new WeakSet()};
function pc249Candidate(id){let m;if((m=/^PJ-NOTICE-NT-DEMO-(\d+)$/.exec(id)))return 91000+Number(m[1]);if((m=/^PJ-MONITOR-DEMO-138([AB])$/.exec(id)))return 92001+m[1].charCodeAt(0)-65;if((m=/^PJ-MOCK-187([ABC])$/.exec(id)))return 93001+m[1].charCodeAt(0)-65;if((m=/^PJ-REVIEW-SPACE-(\d+)$/.exec(id)))return 94000+Number(m[1]);if(!/^PJ-(?:NOTICE|MONITOR|MOCK|REVIEW)-[A-Za-z0-9-]+$/.test(id))return null;let hash=0;for(const c of id)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;return 95000+hash%4000;}
function projectDisplayCode(id){const text=String(id||''),candidate=pc249Candidate(text);if(candidate===null)return text;if(PC249.aliases[text])return PC249.aliases[text];let number=candidate,code;const used=new Set([...(typeof PROJECTS==='undefined'?[]:PROJECTS.map(p=>p[0])),...Object.values(PC249.aliases)]);do{code='PJ'+String(number++).padStart(7,'0');}while(used.has(code));PC249.aliases[text]=code;return code;}
function projectLookupCode(code){return Object.entries(PC249.aliases).find(([,value])=>value===String(code).toUpperCase())?.[0]||code;}
function pc249LookupText(value){return typeof value==='string'?value.replace(/\bPJ\d{7}\b/gi,code=>projectLookupCode(code)):value;}
function pc249Text(value){return typeof value==='string'?value.replace(/PJ-(?:NOTICE|MONITOR|MOCK|REVIEW)-[A-Za-z0-9-]+/g,token=>{const candidates=Object.keys(PC249.aliases).sort((a,b)=>b.length-a.length),id=candidates.find(id=>token===id||token.startsWith(id+'-'));if(id){const suffix=token.slice(id.length);return projectDisplayCode(id)+(/^-(\d{1,7})$/.test(suffix)?'-'+suffix.slice(1).padStart(7,'0'):suffix);}const m=token.match(/^(PJ-NOTICE-NT-DEMO-\d+|PJ-MONITOR-DEMO-138[AB]|PJ-MOCK-187[ABC]|PJ-REVIEW-SPACE-\d+)(?:-(\d{1,7}))?$/);return m?projectDisplayCode(m[1])+(m[2]?'-'+m[2].padStart(7,'0'):''):token;}):value;}
function pc249Register(){for(const row of typeof PROJECTS==='undefined'?[]:PROJECTS)projectDisplayCode(row[0]);if(typeof document!=='undefined'&&document.documentElement?.dataset?.entry!=='client'&&typeof wkWrite==='function')wkWrite(PC249.key,PC249.aliases);}
pc249Register();
if(typeof oqFormatOrderNumber==='function'){
 const format=oqFormatOrderNumber;oqFormatOrderNumber=function(value,project=''){return format(pc249Text(value),projectDisplayCode(project));};
 const text=oqNumberText;oqNumberText=function(value,project=''){return pc249Text(text(value,project));};
}
if(typeof todoMatchesSearch==='function'){const match=todoMatchesSearch;todoMatchesSearch=function(task,query){return match(task,query)||match(task,pc249LookupText(query));};}
if(typeof v5SearchResults==='function'){const results=v5SearchResults;v5SearchResults=function(query=''){return results(pc249LookupText(query));};}
// Text nodes only: action attributes, raw keys, form input and immutable snapshots stay authoritative.
function pc249Watch(doc){
 if(!doc?.body||PC249.documents.has(doc)||typeof MutationObserver==='undefined')return;PC249.documents.add(doc);
 const update=node=>{if(node.nodeType===3){if(node.parentElement?.closest('script,style,textarea,input,[contenteditable="true"]'))return;const next=pc249Text(node.data);if(next!==node.data)node.data=next;}else if(node.nodeType===1&&!node.matches('script,style,textarea,input,[contenteditable="true"]'))for(const child of node.childNodes)update(child);};
 update(doc.body);const observer=new MutationObserver(records=>{for(const r of records)if(r.type==='characterData')update(r.target);else for(const node of r.addedNodes)update(node);});observer.observe(doc.body,{childList:true,subtree:true,characterData:true});
 doc.addEventListener('load',event=>{if(event.target?.tagName==='IFRAME')try{pc249Watch(event.target.contentDocument);}catch{/* Cross-origin documents own their own presentation. */}},true);
}
if(typeof document!=='undefined')pc249Watch(document);
