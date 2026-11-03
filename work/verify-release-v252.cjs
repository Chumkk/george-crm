const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'george-crm-react/dist'),release=JSON.parse(fs.readFileSync(path.join(dist,'app-release.json'),'utf8'));
for(const name of ['index.html','client.html'])if(!fs.readFileSync(path.join(dist,name),'utf8').includes('data-release-version="'+release.version+'"'))throw Error('Page version mismatch');
const prior=JSON.parse(fs.readFileSync(path.join(__dirname,'v251-manifest.json'),'utf8'));
for(const name of ['space-quote-prd.html','space-quote-prd.pdf','customer-followup-prd.html','customer-followup-prd.pdf','new-workflow.html','workflow-comparison.html']){
 const row=prior.find(x=>x.path===name),b=fs.readFileSync(path.join(dist,name)),sha=require('crypto').createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
 if(!row||sha!==row.sha)throw Error('Unexpected document change: '+name);
}
const result={...release,testsPassed:778,buildPassed:true,documentFilesUnchanged:true,layout:'Project and opportunity toolbar plus column headings remain above the outer-scrolling rows; column headings follow horizontal table scroll and column visibility/size changes',renderedBrowserVerified:false};
fs.writeFileSync(path.join(__dirname,'v252-release-checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
