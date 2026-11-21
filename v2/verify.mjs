import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const html = readFileSync('index.html','utf8');
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!match) throw new Error('Missing app module script');
const target = join(tmpdir(), 'dispopotes-check.mjs');
writeFileSync(target, match[1]);
execFileSync(process.execPath, ['--check', target], {stdio:'inherit'});
for(const token of ["showGroup", "showEvent", "drawCal", "drawVotes", "confirmedDate", "availability"]) {
  if (!html.includes(token)) throw new Error('Missing feature: '+token);
}
console.log('V2 syntax and feature smoke checks passed');
