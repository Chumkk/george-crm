import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
export const documentPages = ['space-quote-prd.html', 'customer-followup-prd.html', 'new-workflow.html', 'workflow-comparison.html'];
const bootstrap = /<script\b(?=[^>]*\bdata-crm-document-release\b)[^>]*>[\s\S]*?<\/script>\r?\n?/g;
export function documentContent(html) { return html.replace(bootstrap, ''); }
export function documentVersion(root, name, html) {
  const hash = createHash('sha256').update(documentContent(html));
  const pdf = path.join(root, 'public', name.replace(/\.html$/, '.pdf'));
  if (fs.existsSync(pdf)) hash.update('\0PDF\0').update(fs.readFileSync(pdf));
  return hash.digest('hex');
}
export function prepareDocumentNotices(root, now = new Date()) {
  const documents = {};
  for (const name of documentPages) {
    const file = path.join(root, 'public', name);
    if (!fs.existsSync(file)) continue;
    const prior = fs.readFileSync(file, 'utf8'), content = documentContent(prior), version = documentVersion(root, name, prior);
    const oldTag = prior.match(/<script\b(?=[^>]*\bdata-crm-document-release\b)[^>]*>/)?.[0] || '';
    const same = oldTag.includes('data-release-version="' + version + '"');
    const builtAt = same ? oldTag.match(/data-release-built-at="([^"]+)"/)?.[1] || now.toISOString() : now.toISOString();
    const tag = '<script src="./release-notice-loader.js?v=' + version + '" defer data-crm-document-release data-release-document="' + name + '" data-release-version="' + version + '" data-release-built-at="' + builtAt + '"></script>\n';
    const next = content.replace(/<\/body>/i, tag + '</body>');
    if (next === content) throw Error('Document body missing: ' + name);
    if (next !== prior) fs.writeFileSync(file, next);
    documents[name] = version;
    // Keep the current space-quotation archive's HTML shell aligned; PDF/business content is unchanged.
    if (name === 'space-quote-prd.html') {
      const revision = content.match(/空间报价 PRD\s*·\s*(V\d+\.\d+)/)?.[1];
      const archive = revision && path.resolve(root, '../outputs/空间报价PRD/敬城CRM空间报价PRD_' + revision + '_模块阅读版.html');
      if (archive && fs.existsSync(archive) && documentContent(fs.readFileSync(archive, 'utf8')) === content) fs.writeFileSync(archive, next);
    }
  }
  return documents;
}
