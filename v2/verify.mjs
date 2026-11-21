import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const html = readFileSync('index.html','utf8');
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(match,'Missing app module');
const target=join(tmpdir(),'dispopotes-check.mjs');
writeFileSync(target, match[1]);
execFileSync(process.execPath,['--check',target],{stdio:'inherit'});
execFileSync(process.execPath,['--check','sw.js'],{stdio:'inherit'});
execFileSync(process.execPath,['--check','games.js'],{stdio:'inherit'});
const games=readFileSync('games.js','utf8');
for(const token of ['Shifumi Arena','Qui dans la bande ?','Dessine & Devine','openGames','drawCanvas','readyIds'])assert.ok(games.includes(token),'Missing mini-game feature: '+token);


for(const token of [
 'showGroup','showEvent','showLegacyEvent','showLegacyList','watchEvent',
 'drawCal','drawVotes','confirmedDate','availability',
 'Recréer cette sortie','installApp','join/'
]) assert.ok(html.includes(token),'Missing feature: '+token);

const manifest=JSON.parse(readFileSync('manifest.webmanifest','utf8'));
assert.equal(manifest.display,'standalone');
assert.ok(manifest.start_url.startsWith('./'));
for(const icon of manifest.icons){
 assert.ok(existsSync(icon.src.replace(/^\.\//,'')),'Missing icon: '+icon.src);
}
const rules=readFileSync('firestore.rules','utf8');
for(const collection of ['groups','members','events','participants','activities','votes']){
 assert.ok(rules.includes('/'+collection+'/{'),'Missing Firestore rules for '+collection);
}
assert.ok(rules.includes('request.auth.uid'),'Rules should scope actions by authenticated user');
console.log('V2 syntax, PWA asset and feature smoke checks passed');
