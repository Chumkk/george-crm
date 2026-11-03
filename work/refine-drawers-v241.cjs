const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..'),file=path.join(root,'george-crm-react/src/compat/runtime/quoteRevision.js');let s=fs.readFileSync(file,'utf8');
s=s.replace('<button type="button" data-history-media="close" aria-label="${text(\'关闭空间图片\',\'Close space images\')}">×</button>','')
 .replace("dialog.querySelector('.q128-history-media-head [data-history-media=\"close\"]')?.remove();",'');
fs.writeFileSync(file,s);
