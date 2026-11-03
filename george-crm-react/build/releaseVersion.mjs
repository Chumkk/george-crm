import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
export function releaseVersion(root, now = new Date()) {
  const files = [];
  function scan(relative) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    if (fs.statSync(absolute).isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort()) scan(path.join(relative, name));
    } else files.push(relative);
  }
  for (const name of ['src', 'public', 'build', 'index.html', 'client.html', 'vite.config.js', 'package.json']) scan(name);
  const hash = createHash('sha256');
  for (const name of files.sort()) hash.update(name.replaceAll('\\', '/') + '\0').update(fs.readFileSync(path.join(root, name))).update('\0');
  return { schema: 1, version: hash.digest('hex'), builtAt: now.toISOString() };
}
