import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const findings = [];
const blockedNames = [
 /(^|\/)\.env(?:\.[^/]+)?$/i,
 /(^|\/)(?:service[-_]?account|firebase[-_]?admin|admin[-_]?sdk|credentials|secrets)\.(?:json|ya?ml|txt)$/i,
 /\.(?:pem|p12|pfx|key|jks|keystore)$/i,
 /(^|\/)id_(?:rsa|ecdsa|ed25519)(?:\.pub)?$/i
];
const patterns = [
 ['Private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/],
 ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/],
 ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{45,}\b/],
 ['Google service account private key', /"private_key"\s*:\s*"-----BEGIN/],
 ['Slack token', /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/],
 ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/]
];
for (const path of tracked) {
 if (blockedNames.some(re => re.test(path))) findings.push(path + ': sensitive filename');
 const ext = extname(path).toLowerCase();
 if (!['.js','.mjs','.html','.json','.yml','.yaml','.md','.txt','.rules','.css','.webmanifest','.svg',''].includes(ext)) continue;
 const data = readFileSync(path);
 if (data.includes(0) || data.length > 2_000_000) continue;
 const body = data.toString('utf8');
 for (const [label, regex] of patterns) if (regex.test(body)) findings.push(path + ': ' + label);
}
// Public Firebase web apiKey is intentionally not treated as an admin credential.
// Client security depends on server-side Firestore rules and provider restrictions.
const rules=readFileSync('firestore.rules','utf8');
if (/match\s+\/members\/\{memberId\}[\s\S]{0,180}allow\s+read:\s*if\s+signedIn\(\)/.test(rules)) findings.push('firestore.rules: overbroad group member read');
if (!rules.includes('match /profiles/{profileId}')) findings.push('firestore.rules: missing avatar rules');
if (tracked.includes('v2/firestore.rules')) findings.push('v2/firestore.rules: obsolete duplicate rules must not be tracked');
if (findings.length) {
 console.error('Repository security check failed:\n'+findings.map(x=>' - '+x).join('\n'));
 process.exitCode=1;
} else console.log('Repository security checks passed ('+tracked.length+' tracked files).');
