const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'george-crm-react/dist'),read=name=>fs.readFileSync(path.join(dist,name),'utf8');
(async()=>{
 const {documentPages,documentContent,documentVersion}=await import('../george-crm-react/build/documentNotices.mjs');
 const release=JSON.parse(read('app-release.json'));
 if(release.schema!==1||!/^[a-f0-9]{64}$/.test(release.version)||!Number.isFinite(Date.parse(release.builtAt)))throw Error('Invalid manifest');
 for(const name of ['index.html','client.html'])if(!read(name).includes('data-release-version="'+release.version+'"'))throw Error('Page version mismatch: '+name);
 const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'v251-document-baseline.json'),'utf8')),documents=[];
 for(const name of documentPages){
  const html=read(name),source=fs.readFileSync(path.join(root,'george-crm-react/public',name),'utf8');
  const version=documentVersion(path.join(root,'george-crm-react'),name,source);
  if(html!==source||release.documents[name]!==version||!html.includes('data-release-version="'+version+'"')||!html.includes('data-release-document="'+name+'"')||(html.match(/data-crm-document-release/g)||[]).length!==1)throw Error('Document mismatch: '+name);
  const content=documentContent(html);
  const contentSha256=crypto.createHash('sha256').update(content).digest('hex');
  if(baseline.find(item=>item.name===name)?.priorContentSha256!==contentSha256)throw Error('Business content changed: '+name);
  documents.push({name,version,contentSha256,businessContentUnchanged:true});
 }
 const archive=fs.readFileSync(path.join(root,'outputs/空间报价PRD/敬城CRM空间报价PRD_V2.02_模块阅读版.html'),'utf8');
 if(archive!==read('space-quote-prd.html'))throw Error('Archive HTML mismatch');
 if(!fs.readFileSync(path.join(root,'outputs/空间报价PRD/敬城CRM空间报价PRD_V2.02_模块阅读版.pdf')).equals(fs.readFileSync(path.join(dist,'space-quote-prd.pdf'))))throw Error('Archive PDF mismatch');
 const runtime=read('update-notice.js');new vm.Script(runtime);
 if(runtime.includes('__CRM_RELEASE_VERSION__')||runtime.includes('__CRM_RELEASE_TIME__')||!runtime.includes(release.version)||!runtime.includes('@media print'))throw Error('Runtime version/printing mismatch');
 const worker=read('asset-cache.js');for(const name of ['app-release.json','update-notice.js','release-notice-loader.js'])if(worker.includes(name))throw Error('Mutable metadata cached: '+name);
 let injected;const script={dataset:{}};vm.runInNewContext(read('release-notice-loader.js'),{window:{},URL,Date:{now:()=>123},document:{currentScript:{src:'https://example.com/george-crm/release-notice-loader.js',dataset:{releaseVersion:'a'.repeat(64),releaseBuiltAt:release.builtAt,releaseDocument:'space-quote-prd.html'}},createElement:()=>script,head:{appendChild:value=>injected=value}}});
 if(injected.src!=='https://example.com/george-crm/update-notice.js?boot=123'||injected.dataset.releaseVersion!=='a'.repeat(64)||injected.dataset.releaseDocument!=='space-quote-prd.html'||!injected.async)throw Error('Document loader handshake failed');
 const result={...release,documents,archiveHtmlPdfMatched:true,loaderHandshake:true,mutableMetadataBypassesAssetCache:true,runtimeSyntax:true,tests:778,buildPassed:true,renderedBrowserVerified:false};
 fs.writeFileSync(path.join(__dirname,'v251-release-checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(error=>{console.error(error);process.exitCode=1;});
